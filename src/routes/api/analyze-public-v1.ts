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
  postTimestampMs,
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
  assertApifyMonthlyBudgetAvailable,
  isApifyMonthlySoftCapReached,
  BudgetExceededError,
  MonthlyBudgetExceededError,
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
import {
  confirmReservation,
  InsufficientCreditsError,
  releaseReservation,
  reserveCredit,
} from "@/lib/credits/credits.server";
import { readLeadIdFromRequest } from "@/lib/leads/lead-cookie.server";
import {
  leadOwnsReport,
  upsertLeadReport,
} from "@/lib/credits/lead-reports.server";
import { getAnalysisExecutionMode } from "@/lib/admin/execution-mode.server";
import {
  FREE_ENRICHMENT_TYPES,
  ENRICHMENT_PRIORITY,
  buildFreeEnrichmentStatus,
} from "@/lib/enrichment/types";
import { prefetchThumbnailsAsBase64 } from "@/lib/analysis/thumbnail-cache.server";
import { setEnrichmentStatusAtomic } from "@/lib/analysis/cache";
import {
  PUBLIC_WINDOW_CONFIGS,
  isPublicWindowKind,
  isWideWindow,
  type PublicWindowConfig,
  type PublicWindowKind,
} from "@/lib/analysis/window-configs";
import { PUBLIC_INSTAGRAM_POSTS_LIMIT } from "@/lib/analysis/constants";
import { hasEntitlement } from "@/lib/payments/entitlements.server";

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
  // PR 1: public window for the PRIMARY profile only. Defaults to
  // "baseline" so existing Free callers stay byte-compatible.
  // 60d / 365d are Lab-only and intentionally excluded from this surface.
  window: z
    .enum(["baseline", "30d", "90d"])
    .optional()
    .default("baseline"),
  /**
   * Pro-only opt-in to bypass a fresh cache hit and force a new provider
   * call for the same (handle, competitors, window) tuple. Ignored unless
   * the lead has `report_full_9` AND the window is not baseline. Consumes
   * 1 credit when it proceeds. Subject to all existing caps (Apify global,
   * 90d, per-lead/profile/window/day).
   */
  force_refresh: z.boolean().optional().default(false),
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
  PROVIDER_BILLING_BLOCKED:
    "A nossa fonte de dados do Instagram está temporariamente bloqueada por uma questão de faturação do lado do fornecedor. Não é um problema com o perfil nem com a tua conta — a equipa já foi notificada e a análise volta a funcionar assim que estiver regularizado.",
  BUDGET_EXCEEDED:
    "O limite diário de análises foi atingido. Voltar amanhã.",
  RATE_LIMITED:
    "Muitos pedidos recentes. Aguardar uns minutos antes de nova análise.",
  UPSTREAM_UNAVAILABLE:
    "O serviço de análise está temporariamente indisponível. Tentar novamente dentro de alguns minutos.",
  UPSTREAM_FAILED:
    "Falha técnica ao processar este perfil. Se voltar a acontecer, contactar hello@auditprofiles.com.",

  NETWORK_ERROR: "Falha de ligação. Tentar novamente.",
  CACHE_ONLY_NO_DATA:
    "Sem snapshot disponível em modo cache-only. Ative o modo Fresh para gerar dados novos.",
  ONBOARDING_REQUIRED:
    "Precisamos do teu nome e email para gerar o relatório.",
  INSUFFICIENT_CREDITS:
    "Já usaste os teus 2 relatórios gratuitos.",
  WINDOW_REQUIRES_PRO:
    "A análise por período (30d/90d) está disponível no plano Pro.",
  WINDOW_90D_DISABLED:
    "A análise de 90 dias está temporariamente indisponível. Tenta 30 dias.",
  WINDOW_90D_BUDGET_EXCEEDED:
    "A análise de 90 dias está temporariamente indisponível por segurança operacional. Tenta novamente mais tarde ou usa a janela de 30 dias.",
  PRO_WINDOW_BUDGET_EXCEEDED:
    "Análise temporariamente indisponível por segurança operacional. Tenta novamente mais tarde ou usa outra janela de análise.",
  COMPETITORS_REQUIRE_PRO:
    "A análise de concorrentes está disponível no plano Pro.",
};

