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

import { normalizeInstagramHandle } from "@/lib/instagram/normalize-handle";
import {
  ApifyConfigError,
  ApifyUpstreamError,
  runActorWithMetadata,
} from "@/lib/analysis/apify-client";
import {
  buildCacheKey,
  getFreshnessState,
  getSnapshotAgeHours,
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
  linkProviderCallsToEvent,
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
import {
  assertApifyDailyBudgetAvailable,
  BudgetExceededError,
} from "@/lib/security/apify-budget.server";
import {
  assertWithinPublicRateLimit,
  RateLimitError,
} from "@/lib/security/public-rate-limit.server";
import type {
  CompetitorAnalysis,
  PublicAnalysisFreshness,
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
  readCachedSummary,
  type PersistedMarketSignals,
} from "@/lib/market-signals/cache";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  shouldRunCommentScraper,
  isValidInstagramPostUrl,
} from "@/lib/analysis/comment-scraper.server";
import { getAnalysisExecutionMode } from "@/lib/admin/execution-mode.server";
import {
  ALL_ENRICHMENT_TYPES,
  ENRICHMENT_PRIORITY,
  buildInitialEnrichmentStatus,
} from "@/lib/enrichment/types";
import { prefetchThumbnailsAsBase64 } from "@/lib/analysis/thumbnail-cache.server";
import { setEnrichmentStatusAtomic } from "@/lib/analysis/cache";
import { PUBLIC_INSTAGRAM_POSTS_LIMIT } from "@/lib/analysis/constants";

// Unified Apify actor — returns profile details with `latestPosts[]` embedded
// in a single call per handle. Replaces the previous two-actor split.
const UNIFIED_ACTOR = "apify/instagram-scraper";
const MAX_COMPETITORS = 2;

const usernameSchema = z
  .string()
  .transform((v) => normalizeInstagramHandle(v))
  .pipe(z.string().regex(/^[a-z0-9._]{1,30}$/));

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
  PROFILE_PRIVATE:
    "Perfil privado. A análise pública só funciona com perfis abertos.",
  PROFILE_PERSONAL_NO_FEED:
    "O perfil parece estar público, mas não conseguimos obter publicações recentes através da nossa fonte de dados. Isto pode acontecer com alguns perfis pessoais ou contas sem feed acessível para análise. A ferramenta funciona melhor com perfis públicos Creator ou Empresa.",
  PROVIDER_DISABLED:
    "A análise automática ainda não está ativa. O sistema está preparado, mas a ligação ao fornecedor de dados está desligada.",
  BUDGET_EXCEEDED:
    "O limite diário de análises foi atingido. Voltar amanhã.",
  RATE_LIMITED:
    "Muitos pedidos recentes. Aguardar uns minutos antes de nova análise.",
  UPSTREAM_UNAVAILABLE:
    "Serviço de análise temporariamente indisponível. Tentar novamente dentro de instantes.",
  UPSTREAM_FAILED:
    "Não foi possível analisar este perfil neste momento. Tentar novamente dentro de instantes.",
  NETWORK_ERROR: "Falha de ligação. Tentar novamente.",
  CACHE_ONLY_NO_DATA:
    "Sem snapshot disponível em modo cache-only. Ative o modo Fresh para gerar dados novos.",
};

const HTTP_STATUS: Record<PublicAnalysisErrorCode, number> = {
  INVALID_USERNAME: 400,
  PROFILE_NOT_FOUND: 404,
  PROFILE_NOT_ALLOWED: 403,
  PROFILE_PRIVATE: 404,
  PROFILE_PERSONAL_NO_FEED: 422,
  PROVIDER_DISABLED: 503,
  BUDGET_EXCEEDED: 503,
  RATE_LIMITED: 429,
  UPSTREAM_UNAVAILABLE: 503,
  UPSTREAM_FAILED: 502,
  NETWORK_ERROR: 502,
  CACHE_ONLY_NO_DATA: 503,
};

