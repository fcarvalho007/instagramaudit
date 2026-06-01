/**
 * Apify temporal-window lab (admin-only).
 *
 * Runs a controlled, isolated Apify call to measure cost, duration, post
 * volume, and observed date range for different `onlyPostsNewerThan`
 * windows. Persists each attempt in `apify_lab_runs` for later review.
 *
 * Strict guardrails — this route deliberately does NOT:
 *   - create report_snapshots / report_requests / leads
 *   - call OpenAI / DataForSEO / comment-scraper
 *   - send emails
 *   - touch production cache or social_profiles
 *
 * It only calls the Instagram scraper actor (`apify/instagram-scraper`)
 * with the requested window and records the outcome.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  ApifyConfigError,
  ApifyUpstreamError,
  runActorWithMetadata,
} from "@/lib/analysis/apify-client";
import { estimateApifyCost, sanitizeErrorExcerpt } from "@/lib/analysis/cost";
import { enrichPosts } from "@/lib/analysis/normalize";
import {
  assertApifyDailyBudgetAvailable,
  BudgetExceededError,
} from "@/lib/security/apify-budget.server";
import { isAllowed, isApifyEnabled } from "@/lib/security/apify-allowlist";
import { requireAdminSession } from "@/lib/admin/session";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const UNIFIED_ACTOR = "apify/instagram-scraper";

type WindowKind = "baseline" | "30d" | "60d" | "90d" | "365d";

interface WindowConfig {
  // Apify actor input keys.
  resultsLimit: number;
  onlyPostsNewerThan?: string;
  // Guardrails passed to runActorWithMetadata.
  maxTotalChargeUsd: number;
  apifyTimeoutSecs: number;
  timeoutMs: number;
  memoryMbytes: number;
}

const WINDOW_CONFIGS: Record<WindowKind, WindowConfig> = {
  baseline: {
    resultsLimit: 12,
    maxTotalChargeUsd: 0.1,
    apifyTimeoutSecs: 55,
    timeoutMs: 60_000,
    memoryMbytes: 1024,
  },
  "30d": {
    resultsLimit: 100,
    onlyPostsNewerThan: "30 days",
    maxTotalChargeUsd: 0.1,
    apifyTimeoutSecs: 55,
    timeoutMs: 60_000,
    memoryMbytes: 1024,
  },
  "60d": {
    resultsLimit: 200,
    onlyPostsNewerThan: "60 days",
    maxTotalChargeUsd: 0.2,
    apifyTimeoutSecs: 55,
    timeoutMs: 60_000,
    memoryMbytes: 1024,
  },
  "90d": {
    resultsLimit: 300,
    onlyPostsNewerThan: "90 days",
    maxTotalChargeUsd: 0.3,
    apifyTimeoutSecs: 120,
    timeoutMs: 130_000,
    memoryMbytes: 2048,
  },
  "365d": {
    resultsLimit: 1000,
    onlyPostsNewerThan: "365 days",
    maxTotalChargeUsd: 1.0,
    apifyTimeoutSecs: 240,
    timeoutMs: 260_000,
    memoryMbytes: 2048,
  },
};

const RunBodySchema = z.object({
  profile_handle: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9._]+$/, "handle inválido"),
  profile_segment: z.enum(["medium", "high", "low"]),
  window_kind: z.enum(["baseline", "30d", "60d", "90d", "365d"]),
  notes: z.string().max(500).optional(),
});

function buildActorInput(handle: string, cfg: WindowConfig): Record<string, unknown> {
  const input: Record<string, unknown> = {
    directUrls: [`https://www.instagram.com/${handle}/`],
    resultsType: "details",
    resultsLimit: cfg.resultsLimit,
    addParentData: false,
  };
  if (cfg.onlyPostsNewerThan) input.onlyPostsNewerThan = cfg.onlyPostsNewerThan;
  return input;
}

function extractLatestPosts(row: Record<string, unknown> | null): unknown[] {
  if (!row) return [];
  const raw = (row as { latestPosts?: unknown }).latestPosts;
  return Array.isArray(raw) ? raw : [];
}

function pickPostTimestampMs(p: unknown): number | null {
  if (!p || typeof p !== "object") return null;
  const r = p as Record<string, unknown>;
  const ts = r.timestamp ?? r.taken_at_timestamp ?? r.takenAtTimestamp;
  if (typeof ts === "number" && Number.isFinite(ts)) {
    return ts < 1e12 ? ts * 1000 : ts;
  }
  if (typeof ts === "string") {
    const d = Date.parse(ts);
    if (Number.isFinite(d)) return d;
  }
  return null;
}

function pickFollowers(row: Record<string, unknown> | null): number {
  if (!row) return 0;
  const r = row as Record<string, unknown>;
  const v = r.followersCount ?? r.followers ?? r.followers_count;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export const Route = createFileRoute("/api/admin/apify-lab")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }
        const { data, error } = await supabaseAdmin
          .from("apify_lab_runs" as never)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) {
          return Response.json(
            { success: false, error: error.message },
            { status: 500 },
          );
        }
        return Response.json({ success: true, runs: data ?? [] });
      },

      POST: async ({ request }) => {
        let admin: { email: string };
        try {
          admin = await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { success: false, error: "JSON inválido" },
            { status: 400 },
          );
        }

        const parsed = RunBodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { success: false, error: parsed.error.message },
            { status: 400 },
          );
        }

        const { profile_handle, profile_segment, window_kind, notes } =
          parsed.data;
        const handle = profile_handle.replace(/^@/, "").toLowerCase();
        const cfg = WINDOW_CONFIGS[window_kind as WindowKind];
        const input = buildActorInput(handle, cfg);
        const guardrails = {
          maxItems: 1,
          maxTotalChargeUsd: cfg.maxTotalChargeUsd,
          apifyTimeoutSecs: cfg.apifyTimeoutSecs,
          timeoutMs: cfg.timeoutMs,
          memoryMbytes: cfg.memoryMbytes,
        };

        // Pre-flight gates.
        if (!isApifyEnabled()) {
          const row = await persistRun({
            admin_email: admin.email,
            profile_handle: handle,
            profile_segment,
            window_kind,
            input_params: input,
            guardrails,
            status: "blocked",
            semantic_code: "apify_disabled",
            notes: notes ?? null,
            error_excerpt: "APIFY_ENABLED não é 'true'",
          });
          return Response.json({ success: false, run: row }, { status: 200 });
        }
        if (!isAllowed(handle)) {
          const row = await persistRun({
            admin_email: admin.email,
            profile_handle: handle,
            profile_segment,
            window_kind,
            input_params: input,
            guardrails,
            status: "blocked",
            semantic_code: "allowlist_block",
            notes: notes ?? null,
            error_excerpt: `Handle fora de APIFY_ALLOWLIST: ${handle}`,
          });
          return Response.json({ success: false, run: row }, { status: 200 });
        }
        try {
          await assertApifyDailyBudgetAvailable();
        } catch (err) {
          if (err instanceof BudgetExceededError) {
            const row = await persistRun({
              admin_email: admin.email,
              profile_handle: handle,
              profile_segment,
              window_kind,
              input_params: input,
              guardrails,
              status: "budget_block",
              semantic_code: "daily_budget_exceeded",
              notes: notes ?? null,
              error_excerpt: err.message,
            });
            return Response.json({ success: false, run: row }, { status: 200 });
          }
          throw err;
        }

        const startedAt = Date.now();
        try {
          const result = await runActorWithMetadata<Record<string, unknown>>(
            UNIFIED_ACTOR,
            input,
            {
              timeoutMs: cfg.timeoutMs,
              apifyTimeoutSecs: cfg.apifyTimeoutSecs,
              memoryMbytes: cfg.memoryMbytes,
              maxItems: 1,
              maxTotalChargeUsd: cfg.maxTotalChargeUsd,
            },
          );
          const durationMs = Date.now() - startedAt;
          const profileRow = result.items[0] ?? null;
          const posts = extractLatestPosts(profileRow);

          // Compute newest/oldest/observed_days.
          const tsList = posts
            .map(pickPostTimestampMs)
            .filter((n): n is number => n !== null)
            .sort((a, b) => a - b);
          const oldestMs = tsList[0] ?? null;
          const newestMs = tsList[tsList.length - 1] ?? null;
          const observedDays =
            oldestMs !== null && newestMs !== null
              ? Math.max(0, Math.round((newestMs - oldestMs) / 86_400_000))
              : null;

          // Try normalize without persisting.
          let normalizeOk = true;
          try {
            enrichPosts(posts, pickFollowers(profileRow));
          } catch {
            normalizeOk = false;
          }

          const estimated = estimateApifyCost({
            profilesReturned: profileRow ? 1 : 0,
            postsReturned: posts.length,
          });

          const row = await persistRun({
            admin_email: admin.email,
            profile_handle: handle,
            profile_segment,
            window_kind,
            input_params: input,
            guardrails,
            status: "success",
            semantic_code: null,
            apify_run_id: result.runId,
            posts_returned: posts.length,
            newest_post_at: newestMs ? new Date(newestMs).toISOString() : null,
            oldest_post_at: oldestMs ? new Date(oldestMs).toISOString() : null,
            observed_days: observedDays,
            duration_ms: durationMs,
            estimated_cost_usd: estimated,
            actual_cost_usd: result.actualCostUsd ?? null,
            normalize_ok: normalizeOk,
            notes: notes ?? null,
            error_excerpt: null,
          });
          return Response.json({ success: true, run: row });
        } catch (err) {
          const durationMs = Date.now() - startedAt;
          const isUpstream = err instanceof ApifyUpstreamError;
          const isConfig = err instanceof ApifyConfigError;
          const code = isUpstream || isConfig ? err.code : "apify_network_error";
          const message = (err as Error).message ?? "unknown";
          const actualCost =
            isUpstream && typeof err.actualCostUsd === "number"
              ? err.actualCostUsd
              : null;
          const apifyRunId = isUpstream ? err.runId ?? null : null;
          const status =
            code === "apify_timeout"
              ? "timeout"
              : code === "apify_actor_failed"
                ? "failed"
                : "failed";

          const row = await persistRun({
            admin_email: admin.email,
            profile_handle: handle,
            profile_segment,
            window_kind,
            input_params: input,
            guardrails,
            status,
            semantic_code: code,
            apify_run_id: apifyRunId,
            duration_ms: durationMs,
            actual_cost_usd: actualCost,
            notes: notes ?? null,
            error_excerpt: sanitizeErrorExcerpt(message),
          });
          return Response.json({ success: false, run: row }, { status: 200 });
        }
      },
    },
  },
});

interface PersistInput {
  admin_email: string;
  profile_handle: string;
  profile_segment: string;
  window_kind: string;
  input_params: Record<string, unknown>;
  guardrails: Record<string, unknown>;
  status: string;
  semantic_code?: string | null;
  apify_run_id?: string | null;
  posts_returned?: number | null;
  newest_post_at?: string | null;
  oldest_post_at?: string | null;
  observed_days?: number | null;
  duration_ms?: number | null;
  estimated_cost_usd?: number | null;
  actual_cost_usd?: number | null;
  normalize_ok?: boolean | null;
  notes?: string | null;
  error_excerpt?: string | null;
}

async function persistRun(payload: PersistInput): Promise<unknown> {
  const { data, error } = await supabaseAdmin
    .from("apify_lab_runs" as never)
    .insert(payload as never)
    .select("*")
    .single();
  if (error) {
    console.error("[apify-lab] persist failed", error.message);
    return null;
  }
  return data;
}