const HTTP_STATUS: Record<PublicAnalysisErrorCode, number> = {
  INVALID_USERNAME: 400,
  PROFILE_NOT_FOUND: 404,
  PROFILE_NOT_ALLOWED: 403,
  PROFILE_PRIVATE: 404,
  PROFILE_PERSONAL_NO_FEED: 422,
  PROVIDER_DISABLED: 503,
  PROVIDER_BILLING_BLOCKED: 503,

  BUDGET_EXCEEDED: 503,
  RATE_LIMITED: 429,
  UPSTREAM_UNAVAILABLE: 503,
  UPSTREAM_FAILED: 502,
  NETWORK_ERROR: 502,
  CACHE_ONLY_NO_DATA: 503,
  ONBOARDING_REQUIRED: 402,
  INSUFFICIENT_CREDITS: 402,
  WINDOW_REQUIRES_PRO: 403,
  WINDOW_90D_DISABLED: 403,
  WINDOW_90D_BUDGET_EXCEEDED: 503,
  PRO_WINDOW_BUDGET_EXCEEDED: 503,
  COMPETITORS_REQUIRE_PRO: 403,
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
 * Fetch profile + posts for one handle.
 *
 * Baseline: ONE `details` run (profile row with up to 12 embedded posts).
 *
 * Wide windows (30d/90d): TWO runs, because the actor ignores
 * `onlyPostsNewerThan` in `details` mode and `details.latestPosts` is capped
 * at ~12 items regardless of `resultsLimit`:
 *   A) `details` → profile fields (followers, bio, verification, …)
 *   B) `posts`   → the real list of posts inside the window
 * The two datasets are recombined into a single row so every downstream
 * normalizer keeps working unchanged.
 */
async function fetchProfileWithPosts(
  username: string,
  cfg: PublicWindowConfig = PUBLIC_WINDOW_CONFIGS.baseline,
): Promise<{
  row: Record<string, unknown> | null;
  runId: string | null;
  actualCostUsd: number | null;
  /** Real dataset item count across every run made for this handle. */
  billedResults: number;
}> {
  const profileUrl = `https://www.instagram.com/${username}/`;
  const wide = cfg.costTier === "wide" && Boolean(cfg.onlyPostsNewerThan);

  // ---- Run A: profile details ------------------------------------------
  const detailsInput: Record<string, unknown> = {
    directUrls: [profileUrl],
    resultsType: "details",
    // For wide windows the embedded posts are discarded (run B supersedes
    // them), so keep this small. Baseline still needs the full sample.
    resultsLimit: wide ? PUBLIC_INSTAGRAM_POSTS_LIMIT : cfg.resultsLimit,
    addParentData: false,
  };
  const detailsResult = await runActorWithMetadata<Record<string, unknown>>(
    UNIFIED_ACTOR,
    detailsInput,
    {
      timeoutMs: wide ? 60_000 : cfg.timeoutMs,
      apifyTimeoutSecs: wide ? 55 : cfg.apifyTimeoutSecs,
      // `maxItems: 1` → one profile ROW. `resultsLimit` → posts inside that
      // row. `maxTotalChargeUsd` is the final per-call USD safety net.
      maxItems: 1,
      maxTotalChargeUsd: wide ? 0.05 : cfg.maxTotalChargeUsd,
    },
  );
  const row = detailsResult.items[0] ?? null;
  let billedResults = detailsResult.items.length;
  let actualCostUsd = detailsResult.actualCostUsd;

  if (!wide || !row) {
    return {
      row,
      runId: detailsResult.runId,
      actualCostUsd,
      billedResults,
    };
  }

  // ---- Run B: posts inside the window ----------------------------------
  // Runs sequentially (never in parallel) so a single analysis holds at most
  // one global Apify lease at a time.
  const postsResult = await runActorWithMetadata<Record<string, unknown>>(
    UNIFIED_ACTOR,
    {
      directUrls: [profileUrl],
      resultsType: "posts",
      resultsLimit: cfg.resultsLimit,
      onlyPostsNewerThan: cfg.onlyPostsNewerThan,
      addParentData: false,
    },
    {
      timeoutMs: cfg.timeoutMs,
      apifyTimeoutSecs: cfg.apifyTimeoutSecs,
      maxItems: cfg.resultsLimit,
      maxTotalChargeUsd: cfg.maxTotalChargeUsd,
    },
  );
  billedResults += postsResult.items.length;
  if (typeof postsResult.actualCostUsd === "number") {
    actualCostUsd = (actualCostUsd ?? 0) + postsResult.actualCostUsd;
  }
  // Replace the 12-post `details` sample with the real window dataset.
  // If run B returned nothing we keep the details sample rather than
  // pretending the profile has no activity.
  if (postsResult.items.length > 0) {
    row.latestPosts = postsResult.items;
  }

  return {
    row,
    runId: postsResult.runId ?? detailsResult.runId,
    actualCostUsd,
    billedResults,
  };
}

