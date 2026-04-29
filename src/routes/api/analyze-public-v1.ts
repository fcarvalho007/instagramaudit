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
  runActorWithMetadata,
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
  enrichPosts,
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
import {
  generateInsights,
  generateInsightsV2,
} from "@/lib/insights/openai-insights.server";
import type {
  AiInsightsV1,
  AiInsightsV2,
  InsightsContext,
} from "@/lib/insights/types";
import { isOpenAiAllowed } from "@/lib/security/openai-allowlist";
import {
  isAllowed as isDfsAllowed,
  isDataForSeoEnabled,
} from "@/lib/security/dataforseo-allowlist";
import { buildMarketSignals } from "@/lib/dataforseo/market-signals";
import {
  buildPersistedSummary,
  decideCacheTtlSeconds,
  readCachedSummary,
  type PersistedMarketSignals,
} from "@/lib/market-signals/cache";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import type { GoogleTrendsResult } from "@/lib/dataforseo/endpoints/google-trends";

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
    "A análise automática ainda não está ativa. O sistema está preparado, mas a ligação ao fornecedor de dados está desligada.",
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
 * Derive the compact `market_signals` summary the OpenAI prompt expects
 * from the persisted DataForSEO Trends envelope. Pure: no IO. When the
 * envelope is null or non-usable, returns the disabled shape so the
 * model is instructed to ignore the market-signals axis entirely.
 */
function summarizeMarketSignalsForInsights(
  ms: PersistedMarketSignals | null,
): InsightsContext["market_signals"] {
  if (!ms) return { has_free: false, has_paid: false };
  const usable = ms.status === "ready" || ms.status === "partial";
  if (!usable) return { has_free: false, has_paid: false };

  const usableRaw = ms.trends_usable_keywords ?? [];
  const dropped = (ms.trends_dropped_keywords ?? []).slice(0, 5);

  // Compute the per-keyword mean across the Trends series. Anything with
  // mean > 0 is considered "usable demand"; the rest is exposed as
  // `zero_signal_keywords` so the prompt can frame it as absence of demand
  // instead of opportunity.
  const trends = ms.trends as GoogleTrendsResult | null;
  let strongest: string | null = null;
  let strongestScore: number | null = null;
  let direction: "up" | "flat" | "down" | null = null;
  let trendDeltaPct: number | null = null;

  // Default fallback when Trends graph is missing: keep the raw usable
  // list as `top_keywords` so we still have something to send. We will
  // overwrite this once we can compute means.
  let topKeywords: string[] = usableRaw.slice(0, 5);
  let zeroSignal: string[] = [];

  const graph = trends?.items?.find(
    (it) => Array.isArray(it.keywords) && Array.isArray(it.data),
  );
  if (graph?.keywords && graph.data) {
    const kws = graph.keywords;
    const sums = new Array<number>(kws.length).fill(0);
    const counts = new Array<number>(kws.length).fill(0);
    for (const row of graph.data) {
      const values = Array.isArray(row.values) ? row.values : [];
      for (let i = 0; i < kws.length; i += 1) {
        const v = values[i];
        if (typeof v === "number" && Number.isFinite(v)) {
          sums[i] += v;
          counts[i] += 1;
        }
      }
    }
    // Build a {keyword, mean} table restricted to keywords originally
    // present in the usable list.
    const usableSet = new Set(usableRaw);
    const table: Array<{ keyword: string; mean: number }> = [];
    for (let i = 0; i < kws.length; i += 1) {
      if (!usableSet.has(kws[i])) continue;
      const mean = counts[i] > 0 ? sums[i] / counts[i] : 0;
      table.push({ keyword: kws[i], mean });
    }
    // Strong = mean > 0, ordered desc by mean (cap 5).
    const strong = table
      .filter((t) => t.mean > 0)
      .sort((a, b) => b.mean - a.mean);
    topKeywords = strong.slice(0, 5).map((t) => t.keyword);
    zeroSignal = table
      .filter((t) => t.mean === 0)
      .slice(0, 5)
      .map((t) => t.keyword);

    const bestIdx =
      strong.length > 0 ? kws.indexOf(strong[0].keyword) : -1;
    if (bestIdx >= 0) {
      strongest = kws[bestIdx];
      strongestScore = Math.round(strong[0].mean);
      // Trend direction: compare mean of first quartile vs last quartile of
      // non-null values for the strongest keyword.
      const series: number[] = [];
      for (const row of graph.data) {
        const v = row.values?.[bestIdx];
        if (typeof v === "number" && Number.isFinite(v)) series.push(v);
      }
      if (series.length >= 8) {
        const window = Math.max(4, Math.floor(series.length / 4));
        const head = series.slice(0, window);
        const tail = series.slice(-window);
        const headMean = head.reduce((a, b) => a + b, 0) / head.length;
        const tailMean = tail.reduce((a, b) => a + b, 0) / tail.length;
        if (headMean > 0) {
          const delta = (tailMean - headMean) / headMean;
          trendDeltaPct = Math.round(delta * 100);
          if (delta > 0.05) direction = "up";
          else if (delta < -0.05) direction = "down";
          else direction = "flat";
        } else if (tailMean > 0) {
          direction = "up";
          trendDeltaPct = 100;
        } else {
          direction = "flat";
          trendDeltaPct = 0;
        }
      }
    }
  }

  // No measurable demand at all → disable the market-signals axis so the
  // model is instructed to ignore it entirely (avoids pseudo-insights).
  if (topKeywords.length === 0) {
    return { has_free: false, has_paid: false };
  }

  return {
    has_free: true,
    has_paid: false,
    top_keywords: topKeywords,
    strongest_keyword: strongest,
    strongest_score: strongestScore,
    trend_direction: direction,
    trend_delta_pct: trendDeltaPct,
    usable_keyword_count: topKeywords.length,
    zero_signal_keywords: zeroSignal,
    dropped_keywords: dropped,
  };
}

