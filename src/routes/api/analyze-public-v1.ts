/**
 * Public analysis endpoint — primary profile + up to 2 optional competitors.
 *
 * Server-side boundary for the Apify integration. Validates input, scrapes
 * profiles (single batched call) and posts (per-handle, in parallel via
 * allSettled), normalizes everything into PublicAnalysisResponse, and never
 * exposes raw upstream payloads or the Apify token to the browser.
 *
 * Scope: 1 primary profile + up to 2 competitors, 12 recent posts each.
 * No caching, no persistence, no AI. Partial competitor failures degrade
 * gracefully — the primary profile is always prioritised.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  ApifyConfigError,
  ApifyUpstreamError,
  runActor,
} from "@/lib/analysis/apify-client";
import {
  buildCacheKey,
  isFresh,
  isWithinStaleWindow,
  lookupSnapshot,
  storeSnapshot,
  type SnapshotRow,
} from "@/lib/analysis/cache";
import {
  computeContentSummary,
  normalizeProfile,
} from "@/lib/analysis/normalize";
import {
  estimateApifyCost,
  hashRequestIp,
  parseUserAgentFamily,
} from "@/lib/analysis/cost";
import {
  recordAnalysisEvent,
  recordProviderCall,
  type AnalysisDataSource,
  type AnalysisOutcome,
} from "@/lib/analysis/events";
import { evaluateAlertsForEvent } from "@/lib/admin/alerts";
import {
  getAllowlist,
  isAllowed,
  isApifyEnabled,
  isTestingModeActive,
} from "@/lib/security/apify-allowlist";
import type {
  CompetitorAnalysis,
  PublicAnalysisErrorCode,
  PublicAnalysisProfile,
  PublicAnalysisResponse,
  PublicAnalysisSuccess,
} from "@/lib/analysis/types";
import { computeBenchmarkPositioning } from "@/lib/benchmark/engine";
import type { BenchmarkData } from "@/lib/benchmark/reference-data";
import { loadBenchmarkReferences } from "@/lib/benchmark/reference-data.server";
import type { BenchmarkPositioning } from "@/lib/benchmark/types";

// Unified Apify actor — returns profile details with `latestPosts[]` embedded
// in a single call per handle. Replaces the previous two-actor split.
const UNIFIED_ACTOR = "apify/instagram-scraper";
const POSTS_LIMIT = 12;
const MAX_COMPETITORS = 2;

const usernameSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, ""))
  .pipe(z.string().regex(/^[A-Za-z0-9._]{1,30}$/));

const PayloadSchema = z.object({
  instagram_username: usernameSchema,
  competitor_usernames: z
    .array(usernameSchema)
    .max(MAX_COMPETITORS)
    .optional()
    .default([]),
});

const ERROR_MESSAGES: Record<PublicAnalysisErrorCode, string> = {
  INVALID_USERNAME: "Username inválido. Verificar e tentar novamente.",
  PROFILE_NOT_FOUND:
    "Não foi possível encontrar este perfil. Verificar o username.",
  PROFILE_NOT_ALLOWED:
    "A análise automática está em validação. Para já, este teste está limitado aos perfis definidos.",
  PROVIDER_DISABLED:
    "A análise automática está temporariamente desativada. Tentar novamente mais tarde.",
  UPSTREAM_UNAVAILABLE:
    "Serviço de análise temporariamente indisponível. Tentar novamente dentro de instantes.",
  UPSTREAM_FAILED:
    "Não foi possível analisar este perfil neste momento. Tentar novamente dentro de instantes.",
  NETWORK_ERROR: "Falha de ligação. Tentar novamente.",
};

const HTTP_STATUS: Record<PublicAnalysisErrorCode, number> = {
  INVALID_USERNAME: 400,
  PROFILE_NOT_FOUND: 404,
  PROFILE_NOT_ALLOWED: 403,
  PROVIDER_DISABLED: 503,
  UPSTREAM_UNAVAILABLE: 503,
  UPSTREAM_FAILED: 502,
  NETWORK_ERROR: 502,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: PublicAnalysisResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function failure(code: PublicAnalysisErrorCode): Response {
  return jsonResponse(
    { success: false, error_code: code, message: ERROR_MESSAGES[code] },
    HTTP_STATUS[code],
  );
}

function competitorFailure(
  username: string,
  code: "PROFILE_NOT_FOUND" | "POSTS_UNAVAILABLE" | "UPSTREAM_FAILED",
): CompetitorAnalysis {
  const messages: Record<typeof code, string> = {
    PROFILE_NOT_FOUND: `Não foi possível encontrar @${username}.`,
    POSTS_UNAVAILABLE: `Métricas indisponíveis para @${username}.`,
    UPSTREAM_FAILED: `Não foi possível analisar @${username} neste momento.`,
  };
  return {
    success: false,
    username,
    error_code: code,
    message: messages[code],
  };
}

/**
 * Single unified call: returns the profile details with `latestPosts[]`
 * embedded. Replaces the previous two-step (profile then posts) flow.
 */