/**
 * Wraps `fetchProfileWithPosts` to emit one `provider_call_logs` row per
 * handle (success, http_error, timeout, config_error, network_error). Never
 * throws — returns the row, the originating error if any, and the new log id.
 */
async function fetchProfileWithPostsLogged(
  username: string,
  cfg: PublicWindowConfig = PUBLIC_WINDOW_CONFIGS.baseline,
): Promise<{
  row: Record<string, unknown> | null;
  error: unknown | null;
  providerCallLogId: string | null;
}> {
  const startedAt = Date.now();
  try {
    const { row, runId, actualCostUsd, billedResults } =
      await fetchProfileWithPosts(username, cfg);
    const posts = Array.isArray((row as { latestPosts?: unknown })?.latestPosts)
      ? ((row as { latestPosts: unknown[] }).latestPosts.length as number)
      : 0;
    const profilesReturned = row ? 1 : 0;
    const estimatedCostUsd = estimateApifyCost({
      profilesReturned,
      postsReturned: posts,
      // `details` mode bills ONE dataset item per run — the embedded
      // `latestPosts[]` are not billed separately.
      billedResults,
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
      sourceContext: "public_analysis",
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
      sourceContext: "public_analysis",
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
        // Updated once the request payload is parsed so every subsequent
        // logEvent call automatically tags the analysis_event with the
        // selected window. Pre-parse events (invalid_input) stay null.
        let currentAnalysisWindow:
          | "baseline"
          | "30d"
          | "90d"
          | null = null;
        // Tracks the most recent analysis_event id emitted by logEvent so
        // confirmReservation / releaseReservation can link the ledger row
        // to the event deterministically (no time-window joins).
        let lastEventId: string | null = null;
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
          analysisWindow?: "baseline" | "30d" | "90d" | null;
        }): Promise<string | null> => {
          try {
            const requestIpHash = await ipHashPromise;
            const eventId = await recordAnalysisEvent({
              ...overrides,
              analysisWindow:
                overrides.analysisWindow !== undefined
                  ? overrides.analysisWindow
                  : currentAnalysisWindow,
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
            if (eventId) lastEventId = eventId;
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
        const windowKind: PublicWindowKind = isPublicWindowKind(parsed.data.window)
          ? parsed.data.window
          : "baseline";
        currentAnalysisWindow = windowKind;
        const primaryWindowCfg = PUBLIC_WINDOW_CONFIGS[windowKind];

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
        // Tracks whether the fresh call was triggered by an explicit user
        // `force_refresh:true` (vs internal admin `?refresh=1`). Drives
        // `data_source = "fresh_forced"` so admin can tell the two apart.
        let userForcedRefresh = false;
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

        // Internal smoke-test bypass: a valid `Authorization: Bearer
        // $INTERNAL_API_TOKEN` short-circuits the lead/credit gating below.
        // This is the same gate `forceRefresh` already requires, so admin
        // tooling can hit the endpoint without burning lead credits.
        const internalToken = process.env.INTERNAL_API_TOKEN;
        const authHeader = request.headers.get("authorization") ?? "";
        const isInternalBypass =
          !!internalToken && authHeader === `Bearer ${internalToken}`;

        // Cache key includes the window suffix ONLY for wide windows. For
        // baseline this is byte-identical to the legacy key, so existing
        // Free snapshots remain valid and reachable.
        const cacheKey = buildCacheKey(primary, competitors, windowKind);

        // ── Credit gate (Fase 2) ───────────────────────────────────────
        // Política:
        //   • Sem cookie de lead → ONBOARDING_REQUIRED (PT-PT: "Para gerar a
        //     análise, começa por criar a tua conta gratuita.")
        //   • Saldo 0 → INSUFFICIENT_CREDITS (PT-PT: "Sem créditos
        //     disponíveis." / "Este pedido usa 1 crédito. Já não tens
        //     créditos gratuitos disponíveis.")
        //   • Cache <24h JÁ associado a este lead → 0 créditos.
        //   • Cache <24h novo para o lead, fresh, stale: reserva 1 crédito;
        //     confirma + associa em lead_reports só após snapshot utilizável;
        //     liberta a reserva em qualquer falha (provider_error,
        //     PROFILE_NOT_ALLOWED, PROFILE_PRIVATE, PROFILE_PERSONAL_NO_FEED,
        //     PROVIDER_DISABLED, CACHE_ONLY_NO_DATA, RATE_LIMITED,
        //     BUDGET_EXCEEDED, validação, exceções).
        //   • Bypass com Authorization: Bearer $INTERNAL_API_TOKEN (admin /
        //     /api/analyze/refresh / /api/admin/refresh-profile).
        // ── Nível 1 anónimo (staged product) ───────────────────────────
        // Quando PUBLIC_BASELINE_NO_EMAIL=true, a auditoria base (janela
        // baseline, sem concorrentes) corre sem lead/email. O gate de email
        // passa a proteger apenas o nível 2 (Comment Intelligence) e as
        // funcionalidades Pro (concorrentes / janelas 30d-90d).
        const anonymousBaselineEnabled =
          (process.env.PUBLIC_BASELINE_NO_EMAIL ?? "false").toLowerCase() === "true";
        const anonymousBaseline =
          anonymousBaselineEnabled &&
          !isInternalBypass &&
          competitors.length === 0 &&
          !isWideWindow(windowKind) &&
          readLeadIdFromRequest(request) === null;

        let leadId: string | null = null;
        let reservation: { reservationId: string } | null = null;
        let duplicateInFlight = false;
        let alreadyAssociated = false;
        // Lookup adiantado: necessário para decidir se vamos cobrar crédito
        // antes de reservar. Reutilizado mais à frente como `existing`.
        const existingEarly = await lookupSnapshot(cacheKey);
        const cacheFreshHit =
          !!existingEarly && !forceRefresh && isFresh(existingEarly);
        if (!isInternalBypass && !anonymousBaseline) {
          leadId = readLeadIdFromRequest(request);
          if (!leadId) {
            await logEvent({
              handle: primary,
              competitorHandles: competitors,
              cacheKey,
              dataSource: "none",
              outcome: "blocked_credits",
              errorCode: "ONBOARDING_REQUIRED",
              estimatedCostUsd: 0,
            });
            return failure("ONBOARDING_REQUIRED");
          }
          alreadyAssociated = await leadOwnsReport(leadId, cacheKey);
          // ── Pro gate for competitor analysis ────────────────────
          // Competitor enrichment can trigger extra Apify work, so it's
          // restricted to leads with the `report_full_9` entitlement.
          // Runs BEFORE reserveCredit / wide-window gate / provider so a
          // Free lead is never charged and no provider is hit.
          if (competitors.length > 0) {
            const isProForCompetitors = await hasEntitlement(
              leadId,
              "report_full_9",
            );
            if (!isProForCompetitors) {
              await logEvent({
                handle: primary,
                competitorHandles: competitors,
                cacheKey,
                dataSource: "none",
                outcome: "blocked_credits",
                errorCode: "COMPETITORS_REQUIRE_PRO",
                estimatedCostUsd: 0,
              });
              return failure("COMPETITORS_REQUIRE_PRO");
            }
          }
          // ── Pro gate for wide windows (30d/90d) ─────────────────
          // Wide windows require the `report_full_9` entitlement. We
          // check BEFORE reserving credit so a Free lead is never
          // charged for a window they cannot use.
          if (isWideWindow(windowKind)) {
            // 90d kill-switch — runs BEFORE entitlement check and BEFORE
            // reserveCredit so a blocked 90d call never writes credit_ledger.
            if (windowKind === "90d") {
              const { readAppConfigValue } = await import(
                "@/lib/config/app-config.server"
              );
              const flagRaw = await readAppConfigValue(
                "pro_window_90d_enabled",
                "true",
              );
              if (flagRaw !== "true") {
                await logEvent({
                  handle: primary,
                  competitorHandles: competitors,
                  cacheKey,
                  dataSource: "none",
                  outcome: "blocked_credits",
                  errorCode: "WINDOW_90D_DISABLED",
                  estimatedCostUsd: 0,
                });
                return failure("WINDOW_90D_DISABLED");
              }
            }
            const isPro = await hasEntitlement(leadId, "report_full_9");
            if (!isPro) {
              await logEvent({
                handle: primary,
                competitorHandles: competitors,
                cacheKey,
                dataSource: "none",
                outcome: "blocked_credits",
                errorCode: "WINDOW_REQUIRES_PRO",
                estimatedCostUsd: 0,
              });
              return failure("WINDOW_REQUIRES_PRO");
            }
            // ── Pro user-initiated force_refresh (cache bypass) ────
            // Only honored for wide windows (30d/90d) AND when the lead
            // is Pro (already verified above). Free leads are already
            // rejected. Baseline never honors the flag (no wide-window
            // cost to protect against). When forceRefresh flips on, the
            // existing cache-fresh short-circuit below is skipped so the
            // request walks the full reserve→Apify→confirm path.
            if (parsed.data.force_refresh && !forceRefresh) {
              forceRefresh = true;
              userForcedRefresh = true;
            }
          }
          // Cache fresh + relatório já atribuído a este lead → 0 créditos,
          // EXCETO quando o utilizador pediu explicitamente force_refresh
          // (Pro). Nesse caso reservamos crédito e bypassamos a cache.
          const skipReserve =
            cacheFreshHit && alreadyAssociated && !userForcedRefresh;
          if (!skipReserve) {
            // ── Per-(lead, profile, window) daily cap ──────────────
            // Protects per-paid-user margin on wide-window Pro analyses.
            // Cache hits (cacheFreshHit && !userForcedRefresh) never get
            // here. Runs BEFORE reserveCredit so a blocked call never
            // writes credit_ledger and never triggers Apify.
            if (isWideWindow(windowKind) && leadId) {
              const {
                assertProWindowProfileDailyBudgetAvailable,
                ProWindowBudgetExceededError,
              } = await import("@/lib/security/apify-budget.server");
              try {
                await assertProWindowProfileDailyBudgetAvailable({
                  leadId,
                  handle: primary,
                  window: windowKind as "30d" | "90d",
                });
              } catch (e) {
                if (e instanceof ProWindowBudgetExceededError) {
                  console.warn(
                    "[analyze-public-v1] PRO_WINDOW_BUDGET_EXCEEDED",
                    JSON.stringify({
                      leadId,
                      handle: primary,
                      window: windowKind,
                      spent: e.spentUsd,
                      cap: e.capUsd,
                    }),
                  );
                  await logEvent({
                    handle: primary,
                    competitorHandles: competitors,
                    cacheKey,
                    dataSource: "none",
                    outcome: "blocked_credits",
                    errorCode: "PRO_WINDOW_BUDGET_EXCEEDED",
                    estimatedCostUsd: 0,
                  });
                  return failure("PRO_WINDOW_BUDGET_EXCEEDED");
                }
                throw e;
              }
            }
            // 90d dedicated daily budget gate. Runs only on the fresh-fetch
            // path (cache hits stay free + unblocked). Sits BEFORE
            // reserveCredit so a blocked 90d call never writes credit_ledger
            // and never triggers Apify.
            if (windowKind === "90d") {
              const {
                assertApify90dDailyBudgetAvailable,
                Window90dBudgetExceededError,
              } = await import("@/lib/security/apify-budget.server");
              try {
                await assertApify90dDailyBudgetAvailable();
              } catch (e) {
                if (e instanceof Window90dBudgetExceededError) {
                  await logEvent({
                    handle: primary,
                    competitorHandles: competitors,
                    cacheKey,
                    dataSource: "none",
                    outcome: "blocked_credits",
                    errorCode: "WINDOW_90D_BUDGET_EXCEEDED",
                    estimatedCostUsd: 0,
                  });
                  return failure("WINDOW_90D_BUDGET_EXCEEDED");
                }
                throw e;
              }
            }
            try {
              const outcome = await reserveCredit({
                leadId,
                handle: primary,
                cacheKey,
              });
              if (outcome.kind === "duplicate") {
                duplicateInFlight = true;
                console.info(
                  "[analyze-public-v1] duplicate_reservation_skipped",
                  JSON.stringify({ handle: primary, cacheKey, leadId }),
                );
              } else {
                reservation = { reservationId: outcome.reservationId };
              }
            } catch (err) {
              if (err instanceof InsufficientCreditsError) {
                await logEvent({
                  handle: primary,
                  competitorHandles: competitors,
                  cacheKey,
                  dataSource: "none",
                  outcome: "blocked_credits",
                  errorCode: "INSUFFICIENT_CREDITS",
                  estimatedCostUsd: 0,
                });
                return failure("INSUFFICIENT_CREDITS");
              }
              console.error("[analyze-public-v1] reserveCredit failed", err);
              throw err;
            }
          }
        }

        // Lifecycle bookkeeping. Default to "release" so any unexpected
        // early return refunds the credit; success/cache/stale paths flip
        // this to "confirm" right before returning.
        type CreditOutcome = "confirm" | "release";
        let creditOutcome: CreditOutcome = "release";
        let snapshotForConfirm: string | null = null;
        const finalizeCredit = async () => {
          if (!reservation || !leadId) return;
          const r = reservation;
          reservation = null;
          try {
            if ((creditOutcome as CreditOutcome) === "confirm") {
              await confirmReservation({
                leadId,
                reservationId: r.reservationId,
                analysisSnapshotId: snapshotForConfirm,
                analysisEventId: lastEventId,
              });
              // Persiste associação lead↔relatório para que futuras
              // aberturas do mesmo cache_key pelo mesmo lead sejam
              // gratuitas. Idempotente via UNIQUE(lead_id, cache_key).
              await upsertLeadReport({
                leadId,
                handle: primary,
                cacheKey,
                analysisSnapshotId: snapshotForConfirm,
              });
            } else {
              await releaseReservation({
                leadId,
                reservationId: r.reservationId,
                reason: "auto_release",
                analysisEventId: lastEventId,
              });
            }
          } catch (e) {
            console.error("[analyze-public-v1] credit finalize failed", e);
          }
        };

        try {

        // Load benchmark references upfront (cached in-memory for 10 min) so
        // both cache-hit and fresh-path responses can embed a positioning
        // computed against the cloud-managed dataset.
        const benchmarkData = await loadBenchmarkReferences();

        // 1) Cache lookup. A non-expired snapshot short-circuits everything.
        //    Já calculado acima como `existingEarly` para o gate de créditos.
        const existing = existingEarly;
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
          creditOutcome = "confirm";
          snapshotForConfirm = existing.id;
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
              creditOutcome = "confirm";
              snapshotForConfirm = existing.id;
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
            creditOutcome = "confirm";
            snapshotForConfirm = existing.id;
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
          // Monthly hard cap (Apify Free: $5/cycle) is checked first — it is
          // the ceiling that actually matters on the Free plan.
          await assertApifyMonthlyBudgetAvailable();
          await assertApifyDailyBudgetAvailable();
        } catch (err) {
          if (
            err instanceof BudgetExceededError ||
            err instanceof MonthlyBudgetExceededError
          ) {
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
              creditOutcome = "confirm";
              snapshotForConfirm = existing.id;
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
          // PR 1: PRIMARY uses the window-specific config (baseline / 30d /
          // 90d). Competitors stay on baseline by design — we are not
          // refetching competitors per window in this phase to keep cost,
          // cache and complexity bounded.
          const callPrimary = fetchProfileWithPostsLogged(primary, primaryWindowCfg).then(
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
          const allPrimaryPosts = Array.isArray(
            (primaryRow as { latestPosts?: unknown }).latestPosts,
          )
            ? ((primaryRow as { latestPosts: unknown[] }).latestPosts as Record<
                string,
                unknown
              >[])
            : [];
          // PR1 window filter: in `details` mode the actor ignores
          // `onlyPostsNewerThan`, so we narrow `latestPosts[]` to the
          // requested window client-side. Posts without a parseable
          // timestamp are dropped to avoid skewing the summary.
          const windowMs =
            windowKind === "30d"
              ? 30 * 24 * 60 * 60 * 1000
              : windowKind === "90d"
                ? 90 * 24 * 60 * 60 * 1000
                : null;
          const primaryPosts = windowMs
            ? allPrimaryPosts.filter((p) => {
                const ts = postTimestampMs(p as never);
                return ts !== null && ts >= Date.now() - windowMs;
              })
            : allPrimaryPosts;
          const isPrivateFlag =
            rawPrimary?.is_private === true || rawPrimary?.private === true;
          const profilePostsCount = primaryProfile.posts_count ?? 0;
          const isProfessional = primaryProfile.is_business;

          // The private / personal-no-feed classification only makes sense
          // for baseline (where 0 posts means "no feed at all"). For 30d/90d,
          // 0 posts just means "no activity in the window" — proceed with
          // an empty summary so the profile metrics still render.
          if (windowKind === "baseline" && allPrimaryPosts.length === 0) {
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
          // Truncation / coverage detection. `posts` mode stops at
          // `resultsLimit`, so a full page of results means the window was
          // very likely cut short — the report must say what it observed
          // instead of claiming the full 30/90 days.
          const primaryPostTimestamps = primaryPosts
            .map((p) => postTimestampMs(p as never))
            .filter((t): t is number => typeof t === "number");
          const oldestPostMs =
            primaryPostTimestamps.length > 0
              ? Math.min(...primaryPostTimestamps)
              : null;
          const primaryWindowObservedDays =
            oldestPostMs !== null
              ? Math.max(
                  1,
                  Math.round((Date.now() - oldestPostMs) / 86_400_000),
                )
              : 0;
          const primaryWindowTruncated =
            windowMs !== null &&
            primaryPosts.length >= primaryWindowCfg.resultsLimit;

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
              // Phase 2B: persist deterministic per-post detail for the
              // competitor — reuses `enrichPosts` (same helper as the
              // primary profile). The sanitiser below excludes ONLY
              // coauthors/tagged_users/location_name for competitors.
              // `thumbnail_storage_url` IS kept (initialised as `null`
              // by `enrichPosts` and later populated by
              // `persistThumbnailsInPayload` inside `storeSnapshot`, which
              // also writes `profile.avatar_storage_url`). No additional
              // provider calls here — `posts` is the same `latestPosts[]`
              // already returned by the Apify fetch.
              const enriched = enrichPosts(posts, profile.followers_count);
              const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
              const hashtagTally = new Map<string, number>();
              for (const p of enriched.posts) {
                if (typeof p.weekday === "number" && p.weekday >= 0 && p.weekday <= 6) {
                  weekdayCounts[p.weekday] += 1;
                }
                for (const raw of p.hashtags ?? []) {
                  const tag = String(raw).toLowerCase();
                  if (!tag) continue;
                  hashtagTally.set(tag, (hashtagTally.get(tag) ?? 0) + 1);
                }
              }
              const topHashtags = Array.from(hashtagTally.entries())
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, 10)
                .map(([tag, count]) => ({ tag, count }));
              // Strip ONLY the fields we explicitly do not persist for
              // competitors. Do NOT strip `thumbnail_storage_url` — it is
              // populated by `persistThumbnailsInPayload` during
              // `storeSnapshot` so competitor thumbnails survive expiring
              // Instagram CDN URLs.
              const sanitizedPosts = enriched.posts.map((p) => {
                const {
                  coauthors: _c,
                  tagged_users: _t,
                  location_name: _l,
                  ...rest
                } = p;
                return rest;
              });
              return {
                success: true as const,
                profile,
                content_summary: summary,
                posts: sanitizedPosts,
                format_stats: enriched.format_stats,
                weekday_counts: weekdayCounts,
                top_hashtags: topHashtags,
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
            // PR2 — persist the selected public window so the report adapter
            // can render honest "Últimos 30/90 dias" copy and the empty-feed
            // case for wide windows. Baseline is written explicitly; legacy
            // baseline snapshots (no key) are treated as baseline downstream.
            analysis_window: windowKind,
            analysis_window_label: primaryWindowCfg.label,
            // Honest window reporting: how many days the sample actually
            // covers, and whether the provider truncated the window.
            analysis_window_observed_days: primaryWindowObservedDays,
            analysis_window_truncated: primaryWindowTruncated,
            profile: primaryProfile,
            content_summary: primarySummary,
            competitors: competitorResults,
            posts: primaryEnriched.posts,
            format_stats: primaryEnriched.format_stats,
            ...(marketSignalsFree
              ? { market_signals_free: marketSignalsFree }
              : {}),
            // Free path: only Apify+comments stay pending. Paid
            // enrichments (DataForSEO + OpenAI v1/v2 + visual_cover +
            // caption_semantic) are pre-marked as `skipped` and only
            // enqueued post-purchase via `enqueuePaidEnrichments`.
            enrichment_status: buildFreeEnrichmentStatus(),
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
            // One `details` run per profile → one billed item per profile.
            billedResults: totalProfiles,
          });

          // Record the success event immediately. This guarantees that a
          // completed Apify+DataForSEO run is reflected in analysis_events
          // even if the Worker dies before OpenAI returns.
          const analysisEventId = await logEvent({
            handle: primary,
            competitorHandles: competitors,
            cacheKey,
            // `fresh_forced` distinguishes a user-initiated Pro
            // `force_refresh:true` from a regular fresh run in admin UI.
            dataSource: userForcedRefresh ? "fresh_forced" : "fresh",
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
              // Only enqueue the Free enrichment subset. Paid types are
              // skipped here and enqueued later on entitlement grant
              // (EuPago webhook → enqueuePaidEnrichments).
              const enrichmentRows = FREE_ENRICHMENT_TYPES.map((type) => ({
                snapshot_id: snapshotId,
                analysis_event_id: analysisEventId ?? null,
                handle: primary,
                enrichment_type: type,
                status: "pending" as const,
                priority: ENRICHMENT_PRIORITY[type],
              }));

              if (enrichmentRows.length > 0) {
                const { error: insertErr } = await supabaseAdmin
                  .from("enrichment_jobs")
                  .insert(enrichmentRows as never);

                if (insertErr) {
                  console.error("[analyze-public-v1] failed to create enrichment_jobs", insertErr.message);
                } else {
                  console.info(
                    "[analyze-public-v1] created",
                    enrichmentRows.length,
                    "free enrichment_jobs for snapshot",
                    snapshotId,
                  );
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
              } else {
                console.info(
                  "[analyze-public-v1] no free enrichments to enqueue; paid set deferred until entitlement grant",
                  snapshotId,
                );
              }
            } catch (err) {
              console.error("[analyze-public-v1] enrichment job creation failed", err);
            }

            // ─── Comment Intelligence (async, kept separate) ──────────────
            const commentScraperEnabled =
              (process.env.COMMENT_SCRAPER_ENABLED ?? "false").toLowerCase() === "true";
            const commentScraperInternalTest =
              (process.env.COMMENT_SCRAPER_INTERNAL_TEST ?? "false").toLowerCase() === "true";
            // Nível 2: por defeito o comment scraper NÃO corre junto com a
            // análise base. É disparado depois, por
            // POST /api/public/unlock-comments, quando o utilizador submete
            // nome + email. Assim a auditoria base custa 1 Actor run.
            const deferCommentsToLevel2 =
              (process.env.COMMENT_SCRAPER_DEFER_TO_LEVEL_2 ?? "true").toLowerCase() === "true";
            // Soft monthly cap: quando o ciclo Free está quase esgotado,
            // Comment Intelligence (trabalho opcional) é degradado em vez de
            // consumir os últimos créditos. O relatório base continua a servir.
            const monthlySoftCapReached = await isApifyMonthlySoftCapReached();
            const runComments =
              !deferCommentsToLevel2 &&
              !monthlySoftCapReached &&
              shouldRunCommentScraper({
                featureEnabled: commentScraperEnabled,
                isInternalTest: commentScraperInternalTest,
              });

            if (deferCommentsToLevel2 || monthlySoftCapReached) {
              // Bloqueio explícito: a UI mostra Comment Intelligence como
              // desbloqueável em vez de "indisponível".
              if (snapshotId) await setEnrichmentStatusAtomic(snapshotId, "comments", "locked");
            } else if (runComments) {
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
            freshness: deriveFreshnessJustNow(),
          };
          creditOutcome = "confirm";
          snapshotForConfirm = snapshotId ?? null;
          return jsonResponse(response, 200);
        } catch (err) {
          // 5) Stale-while-error: if provider failed but we have a recent
          // snapshot (≤ 7 days), serve it rather than breaking the page.
          if (existing && isWithinStaleWindow(existing)) {
            console.info(
              "[analyze-public-v1] refresh_fallback_to_cache",
              JSON.stringify({ handle: primary, snapshot_id: existing.id }),
            );
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
            creditOutcome = "confirm";
            snapshotForConfirm = existing.id;
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
            // Provider account blocked for billing (Apify 403
            // platform-feature-disabled / outstanding invoices). Needs an
            // operator action, not a user retry — surface it as its own code.
            if (err.code === "apify_billing_blocked") {
              await logEvent({
                handle: primary,
                competitorHandles: competitors,
                cacheKey,
                dataSource: "fresh",
                outcome: "provider_error",
                errorCode: "PROVIDER_BILLING_BLOCKED",
              });
              return failure("PROVIDER_BILLING_BLOCKED");
            }
            // Transient: 5xx, timeouts and network faults are worth retrying.
            const transient =
              err.status >= 500 ||
              err.code === "apify_timeout" ||
              err.code === "apify_network_error";
            const resolvedCode = transient
              ? "UPSTREAM_UNAVAILABLE"
              : "UPSTREAM_FAILED";
            await logEvent({
              handle: primary,
              competitorHandles: competitors,
              cacheKey,
              dataSource: "fresh",
              outcome: "provider_error",
              errorCode: resolvedCode,
            });
            return failure(resolvedCode);

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
        } finally {
          // Always settles the reservation (confirm/release) before the
          // response is flushed. No-op when isInternalBypass=true.
          await finalizeCredit();
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