/**
 * Single unified call: returns the profile details with `latestPosts[]`
 * embedded. Replaces the previous two-step (profile then posts) flow.
 */
async function fetchProfileWithPosts(
  username: string,
): Promise<{
  row: Record<string, unknown> | null;
  runId: string | null;
  actualCostUsd: number | null;
}> {
  const result = await runActorWithMetadata<Record<string, unknown>>(
    UNIFIED_ACTOR,
    {
      directUrls: [`https://www.instagram.com/${username}/`],
      resultsType: "details",
      resultsLimit: POSTS_LIMIT,
      addParentData: false,
    },
    {
      timeoutMs: 60_000,
      apifyTimeoutSecs: 55,
      // Cost guards for the smoke-test phase. The unified actor returns one
      // profile row per `directUrls` entry, so maxItems=1 is the natural
      // ceiling. maxTotalChargeUsd=0.10 is a hard USD cap per call.
      maxItems: 1,
      maxTotalChargeUsd: 0.10,
    },
  );
  return {
    row: result.items[0] ?? null,
    runId: result.runId,
    actualCostUsd: result.actualCostUsd,
  };
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
    const { row, runId, actualCostUsd } = await fetchProfileWithPosts(username);
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
      actualCostUsd,
      apifyRunId: runId,
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
    // If the run was started but failed mid-flight, the thrown error carries
    // the partial runId / actualCostUsd so we still log the real Apify run.
    const partial = err as ApifyUpstreamError & {
      runId?: string;
      actualCostUsd?: number;
    };
    const providerCallLogId = await recordProviderCall({
      actor: UNIFIED_ACTOR,
      handle: username,
      status,
      durationMs: Date.now() - startedAt,
      postsReturned: 0,
      estimatedCostUsd: 0,
      actualCostUsd:
        typeof partial.actualCostUsd === "number"
          ? partial.actualCostUsd
          : null,
      apifyRunId: partial.runId ?? null,
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
        // Critical analytics path. We MUST await these writes before sending
        // the response — in the Cloudflare Worker runtime, fire-and-forget
        // promises can be cancelled when the Response is flushed, which would
        // silently drop provider_disabled / blocked_allowlist / cache hit /
        // fresh success / provider_error events. The Supabase RPC is a few
        // ms and any failure is swallowed locally so the public response is
        // never blocked by analytics issues.
        const logEvent = async (overrides: {
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
        }): Promise<void> => {
          try {
            const requestIpHash = await ipHashPromise;
            await recordAnalysisEvent({
              ...overrides,
              durationMs: Date.now() - startedAt,
              requestIpHash,
              userAgentFamily,
            });
            // Evaluate cheap inline alerts after the event is persisted.
            // Skipped for the synthetic "(invalid)" handle to avoid noise.
            if (overrides.handle !== "(invalid)") {
              await evaluateAlertsForEvent({
                handle: overrides.handle,
                requestIpHash,
                dataSource: overrides.dataSource,
                outcome: overrides.outcome,
              });
            }
          } catch (err) {
            // Logging must never crash the public response.
            console.error("[analyze-public-v1] logEvent failed", err);
          }
        };

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          await logEvent({
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
          await logEvent({
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
            await logEvent({
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
          await logEvent({
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
            await logEvent({
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
          await logEvent({
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
            await logEvent({
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
          // Step 1 of the Real Report Data Layer: also persist post-level
          // detail and per-format aggregates so the future
          // snapshotToReportData adapter can populate the visual report
          // without a second Apify round-trip. Backwards compatible — old
          // snapshots without these fields are still readable.
          const primaryEnriched = enrichPosts(
            primaryPosts,
            primaryProfile.followers_count,
          );

          // ─── Market signals (free DataForSEO Trends) ────────────────
          // Inline as part of the snapshot so the report, OpenAI insights
          // and PDF all read from the same persisted source of truth.
          // Triple-gated: cache → kill-switch → allowlist. NEVER throws —
          // failure here must not break the Instagram analysis.
          let marketSignalsFree: PersistedMarketSignals | null = null;

          // 1. Reuse cached summary from the previous snapshot if still
          //    valid. Avoids any DataForSEO call (and any new
          //    provider_call_logs row) when the same handle is re-analysed
          //    within TTL — for example via ?refresh=1.
          if (existing) {
            const cached = readCachedSummary(existing.normalized_payload, "free");
            if (cached) marketSignalsFree = cached;
          }

          // 2. Cache miss → attempt one orchestration if both gates pass.
          if (
            !marketSignalsFree &&
            isDataForSeoEnabled() &&
            isDfsAllowed(primaryProfile.username)
          ) {
            const dfsStartedAt = new Date();
            const tentativeSnapshot = {
              profile: primaryProfile,
              content_summary: primarySummary,
              competitors: competitorResults,
              posts: primaryEnriched.posts,
              format_stats: primaryEnriched.format_stats,
            } as unknown as SnapshotPayload;
            try {
              const result = await buildMarketSignals(tentativeSnapshot, {
                ownerHandle: primaryProfile.username,
                plan: "free",
                totalTimeoutMs: 20_000,
              });
              // Collect provider cost + log ids written during this call.
              let providerCostUsd = 0;
              let providerCallLogIds: string[] = [];
              try {
                const { data: logs } = await supabaseAdmin
                  .from("provider_call_logs")
                  .select("id, actual_cost_usd")
                  .eq("provider", "dataforseo")
                  .eq("handle", primaryProfile.username.toLowerCase())
                  .gte("created_at", dfsStartedAt.toISOString());
                if (Array.isArray(logs)) {
                  providerCallLogIds = logs.map((l) => l.id as string);
                  providerCostUsd = logs.reduce(
                    (sum, l) =>
                      sum +
                      (typeof l.actual_cost_usd === "number"
                        ? l.actual_cost_usd
                        : 0),
                    0,
                  );
                }
              } catch (err) {
                console.warn(
                  "[analyze-public-v1] failed to read dataforseo provider_call_logs",
                  err,
                );
              }
              const ttl = decideCacheTtlSeconds(result);
              if (ttl !== null) {
                marketSignalsFree = buildPersistedSummary({
                  result,
                  plan: "free",
                  ttlSeconds: ttl,
                  providerCostUsd,
                  providerCallLogIds,
                  now: dfsStartedAt,
                });
              }
            } catch (err) {
              // Defence in depth — buildMarketSignals already swallows.
              console.warn(
                "[analyze-public-v1] inline market signals threw",
                err,
              );
            }
          } else if (!isDataForSeoEnabled()) {
            console.info(
              "[analyze-public-v1] DataForSEO disabled — skipping market signals",
            );
          } else if (!marketSignalsFree) {
            console.info(
              "[analyze-public-v1] handle not on DataForSEO allowlist — skipping market signals",
              primaryProfile.username,
            );
          }

          // Compute benchmark positioning early so it can be embedded both
          // in the AI insights context (when we call OpenAI) and in the
          // public response below. Same dataset, single source of truth.
          const benchmarkPositioningEarly: BenchmarkPositioning =
            computeBenchmarkPositioning(
              {
                followers: primaryProfile.followers_count,
                engagement: primarySummary.average_engagement_rate,
                dominantFormat: primarySummary.dominant_format,
              },
              benchmarkData,
            );

          // ─── Resilient persistence (Step 1: BASE snapshot) ────────────
          // Persist the Apify + DataForSEO result BEFORE calling OpenAI.
          // If the Worker is killed by an invoker timeout while OpenAI is
          // running, the report still exists and remains usable — just
          // without the AI insights layer. The OpenAI call below upserts
          // a second time on the same cache_key when it succeeds.
          const baseNormalizedPayload = {
            profile: primaryProfile,
            content_summary: primarySummary,
            competitors: competitorResults,
            posts: primaryEnriched.posts,
            format_stats: primaryEnriched.format_stats,
            ...(marketSignalsFree
              ? { market_signals_free: marketSignalsFree }
              : {}),
          };

          const snapshotId = await storeSnapshot({
            cacheKey,
            instagramUsername: primaryProfile.username,
            competitorUsernames: competitors,
            normalizedPayload: baseNormalizedPayload as unknown as Record<
              string,
              unknown
            >,
          });
          console.info(
            "[analyze-public-v1] base snapshot persisted",
            snapshotId ?? "(null)",
            "ai_insights_v1=pending",
          );

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

          // Record the success event immediately. This guarantees that a
          // completed Apify+DataForSEO run is reflected in analysis_events
          // even if the Worker dies before OpenAI returns.
          await logEvent({
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

          // ─── OpenAI insights (gated, fresh-only, best-effort) ─────────
          // Triple-gated inside `generateInsights`: OPENAI_ENABLED kill
          // switch + testing-mode allowlist + OPENAI_API_KEY presence.
          // Runs AFTER the base snapshot is persisted, so any failure or
          // timeout here cannot prevent the report from existing.
          let aiInsights: AiInsightsV1 | null = null;
          if (isOpenAiAllowed(primaryProfile.username)) {
            try {
              const successfulCompetitorsForAi = competitorResults.filter(
                (c): c is Extract<CompetitorAnalysis, { success: true }> =>
                  c.success,
              );
              const competitorEngagements = successfulCompetitorsForAi
                .map((c) => c.content_summary.average_engagement_rate)
                .filter((n) => Number.isFinite(n) && n > 0);
              const medianEngagement =
                competitorEngagements.length > 0
                  ? (() => {
                      const sorted = [...competitorEngagements].sort(
                        (a, b) => a - b,
                      );
                      const mid = Math.floor(sorted.length / 2);
                      return sorted.length % 2 === 0
                        ? (sorted[mid - 1] + sorted[mid]) / 2
                        : sorted[mid];
                    })()
                  : null;
              const topPostsForAi = [...primaryEnriched.posts]
                .sort((a, b) => b.engagement_pct - a.engagement_pct)
                .slice(0, 3)
                .map((p) => ({
                  format: p.format,
                  likes: p.likes,
                  comments: p.comments,
                  engagement_pct: p.engagement_pct,
                  caption_excerpt: p.caption ?? "",
                }));
              const ctx: InsightsContext = {
                profile: primaryProfile,
                content_summary: primarySummary,
                top_posts: topPostsForAi,
                benchmark: benchmarkPositioningEarly,
                competitors_summary: {
                  count: successfulCompetitorsForAi.length,
                  median_engagement_pct: medianEngagement,
                },
                // Free market signals are now fetched inline above. Paid
                // tier remains out of scope for the public flow.
                market_signals: summarizeMarketSignalsForInsights(
                  marketSignalsFree,
                ),
              };
              const result = await generateInsights(ctx);
              if (result.ok && result.insights) {
                aiInsights = result.insights;
              } else if (result.reason && result.reason !== "DISABLED" && result.reason !== "NOT_ALLOWED") {
                console.warn(
                  "[analyze-public-v1] generateInsights soft-failed",
                  result.reason,
                  result.detail ?? "",
                );
              }
            } catch (err) {
              // Hard guarantee: AI insights never break the analysis.
              console.error("[analyze-public-v1] generateInsights threw", err);
            }
          }

          // ─── OpenAI insights v2 (R3): inline por secção, KB-aware ─────
          // Geração independente da v1 (cache por inputs_hash + kb_version
          // dentro de `generateInsightsV2`). Falha silenciosa: o report
          // continua a renderizar mesmo se a v2 não responder.
          let aiInsightsV2: AiInsightsV2 | null = null;
          if (isOpenAiAllowed(primaryProfile.username)) {
            try {
              const previousV2 =
                (existing?.normalized_payload as unknown as {
                  ai_insights_v2?: AiInsightsV2 | null;
                } | null)?.ai_insights_v2 ?? null;
              const successfulCompetitorsForAi = competitorResults.filter(
                (c): c is Extract<CompetitorAnalysis, { success: true }> =>
                  c.success,
              );
              const competitorEngagements = successfulCompetitorsForAi
                .map((c) => c.content_summary.average_engagement_rate)
                .filter((n) => Number.isFinite(n) && n > 0);
              const medianEngagementV2 =
                competitorEngagements.length > 0
                  ? (() => {
                      const sorted = [...competitorEngagements].sort(
                        (a, b) => a - b,
                      );
                      const mid = Math.floor(sorted.length / 2);
                      return sorted.length % 2 === 0
                        ? (sorted[mid - 1] + sorted[mid]) / 2
                        : sorted[mid];
                    })()
                  : null;
              const topPostsForV2 = [...primaryEnriched.posts]
                .sort((a, b) => b.engagement_pct - a.engagement_pct)
                .slice(0, 3)
                .map((p) => ({
                  format: p.format,
                  likes: p.likes,
                  comments: p.comments,
                  engagement_pct: p.engagement_pct,
                  caption_excerpt: p.caption ?? "",
                }));
              const ctxV2: InsightsContext = {
                profile: primaryProfile,
                content_summary: primarySummary,
                top_posts: topPostsForV2,
                benchmark: benchmarkPositioningEarly,
                competitors_summary: {
                  count: successfulCompetitorsForAi.length,
                  median_engagement_pct: medianEngagementV2,
                },
                market_signals: summarizeMarketSignalsForInsights(
                  marketSignalsFree,
                ),
              };
              const resultV2 = await generateInsightsV2(ctxV2, {
                previous: previousV2,
              });
              if (resultV2.ok && resultV2.insights) {
                aiInsightsV2 = resultV2.insights;
              } else if (
                resultV2.reason &&
                resultV2.reason !== "DISABLED" &&
                resultV2.reason !== "NOT_ALLOWED"
              ) {
                console.warn(
                  "[analyze-public-v1] generateInsightsV2 soft-failed",
                  resultV2.reason,
                  resultV2.detail ?? "",
                );
              }
            } catch (err) {
              console.error("[analyze-public-v1] generateInsightsV2 threw", err);
            }
          }

          // ─── Resilient persistence (Step 2: enrich snapshot) ──────────
          // Only re-write when we have AI insights to attach. The upsert
          // collapses to an UPDATE on the existing cache_key — Apify and
          // DataForSEO are NOT called again. If OpenAI failed/timed out,
          // the base snapshot from Step 1 is left intact.
          let normalizedPayload: Record<string, unknown> =
            baseNormalizedPayload as unknown as Record<string, unknown>;
          if (aiInsights) {
            normalizedPayload = {
              ...normalizedPayload,
              ai_insights_v1: aiInsights,
            };
          }
          if (aiInsightsV2) {
            normalizedPayload = {
              ...normalizedPayload,
              ai_insights_v2: aiInsightsV2,
            };
          }
          if (aiInsights || aiInsightsV2) {
            const enrichedSnapshotId = await storeSnapshot({
              cacheKey,
              instagramUsername: primaryProfile.username,
              competitorUsernames: competitors,
              normalizedPayload,
            });
            console.info(
              "[analyze-public-v1] snapshot enriched",
              {
                v1: !!aiInsights,
                v2: !!aiInsightsV2,
              },
              enrichedSnapshotId ?? snapshotId ?? "(null)",
            );
          } else {
            console.info(
              "[analyze-public-v1] snapshot kept without ai_insights (OpenAI unavailable or failed)",
            );
          }

          // Reuse the positioning already computed above for the AI
          // context — single source of truth, no duplicate dataset reads.
          const benchmarkPositioning: BenchmarkPositioning = benchmarkPositioningEarly;

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
            await logEvent({
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
            await logEvent({
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
              await logEvent({
                handle: primary,
                competitorHandles: competitors,
                cacheKey,
                dataSource: "fresh",
                outcome: "not_found",
                errorCode: "PROFILE_NOT_FOUND",
              });
              return failure("PROFILE_NOT_FOUND");
            }
            await logEvent({
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
          await logEvent({
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
  // Optional enriched fields (Step 1 of the Real Report Data Layer) are
  // only present on snapshots stored after the enrichment was deployed.
  // Older snapshots simply omit them and the response stays valid.
  const payload = snapshot.normalized_payload as unknown as {
    profile: PublicAnalysisProfile;
    content_summary: PublicAnalysisSuccess["content_summary"];
    competitors: CompetitorAnalysis[];
    posts?: unknown;
    format_stats?: unknown;
  };
  const enrichedPosts = Array.isArray(payload.posts)
    ? (payload.posts as PublicAnalysisSuccess["posts"])
    : undefined;
  const enrichedFormatStats =
    payload.format_stats &&
    typeof payload.format_stats === "object" &&
    !Array.isArray(payload.format_stats)
      ? (payload.format_stats as PublicAnalysisSuccess["format_stats"])
      : undefined;
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
    ...(enrichedPosts ? { posts: enrichedPosts } : {}),
    ...(enrichedFormatStats ? { format_stats: enrichedFormatStats } : {}),
    status: {
      success: true,
      data_source: source,
      analyzed_at: snapshot.updated_at,
    },
    benchmark_positioning,
  };
}