async function fetchProfileWithPosts(
  username: string,
): Promise<Record<string, unknown> | null> {
  const rows = await runActor<Record<string, unknown>>(
    UNIFIED_ACTOR,
    {
      directUrls: [`https://www.instagram.com/${username}/`],
      resultsType: "details",
      resultsLimit: POSTS_LIMIT,
      addParentData: false,
    },
    { timeoutMs: 60_000, apifyTimeoutSecs: 55 },
  );
  return rows[0] ?? null;
}

/**
 * Wraps `fetchProfileWithPosts` to emit one `provider_call_logs` row per
 * handle (success, http_error, timeout, config_error, network_error). Never
 * throws — returns the row, the originating error if any, and the new log id.
 */
async function fetchProfileWithPostsLogged(username: string): Promise<{
  row: Record<string, unknown> | null;
  error: unknown | null;
  providerCallLogId: string | null;
}> {
  const startedAt = Date.now();
  try {
    const row = await fetchProfileWithPosts(username);
    const posts = Array.isArray((row as { latestPosts?: unknown })?.latestPosts)
      ? ((row as { latestPosts: unknown[] }).latestPosts.length as number)
      : 0;
    const profilesReturned = row ? 1 : 0;
    const estimatedCostUsd = estimateApifyCost({
      profilesReturned,
      postsReturned: posts,
    });
    const providerCallLogId = await recordProviderCall({
      actor: UNIFIED_ACTOR,
      handle: username,
      status: "success",
      durationMs: Date.now() - startedAt,
      postsReturned: posts,
      estimatedCostUsd,
      httpStatus: 200,
    });
    return { row, error: null, providerCallLogId };
  } catch (err) {
    let status: "timeout" | "http_error" | "config_error" | "network_error" =
      "network_error";
    let httpStatus: number | null = null;
    if (err instanceof ApifyConfigError) {
      status = "config_error";
    } else if (err instanceof ApifyUpstreamError) {
      httpStatus = err.status;
      status = err.status === 504 ? "timeout" : "http_error";
    }
    const providerCallLogId = await recordProviderCall({
      actor: UNIFIED_ACTOR,
      handle: username,
      status,
      durationMs: Date.now() - startedAt,
      postsReturned: 0,
      estimatedCostUsd: 0,
      httpStatus,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return { row: null, error: err, providerCallLogId };
  }
}

export const Route = createFileRoute("/api/analyze-public-v1")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        const startedAt = Date.now();
        const userAgentFamily = parseUserAgentFamily(request);
        // IP hash kicked off in parallel — awaited only when we actually log.
        const ipHashPromise = hashRequestIp(request);
        const logEvent = (overrides: {
          handle: string;
          competitorHandles?: string[];
          cacheKey: string | null;
          dataSource: AnalysisDataSource;
          outcome: AnalysisOutcome;
          errorCode?: string | null;
          analysisSnapshotId?: string | null;
          providerCallLogId?: string | null;
          postsReturned?: number | null;
          profilesReturned?: number | null;
          estimatedCostUsd?: number | null;
          displayName?: string | null;
          followersLastSeen?: number | null;
        }) => {
          // Fire-and-forget: never block the user response on analytics.
          void ipHashPromise.then((requestIpHash) =>
            recordAnalysisEvent({
              ...overrides,
              durationMs: Date.now() - startedAt,
              requestIpHash,
              userAgentFamily,
            }).then(() =>
              // Evaluate cheap inline alerts after the event is persisted.
              // Skipped for the synthetic "(invalid)" handle to avoid noise.
              overrides.handle === "(invalid)"
                ? null
                : evaluateAlertsForEvent({
                    handle: overrides.handle,
                    requestIpHash,
                    dataSource: overrides.dataSource,
                    outcome: overrides.outcome,
                  }),
            ),
          );
        };

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          logEvent({
            handle: "(invalid)",
            cacheKey: null,
            dataSource: "none",
            outcome: "invalid_input",
            errorCode: "INVALID_USERNAME",
          });
          return failure("INVALID_USERNAME");
        }

        const parsed = PayloadSchema.safeParse(raw);
        if (!parsed.success) {
          logEvent({
            handle: "(invalid)",
            cacheKey: null,
            dataSource: "none",
            outcome: "invalid_input",
            errorCode: "INVALID_USERNAME",
          });
          return failure("INVALID_USERNAME");
        }
        const primary = parsed.data.instagram_username;

        // Dedup competitors: lowercase comparison, drop primary, drop dupes,
        // cap at MAX_COMPETITORS. Original casing preserved for display.
        const seen = new Set<string>([primary.toLowerCase()]);
        const competitors: string[] = [];
        for (const c of parsed.data.competitor_usernames ?? []) {
          const key = c.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          competitors.push(c);
          if (competitors.length >= MAX_COMPETITORS) break;
        }

        // Allowlist gate (smoke-test mode). When testing mode is active, the
        // primary handle MUST be on the allowlist or the request is rejected
        // before any cache lookup or provider call. Competitors that are not
        // allowlisted are silently dropped — the primary analysis still runs.
        const testingMode = isTestingModeActive();
        if (testingMode) {
          if (!isAllowed(primary)) {
            console.info(
              "[analyze-public-v1] blocked by allowlist",
              primary,
              "allowlist:",
              getAllowlist().join(","),
            );
            logEvent({
              handle: primary,
              competitorHandles: competitors,
              cacheKey: null,
              dataSource: "none",
              outcome: "blocked_allowlist",
              errorCode: "PROFILE_NOT_ALLOWED",
            });
            return failure("PROFILE_NOT_ALLOWED");
          }
          const allowedCompetitors = competitors.filter((c) => isAllowed(c));
          if (allowedCompetitors.length !== competitors.length) {
            console.info(
              "[analyze-public-v1] dropped non-allowlisted competitors",
              competitors.filter((c) => !isAllowed(c)).join(","),
            );
          }
          competitors.length = 0;
          for (const c of allowedCompetitors) competitors.push(c);
        }

        // Server-side escape hatch: ?refresh=1 bypasses cache and forces a
        // fresh provider call. While the smoke-test layer is active, this
        // requires `Authorization: Bearer ${INTERNAL_API_TOKEN}` so a public
        // visitor cannot drain Apify credits by appending the param.
        const url = new URL(request.url);
        const refreshRequested = url.searchParams.get("refresh") === "1";
        let forceRefresh = false;
        if (refreshRequested) {
          const internalToken = process.env.INTERNAL_API_TOKEN;
          const authHeader = request.headers.get("authorization") ?? "";
          const expected = internalToken ? `Bearer ${internalToken}` : null;
          if (expected && authHeader === expected) {
            forceRefresh = true;
          } else {
            console.warn(
              "[analyze-public-v1] ?refresh=1 ignored — missing or invalid internal token",
            );
          }
        }

        const cacheKey = buildCacheKey(primary, competitors);

        // Load benchmark references upfront (cached in-memory for 10 min) so
        // both cache-hit and fresh-path responses can embed a positioning
        // computed against the cloud-managed dataset.
        const benchmarkData = await loadBenchmarkReferences();

        // 1) Cache lookup. A non-expired snapshot short-circuits the provider.
        const existing = await lookupSnapshot(cacheKey);
        if (existing && !forceRefresh && isFresh(existing)) {
          const cachedPayload = existing.normalized_payload as unknown as {
            profile?: { display_name?: string; followers_count?: number };
          };
          logEvent({
            handle: primary,
            competitorHandles: competitors,
            cacheKey,
            dataSource: "cache",
            outcome: "success",
            analysisSnapshotId: existing.id,
            displayName: cachedPayload.profile?.display_name ?? null,
            followersLastSeen: cachedPayload.profile?.followers_count ?? null,
          });
          return jsonResponse(
            buildCachedResponse(existing, "cache", benchmarkData),
            200,
          );
        }

        // 2) Hard kill-switch. After the cache lookup so cached snapshots
        // remain serveable, before any provider call so disabled mode never
        // burns Apify credits. Stale fallback below is also bypassed because
        // we never reach the provider try/catch.
        if (!isApifyEnabled()) {
          if (existing && isWithinStaleWindow(existing)) {
            console.info(
              "[analyze-public-v1] APIFY_ENABLED!=true — serving stale snapshot",
              cacheKey,
            );
            const stalePayload = existing.normalized_payload as unknown as {
              profile?: { display_name?: string; followers_count?: number };
            };
            logEvent({
              handle: primary,
              competitorHandles: competitors,
              cacheKey,
              dataSource: "stale",
              outcome: "success",
              analysisSnapshotId: existing.id,
              displayName: stalePayload.profile?.display_name ?? null,
              followersLastSeen: stalePayload.profile?.followers_count ?? null,
            });
            return jsonResponse(
              buildCachedResponse(existing, "stale", benchmarkData),
              200,
            );
          }
          console.info(
            "[analyze-public-v1] APIFY_ENABLED!=true — refusing provider call",
            primary,
          );
          logEvent({
            handle: primary,
            competitorHandles: competitors,
            cacheKey,
            dataSource: "none",
            outcome: "provider_disabled",
            errorCode: "PROVIDER_DISABLED",
          });
          return failure("PROVIDER_DISABLED");
        }

        try {
          // 3) One unified call per handle, in parallel. Each call returns
          // the profile details with `latestPosts[]` embedded, so there is
          // no separate posts fetch and no cross-handle merge step. Per-call
          // results (status + duration + posts returned) are written to
          // `provider_call_logs` so the admin sees the real Apify ledger.
          const providerCallIds: string[] = [];
          const callPrimary = fetchProfileWithPostsLogged(primary).then(
            (r) => {
              if (r.providerCallLogId) providerCallIds.push(r.providerCallLogId);
              if (r.error) throw r.error;
              return r.row;
            },
          );
          const competitorRowsP = competitors.map((handle) =>
            fetchProfileWithPostsLogged(handle).then((r) => {
              if (r.providerCallLogId)
                providerCallIds.push(r.providerCallLogId);
              if (r.error) {
                console.error(
                  "[analyze-public-v1] competitor fetch failed",
                  handle,
                  r.error,
                );
                return r.error instanceof ApifyUpstreamError &&
                  r.error.status === 404
                  ? ({ __notFound: true } as const)
                  : ({ __failed: true } as const);
              }
              return r.row;
            }),
          );

          const primaryRow = await callPrimary;
          const primaryProfile = primaryRow ? normalizeProfile(primaryRow) : null;
          if (!primaryProfile) {
            logEvent({
              handle: primary,
              competitorHandles: competitors,
              cacheKey,
              dataSource: "fresh",
              outcome: "not_found",
              errorCode: "PROFILE_NOT_FOUND",
              providerCallLogId: providerCallIds[0] ?? null,
            });
            return failure("PROFILE_NOT_FOUND");
          }

          const primaryPosts = Array.isArray(
            (primaryRow as { latestPosts?: unknown }).latestPosts,
          )
            ? ((primaryRow as { latestPosts: unknown[] }).latestPosts as Record<
                string,
                unknown
              >[])
            : [];
          const primarySummary = computeContentSummary(
            primaryPosts,
            primaryProfile.followers_count,
          );

          const competitorRows = await Promise.all(competitorRowsP);
          const competitorResults: CompetitorAnalysis[] = competitorRows.map(
            (row, idx) => {
              const handle = competitors[idx];
              if (row && "__notFound" in row) {
                return competitorFailure(handle, "PROFILE_NOT_FOUND");
              }
              if (!row || "__failed" in row) {
                return competitorFailure(handle, "UPSTREAM_FAILED");
              }
              const profile = normalizeProfile(
                row as Record<string, unknown>,
              );
              if (!profile) {
                return competitorFailure(handle, "PROFILE_NOT_FOUND");
              }
              const posts = Array.isArray(
                (row as { latestPosts?: unknown }).latestPosts,
              )
                ? ((row as { latestPosts: unknown[] })
                    .latestPosts as Record<string, unknown>[])
                : [];
              const summary = computeContentSummary(
                posts,
                profile.followers_count,
              );
              return {
                success: true as const,
                profile,
                content_summary: summary,
              };
            },
          );


          // 4) Persist snapshot (best-effort). The status field is intentionally
          // excluded — it's recomputed per response based on freshness.
          const normalizedPayload = {
            profile: primaryProfile,
            content_summary: primarySummary,
            competitors: competitorResults,
          };

          const snapshotId = await storeSnapshot({
            cacheKey,
            instagramUsername: primaryProfile.username,
            competitorUsernames: competitors,
            normalizedPayload: normalizedPayload as unknown as Record<
              string,
              unknown
            >,
          });

          // Compute benchmark positioning server-side using the cloud
          // dataset, so the dashboard renders the same numbers regardless
          // of where it runs (browser, future PDF, future email).
          const benchmarkPositioning: BenchmarkPositioning =
            computeBenchmarkPositioning(
              {
                followers: primaryProfile.followers_count,
                engagement: primarySummary.average_engagement_rate,
                dominantFormat: primarySummary.dominant_format,
              },
              benchmarkData,
            );

          const response: PublicAnalysisSuccess = {
            success: true,
            ...normalizedPayload,
            ...(snapshotId ? { analysis_snapshot_id: snapshotId } : {}),
            status: {
              success: true,
              data_source: "fresh",
              analyzed_at: new Date().toISOString(),
            },
            benchmark_positioning: benchmarkPositioning,
          };

          // Aggregate counts + estimated cost across all successful handles
          // (primary + competitors). Failed competitor calls already emitted
          // their own provider_call_logs row with status=http_error/timeout.
          const successfulCompetitors = competitorResults.filter(
            (c): c is Extract<CompetitorAnalysis, { success: true }> =>
              c.success,
          );
          const totalProfiles = 1 + successfulCompetitors.length;
          const totalPosts =
            primaryPosts.length +
            successfulCompetitors.reduce(
              (sum, c) => sum + c.content_summary.posts_analyzed,
              0,
            );
          const estimatedCost = estimateApifyCost({
            profilesReturned: totalProfiles,
            postsReturned: totalPosts,
          });
          logEvent({
            handle: primary,
            competitorHandles: competitors,
            cacheKey,
            dataSource: "fresh",
            outcome: "success",
            analysisSnapshotId: snapshotId ?? null,
            providerCallLogId: providerCallIds[0] ?? null,
            postsReturned: totalPosts,
            profilesReturned: totalProfiles,
            estimatedCostUsd: estimatedCost,
            displayName: primaryProfile.display_name,
            followersLastSeen: primaryProfile.followers_count,
          });
          return jsonResponse(response, 200);
        } catch (err) {
          // 5) Stale-while-error: if provider failed but we have a recent
          // snapshot (≤ 7 days), serve it rather than breaking the page.
          if (existing && isWithinStaleWindow(existing)) {
            console.warn(
              "[analyze-public-v1] serving stale snapshot after provider failure",
              cacheKey,
            );
            const stalePayload = existing.normalized_payload as unknown as {
              profile?: { display_name?: string; followers_count?: number };
            };
            logEvent({
              handle: primary,
              competitorHandles: competitors,
              cacheKey,
              dataSource: "stale",
              outcome: "success",
              analysisSnapshotId: existing.id,
              displayName: stalePayload.profile?.display_name ?? null,
              followersLastSeen: stalePayload.profile?.followers_count ?? null,
            });
            return jsonResponse(
              buildCachedResponse(existing, "stale", benchmarkData),
              200,
            );
          }

          if (err instanceof ApifyConfigError) {
            console.error("[analyze-public-v1] missing config", err.message);
            logEvent({
              handle: primary,
              competitorHandles: competitors,
              cacheKey,
              dataSource: "fresh",
              outcome: "provider_error",
              errorCode: "UPSTREAM_UNAVAILABLE",
            });
            return failure("UPSTREAM_UNAVAILABLE");
          }
          if (err instanceof ApifyUpstreamError) {
            console.error(
              "[analyze-public-v1] upstream error",
              err.status,
              err.message,
            );
            if (err.status === 404) {
              logEvent({
                handle: primary,
                competitorHandles: competitors,
                cacheKey,
                dataSource: "fresh",
                outcome: "not_found",
                errorCode: "PROFILE_NOT_FOUND",
              });
              return failure("PROFILE_NOT_FOUND");
            }
            logEvent({
              handle: primary,
              competitorHandles: competitors,
              cacheKey,
              dataSource: "fresh",
              outcome: "provider_error",
              errorCode: "UPSTREAM_FAILED",
            });
            return failure("UPSTREAM_FAILED");
          }
          console.error("[analyze-public-v1] unexpected", err);
          logEvent({
            handle: primary,
            competitorHandles: competitors,
            cacheKey,
            dataSource: "fresh",
            outcome: "provider_error",
            errorCode: "UPSTREAM_FAILED",
          });
          return failure("UPSTREAM_FAILED");
        }
      },
    },
  },
});