/**
 * Fields safe to echo back to public callers. Any other key passed via
 * `extra` to `failure()` is silently dropped to avoid leaking raw provider
 * payloads (Apify error messages, internal IDs, JSON paths).
 */
const PUBLIC_ERROR_EXTRA_KEYS = new Set<string>([
  "retry_after_seconds",
]);

export function sanitizeExtra(
  extra: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!extra) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(extra)) {
    if (PUBLIC_ERROR_EXTRA_KEYS.has(k)) out[k] = extra[k];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

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

function failure(code: PublicAnalysisErrorCode, extra?: Record<string, unknown>): Response {
  const safeExtra = sanitizeExtra(extra);
  return jsonResponse(
    { success: false, error_code: code, message: ERROR_MESSAGES[code], ...(safeExtra ?? {}) } as PublicAnalysisResponse,
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
      // `resultsLimit` controls the size of `latestPosts[]` inside the
      // single profile row returned by the actor. It is NOT the number of
      // profiles per run (see `maxItems` below).
      resultsLimit: PUBLIC_INSTAGRAM_POSTS_LIMIT,
      addParentData: false,
    },
    {
      timeoutMs: 60_000,
      apifyTimeoutSecs: 55,
      // Cost guards for the smoke-test phase.
      //
      // Apify input contract (do not confuse the two limits):
      //   - `directUrls`: 1 URL  → 1 Instagram profile per run.
      //   - `maxItems: 1`        → at most 1 profile ROW returned per run.
      //   - `resultsLimit: 12`   → up to 12 POSTS inside that profile's
      //                            `latestPosts[]` array.
      // This call therefore returns ONE profile with UP TO 12 recent
      // posts — never 12 profiles. `maxTotalChargeUsd` is a hard USD cap
      // per call as a final safety net.
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
        const providerCallsStartedAt = new Date();
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
        }): Promise<string | null> => {
          try {
            const requestIpHash = await ipHashPromise;
            const eventId = await recordAnalysisEvent({
              ...overrides,
              durationMs: Date.now() - startedAt,
              requestIpHash,
              userAgentFamily,
            });
            // Link all provider calls created during this analysis
            if (eventId && overrides.dataSource === "fresh") {
              await linkProviderCallsToEvent(
                overrides.handle,
                providerCallsStartedAt,
                eventId,
              );
            }
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
            return eventId;
          } catch (err) {
            // Logging must never crash the public response.
            console.error("[analyze-public-v1] logEvent failed", err);
            return null;
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

        // 1) Cache lookup. A non-expired snapshot short-circuits everything.
        const existing = await lookupSnapshot(cacheKey);
        if (existing && !forceRefresh && isFresh(existing)) {
          const cachedPayload = existing.normalized_payload as unknown as {
            profile?: { display_name?: string; followers_count?: number };
          };
          const cachedFreshness = getFreshnessState(existing);
          console.info(
            "[analyze-public-v1] cache_hit_recent",
            JSON.stringify({
              handle: primary,
              age_hours: getSnapshotAgeHours(existing),
              state: cachedFreshness,
              refresh_available: cachedFreshness === "fresh_12_to_24h",
            }),
          );
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

        // 1b) Execution mode guard. In cache_only mode, short-circuit before
        // any allowlist check, provider call, or provider-related logging.
        // This guarantees cache_only never creates provider_call_logs or
        // analysis_events with allowlist/provider outcomes.
        // When forceRefresh is true (authenticated via INTERNAL_API_TOKEN),
        // skip the mode guard entirely — the admin action is already gated
        // by token verification, so the global mode stays cache_only and
        // public users are never exposed to fresh provider calls.
        if (!forceRefresh) {
          const executionMode = await getAnalysisExecutionMode();
          if (executionMode === "cache_only") {
            // Serve stale snapshot if available
            if (existing && isWithinStaleWindow(existing)) {
              console.info(
                "[analyze-public-v1] cache_only mode — serving existing snapshot",
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
                outcome: "blocked_cache_only",
                analysisSnapshotId: existing.id,
                estimatedCostUsd: 0,
                displayName: stalePayload.profile?.display_name ?? null,
                followersLastSeen: stalePayload.profile?.followers_count ?? null,
              });
              return jsonResponse(
                buildCachedResponse(existing, "stale", benchmarkData),
                200,
              );
            }

            // No snapshot at all — inform the user
            console.info(
              "[analyze-public-v1] cache_only mode — no snapshot available",
              primary,
            );
            await logEvent({
              handle: primary,
              competitorHandles: competitors,
              cacheKey,
              dataSource: "none",
              outcome: "blocked_cache_only",
              errorCode: "CACHE_ONLY_NO_DATA",
              estimatedCostUsd: 0,
            });
            return failure("CACHE_ONLY_NO_DATA");
          }
        }

        // 2) Allowlist gate (smoke-test mode). Only reached in fresh mode.
        // When testing mode is active, the primary handle MUST be on the
        // allowlist or the request is rejected before any provider call.
        // Competitors not on the allowlist are silently dropped.
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
              cacheKey,
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

        // 2b) Negative-cache short-circuit. If this handle was classified as
        // PROFILE_PERSONAL_NO_FEED or PROFILE_PRIVATE within the past 24h,
        // do NOT burn another Apify call — replay the same error so retries
        // are cheap and the user-facing message stays consistent. This is a
        // direct response to a real incident where one handle triggered 6
        // back-to-back Apify runs in ~3h. `analysis_events` is the source of
        // truth (no extra table needed).
        if (!forceRefresh) {
          try {
            const { data: recentNegative } = await supabaseAdmin
              .from("analysis_events")
              .select("error_code")
              .eq("handle", primary)
              .eq("network", "instagram")
              .in("error_code", [
                "PROFILE_PERSONAL_NO_FEED",
                "PROFILE_PRIVATE",
              ])
              .gte(
                "created_at",
                new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              )
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const cachedCode = recentNegative?.error_code as
              | "PROFILE_PERSONAL_NO_FEED"
              | "PROFILE_PRIVATE"
              | undefined;
            if (cachedCode) {
              console.info(
                "[analyze-public-v1] negative-cache hit — skipping Apify",
                primary,
                cachedCode,
              );
              await logEvent({
                handle: primary,
                competitorHandles: competitors,
                cacheKey,
                dataSource: "cache",
                outcome: "not_found",
                errorCode: cachedCode,
                estimatedCostUsd: 0,
              });
              return failure(cachedCode);
            }
          } catch (err) {
            // Negative cache is an optimization — never block the request.
            console.warn(
              "[analyze-public-v1] negative-cache lookup failed",
              err,
            );
          }
        }

        // 3) Hard kill-switch. After the cache lookup so cached snapshots
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

        // 3.1) Hard daily budget gate. Apify spend across `provider_call_logs`
        // for the trailing UTC day; if at or above `APIFY_HARD_CAP_USD`,
        // refuse fresh calls and serve stale when possible.
        try {
          await assertApifyDailyBudgetAvailable();
        } catch (err) {
          if (err instanceof BudgetExceededError) {
            console.warn(
              "[analyze-public-v1] BUDGET_EXCEEDED",
              `spent=${err.spentUsd.toFixed(2)}`,
              `cap=${err.capUsd}`,
              primary,
            );
            if (existing && isWithinStaleWindow(existing)) {
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
            await logEvent({
              handle: primary,
              competitorHandles: competitors,
              cacheKey,
              dataSource: "none",
              outcome: "blocked_allowlist",
              errorCode: "BUDGET_EXCEEDED",
            });
            return failure("BUDGET_EXCEEDED");
          }
          throw err;
        }

        // 3.2) Per-IP / per-handle rate limit (24h). Counts only past
        // FRESH+success events — cache and stale paths are not gated.
        try {
          const ipHash = await ipHashPromise;
          await assertWithinPublicRateLimit({
            ipHash,
            handle: primary,
            network: "instagram",
          });
        } catch (err) {
          if (err instanceof RateLimitError) {
            console.warn(
              "[analyze-public-v1] RATE_LIMITED",
              `scope=${err.scope}`,
              `count=${err.count}`,
              `limit=${err.limit}`,
              primary,
            );
            await logEvent({
              handle: primary,
              competitorHandles: competitors,
              cacheKey,
              dataSource: "none",
              outcome: "blocked_allowlist",
              errorCode: `RATE_LIMITED_${err.scope.toUpperCase()}`,
            });
            return failure("RATE_LIMITED");
          }
          throw err;
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

          // Classify the empty-feed case. Apify returns the profile shell but
          // distinguishing between three real-world scenarios matters for UX:
          //
          //   1) Truly private account            → PROFILE_PRIVATE
          //   2) Public PERSONAL (non-business)   → PROFILE_PERSONAL_NO_FEED
          //      The `apify/instagram-scraper` actor reliably reads the public
          //      feed of Creator/Business accounts but returns 0 posts for
          //      personal accounts even when they are technically public,
          //      because the underlying public endpoint is gated to
          //      professional profiles. Showing "private" here is wrong and
          //      frustrates users — see brunoremribeiro (May 2026).
          //   3) Empty / brand-new public account → PROFILE_PRIVATE (fallback)
          const rawPrimary = primaryRow as Record<string, unknown>;
          const primaryPosts = Array.isArray(
            (primaryRow as { latestPosts?: unknown }).latestPosts,
          )
            ? ((primaryRow as { latestPosts: unknown[] }).latestPosts as Record<
                string,
                unknown
              >[])
            : [];
          const isPrivateFlag =
            rawPrimary?.is_private === true || rawPrimary?.private === true;
          const profilePostsCount = primaryProfile.posts_count ?? 0;
          const isProfessional = primaryProfile.is_business;

          if (primaryPosts.length === 0) {
            // Personal-account heuristic: profile claims posts in its public
            // shell (`postsCount > 0`) but the scraper returned none, AND the
            // account is not flagged as business/creator → almost certainly a
            // personal account whose feed the public endpoint cannot enumerate.
            const looksPersonalNoFeed =
              !isPrivateFlag && !isProfessional && profilePostsCount > 0;

            const errorCode: "PROFILE_PERSONAL_NO_FEED" | "PROFILE_PRIVATE" =
              looksPersonalNoFeed ? "PROFILE_PERSONAL_NO_FEED" : "PROFILE_PRIVATE";

            await logEvent({
              handle: primary,
              competitorHandles: competitors,
              cacheKey,
              dataSource: "fresh",
              outcome: "not_found",
              errorCode,
              providerCallLogId: providerCallIds[0] ?? null,
            });
            return failure(errorCode);
          }
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
          // Reuse cached summary from previous snapshot if still valid.
          // Fresh DataForSEO calls are now handled asynchronously via
          // enrichment_jobs to avoid Worker timeout.
          let marketSignalsFree: PersistedMarketSignals | null = null;
          if (existing) {
            const cached = readCachedSummary(existing.normalized_payload, "free");
            if (cached) marketSignalsFree = cached;
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

            // ─── Prefetch thumbnails as base64 (for async visual_cover) ───
            const thumbUrls = (primaryEnriched.posts ?? [])
              .map((p) => (p as any).thumbnail_url as string | undefined)
              .filter((u): u is string => typeof u === "string" && u.length > 0)
              .slice(0, 12);
            const thumbnailBase64Map = await prefetchThumbnailsAsBase64(thumbUrls);

          // ─── Resilient persistence (Step 1: BASE snapshot) ────────────
          // Persist the Apify + DataForSEO result BEFORE calling OpenAI.
          // If the Worker is killed by an invoker timeout while OpenAI is
          // running, the report still exists and remains usable — just
          // without the AI insights layer. The OpenAI call below upserts
          // a second time on the same cache_key when it succeeds.
          const baseNormalizedPayload = {
            // R4-A.2: schema versioning. v2 marks payloads that include the
            // R4-A enriched per-post fields (video_duration, coauthors,
            // tagged_users, location_name, music_title, product_type,
            // caption_length, is_pinned). Older snapshots have no version
            // and consumers must treat absence as v1 (legacy).
            schema_version: 2 as const,
            profile: primaryProfile,
            content_summary: primarySummary,
            competitors: competitorResults,
            posts: primaryEnriched.posts,
            format_stats: primaryEnriched.format_stats,
            ...(marketSignalsFree
              ? { market_signals_free: marketSignalsFree }
              : {}),
            enrichment_status: buildInitialEnrichmentStatus(),
            ...(Object.keys(thumbnailBase64Map).length > 0
              ? { _thumbnail_base64: thumbnailBase64Map }
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
          const analysisEventId = await logEvent({
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
          // ─── Async enrichment jobs ────────────────────────────────────
          // Create enrichment_jobs for all enrichment types. These run
          // asynchronously in a separate Worker via /api/public/enrich-snapshot
          // so the main request completes within the Worker timeout budget.
          const normalizedPayload: Record<string, unknown> =
            baseNormalizedPayload as unknown as Record<string, unknown>;

          if (snapshotId) {
            try {
              const enrichmentRows = ALL_ENRICHMENT_TYPES.map((type) => ({
                snapshot_id: snapshotId,
                analysis_event_id: analysisEventId ?? null,
                handle: primary,
                enrichment_type: type,
                status: "pending" as const,
                priority: ENRICHMENT_PRIORITY[type],
              }));

              const { error: insertErr } = await supabaseAdmin
                .from("enrichment_jobs")
                .insert(enrichmentRows as never);

              if (insertErr) {
                console.error("[analyze-public-v1] failed to create enrichment_jobs", insertErr.message);
              } else {
                console.info("[analyze-public-v1] created", enrichmentRows.length, "enrichment_jobs for snapshot", snapshotId);
              }

              // Fire-and-forget: trigger the async enrichment endpoint
              const internalToken = process.env.INTERNAL_API_TOKEN;
              if (internalToken) {
                const origin = new URL(request.url).origin;
                fetch(`${origin}/api/public/enrich-snapshot`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${internalToken}`,
                  },
                  body: JSON.stringify({ snapshot_id: snapshotId }),
                }).catch((triggerErr) => {
                  console.warn("[analyze-public-v1] enrich-snapshot trigger failed (job table ensures delivery)", triggerErr);
                });
              }
            } catch (err) {
              console.error("[analyze-public-v1] enrichment job creation failed", err);
            }

            // ─── Comment Intelligence (async, kept separate) ──────────────
            const commentScraperEnabled =
              (process.env.COMMENT_SCRAPER_ENABLED ?? "false").toLowerCase() === "true";
            const commentScraperInternalTest =
              (process.env.COMMENT_SCRAPER_INTERNAL_TEST ?? "false").toLowerCase() === "true";
            const runComments = shouldRunCommentScraper({
              featureEnabled: commentScraperEnabled,
              isInternalTest: commentScraperInternalTest,
            });

            if (runComments) {
              const postsWithUrl = primaryEnriched.posts
                .filter((p) => !!p.permalink)
                .sort((a, b) => {
                  const ca = a.comments ?? 0;
                  const cb = b.comments ?? 0;
                  if (cb !== ca) return cb - ca;
                  if (b.engagement_pct !== a.engagement_pct) return b.engagement_pct - a.engagement_pct;
                  return (b.taken_at_iso ?? "").localeCompare(a.taken_at_iso ?? "");
                });
              const postUrls = postsWithUrl
                .slice(0, 12)
                .map((p) => p.permalink!)
                .filter((u) => isValidInstagramPostUrl(u));

              if (postUrls.length > 0) {
                try {
                  const { data: jobRow, error: jobErr } = await supabaseAdmin
                    .from("comment_enrichment_jobs")
                    .insert({
                      snapshot_id: snapshotId,
                      analysis_event_id: analysisEventId ?? null,
                      handle: primary,
                      post_urls: postUrls,
                      status: "pending",
                    } as never)
                    .select("id")
                    .single();
                  if (jobErr) {
                    console.error("[analyze-public-v1] failed to create comment enrichment job", jobErr.message);
                    if (snapshotId) await setEnrichmentStatusAtomic(snapshotId, "comments", "error");
                  } else {
                    const commentToken = process.env.INTERNAL_API_TOKEN;
                    if (commentToken) {
                      const origin = new URL(request.url).origin;
                      fetch(`${origin}/api/public/enrich-comments`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${commentToken}`,
                        },
                        body: JSON.stringify({ job_id: jobRow.id }),
                      }).catch(() => {});
                    }
                  }
                } catch (err) {
                  console.error("[analyze-public-v1] comment enrichment job creation failed", err);
                  if (snapshotId) await setEnrichmentStatusAtomic(snapshotId, "comments", "error");
                }
              } else {
                // No valid post URLs for comments
                if (snapshotId) await setEnrichmentStatusAtomic(snapshotId, "comments", "skipped");
              }
            } else {
              // Comment scraper disabled
              if (snapshotId) await setEnrichmentStatusAtomic(snapshotId, "comments", "disabled");
            }

          } // end try-block inner scope

          // Reuse the positioning already computed above for the AI
          // context — single source of truth, no duplicate dataset reads.
          const benchmarkPositioning: BenchmarkPositioning = benchmarkPositioningEarly;

          const response: PublicAnalysisSuccess = {
            success: true,
            ...(normalizedPayload as unknown as Omit<
              PublicAnalysisSuccess,
              "success" | "analysis_snapshot_id" | "status" | "benchmark_positioning"
            >),
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
              err.code,
              err.runId ?? null,
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
    enrichment_status?: unknown;
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
    ...(payload.enrichment_status &&
    typeof payload.enrichment_status === "object"
      ? { enrichment_status: payload.enrichment_status }
      : {}),
    status: {
      success: true,
      data_source: source,
      analyzed_at: snapshot.updated_at,
    },
    benchmark_positioning,
    freshness: deriveFreshnessFromSnapshot(snapshot, source),
  };
}

/**
 * Deriva o bloco `freshness` para uma resposta servida da cache (ou
 * stale-fallback). Fresh-just-scraped usa `deriveFreshnessJustNow`.
 */
function deriveFreshnessFromSnapshot(
  snapshot: SnapshotRow,
  source: "cache" | "stale",
): PublicAnalysisFreshness {
  const state = getFreshnessState(snapshot);
  const isFallback = source === "stale";
  // Stale = provider failed após snapshot já estar expired → state="expired".
  // Reportamos como "fallback_stale" no payload para a UI mostrar aviso.
  const reportedState: PublicAnalysisFreshness["state"] = isFallback
    ? "fallback_stale"
    : state === "expired"
      ? "fresh_12_to_24h" // defensivo: cache servida nunca devia estar expirada
      : state;
  return {
    state: reportedState,
    snapshot_created_at: snapshot.created_at,
    snapshot_age_hours: getSnapshotAgeHours(snapshot),
    refresh_available: !isFallback && state === "fresh_12_to_24h",
    // Sem tabela de créditos ainda — ver §6 do plano de cache 24h.
    refresh_requires_credit: false,
    is_fallback: isFallback,
  };
}

/** Bloco de frescura para resposta acabada de scrape (estado "just now"). */
function deriveFreshnessJustNow(): PublicAnalysisFreshness {
  const nowIso = new Date().toISOString();
  return {
    state: "fresh_just_now",
    snapshot_created_at: nowIso,
    snapshot_age_hours: 0,
    refresh_available: false,
    refresh_requires_credit: false,
    is_fallback: false,
  };
}