/**
 * Reconstruct a PublicAnalysisSuccess from a stored snapshot.
 * The status block is always recomputed: data_source reflects freshness,
 * analyzed_at reflects when the underlying scrape happened (updated_at).
 */
function buildCachedResponse(
  snapshot: SnapshotRow,
  source: "cache" | "stale",
  benchmarkData: BenchmarkData,
): PublicAnalysisSuccess {
  const payload = snapshot.normalized_payload as unknown as {
    profile: PublicAnalysisProfile;
    content_summary: PublicAnalysisSuccess["content_summary"];
    competitors: CompetitorAnalysis[];
  };
  // Recompute positioning against the current cloud dataset, not the version
  // captured when the snapshot was stored — editorial tweaks should reflect
  // immediately on cached responses.
  const benchmark_positioning = computeBenchmarkPositioning(
    {
      followers: payload.profile.followers_count,
      engagement: payload.content_summary.average_engagement_rate,
      dominantFormat: payload.content_summary.dominant_format,
    },
    benchmarkData,
  );
  return {
    success: true,
    analysis_snapshot_id: snapshot.id,
    profile: payload.profile,
    content_summary: payload.content_summary,
    competitors: payload.competitors ?? [],
    status: {
      success: true,
      data_source: source,
      analyzed_at: snapshot.updated_at,
    },
    benchmark_positioning,
  };
}
