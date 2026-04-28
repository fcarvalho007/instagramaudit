/**
 * Per-snapshot cost aggregator over `provider_call_logs`.
 *
 * Server-only. No provider is called — this module only reads from the
 * existing `provider_call_logs` table and derives a transparent cost
 * summary for the admin cockpit.
 *
 * Three exports:
 *   - `classifyCostSource(rows, expected)` — pure
 *   - `summarizeCallLogs(rows, presence)` — pure
 *   - `fetchReportCostSummary(...)` — DB reader
 *   - `fetchReportCostSummariesBatch(...)` — DB reader for the list endpoint
 *
 * Attribution heuristic: a call log belongs to a snapshot when its
 * `handle` matches AND `created_at` falls inside the snapshot's
 * [created_at − slack, updated_at + slack] window. `analysis_snapshots`
 * upserts by cache_key, so this window correctly captures the rows of
 * the most recent refresh without depending on a (non-existent) FK.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  CostConfidence,
  CostSource,
  ProviderKey,
} from "./cost-source-labels";

const WINDOW_SLACK_MS = 60_000;

export interface ProviderCallRow {
  id: string;
  provider: string;
  actor: string;
  handle: string;
  status: string;
  http_status: number | null;
  actual_cost_usd: number | null;
  estimated_cost_usd: number | null;
  duration_ms: number | null;
  created_at: string;
}

export interface ProviderCostBucket {
  actual_usd: number | null;
  estimated_usd: number;
  source: CostSource;
  calls: number;
}

export interface CostSummary {
  apify: ProviderCostBucket;
  dataforseo: ProviderCostBucket;
  openai: ProviderCostBucket;
  total_actual_usd: number;
  total_estimated_usd: number;
  confidence: CostConfidence;
}

export interface ProviderCallDetail extends ProviderCallRow {
  cost_source: CostSource;
}

/**
 * Whether each provider is part of the pipeline that produced this
 * snapshot. Drives the difference between `cache_hit` (expected, no
 * row written) and `not_used` (provider isn't part of this report).
 */
export interface ProviderPresence {
  apify: boolean;
  dataforseo: boolean;
  openai: boolean;
}

/**
 * Detect provider presence from the `analysis_snapshots.normalized_payload`.
 *  - apify: always true (snapshots always come from Apify or its cache).
 *  - dataforseo: true when market signals (free or paid) is present.
 *  - openai: only when an `ai_insights` block is present (placeholder for
 *    a future writer; currently unreachable).
 */
export function detectProviderPresence(payload: unknown): ProviderPresence {
  const p = (payload ?? {}) as Record<string, unknown>;
  const hasFree = Boolean(p.market_signals_free);
  const hasPaid = Boolean(p.market_signals_paid);
  const hasAi = Boolean(p.ai_insights);
  return {
    apify: true,
    dataforseo: hasFree || hasPaid,
    openai: hasAi,
  };
}

function normalizeProvider(value: string): ProviderKey | null {
  const v = value.toLowerCase();
  if (v === "apify") return "apify";
  if (v === "dataforseo") return "dataforseo";
  if (v === "openai") return "openai";
  return null;
}

function num(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Pure classifier for one provider's rows.
 * `expected` controls the empty-rows branch: if the provider IS expected
 * for this snapshot but produced no row in the window, we treat it as a
 * cache hit; otherwise we treat it as not used.
 */
export function classifyCostSource(
  rows: ProviderCallRow[],
  provider: ProviderKey,
  expected: boolean,
): ProviderCostBucket {
  if (rows.length === 0) {
    return {
      actual_usd: null,
      estimated_usd: 0,
      source: expected ? "cache_hit" : "not_used",
      calls: 0,
    };
  }

  const totalActual = rows.reduce((s, r) => s + num(r.actual_cost_usd), 0);
  const totalEstimated = rows.reduce(
    (s, r) => s + num(r.estimated_cost_usd),
    0,
  );

  // All rows blocked or zero-cost on both sides → no real provider charge.
  const allBlockedOrZero = rows.every(
    (r) =>
      r.status === "blocked" ||
      (num(r.actual_cost_usd) === 0 && num(r.estimated_cost_usd) === 0),
  );
  if (allBlockedOrZero) {
    return {
      actual_usd: null,
      estimated_usd: 0,
      source: "cache_hit",
      calls: rows.length,
    };
  }

  if (totalActual > 0) {
    return {
      actual_usd: totalActual,
      estimated_usd: totalEstimated,
      source: "provider_reported",
      calls: rows.length,
    };
  }

  // Future-ready: OpenAI rows would carry token-based calculated cost.
  // Until a writer exists, this branch is unreachable but keeps the API
  // shape stable for the admin UI.
  if (provider === "openai" && totalEstimated > 0) {
    return {
      actual_usd: null,
      estimated_usd: totalEstimated,
      source: "calculated",
      calls: rows.length,
    };
  }

  return {
    actual_usd: null,
    estimated_usd: totalEstimated,
    source: "estimated",
    calls: rows.length,
  };
}

function aggregateConfidence(
  apify: ProviderCostBucket,
  dataforseo: ProviderCostBucket,
  openai: ProviderCostBucket,
): CostConfidence {
  const considered = [apify, dataforseo, openai].filter(
    (b) => b.source !== "not_used",
  );
  if (considered.length === 0) return "sem_custos";

  const allReported = considered.every((b) => b.source === "provider_reported");
  if (allReported) return "confirmado";

  const allCacheHit = considered.every((b) => b.source === "cache_hit");
  if (allCacheHit) return "sem_custos";

  const hasReported = considered.some((b) => b.source === "provider_reported");
  if (hasReported) return "parcial";

  return "estimado";
}

export function summarizeCallLogs(
  rows: ProviderCallRow[],
  presence: ProviderPresence,
): CostSummary {
  const buckets: Record<ProviderKey, ProviderCallRow[]> = {
    apify: [],
    dataforseo: [],
    openai: [],
  };
  for (const r of rows) {
    const k = normalizeProvider(r.provider);
    if (k) buckets[k].push(r);
  }

  const apify = classifyCostSource(buckets.apify, "apify", presence.apify);
  const dataforseo = classifyCostSource(
    buckets.dataforseo,
    "dataforseo",
    presence.dataforseo,
  );
  const openai = classifyCostSource(
    buckets.openai,
    "openai",
    presence.openai,
  );

  const total_actual_usd =
    (apify.actual_usd ?? 0) +
    (dataforseo.actual_usd ?? 0) +
    (openai.actual_usd ?? 0);
  const total_estimated_usd =
    apify.estimated_usd + dataforseo.estimated_usd + openai.estimated_usd;

  return {
    apify,
    dataforseo,
    openai,
    total_actual_usd: Math.round(total_actual_usd * 1e5) / 1e5,
    total_estimated_usd: Math.round(total_estimated_usd * 1e5) / 1e5,
    confidence: aggregateConfidence(apify, dataforseo, openai),
  };
}

/** Annotate a raw row with its derived cost source for the preview table. */
export function annotateCallSource(row: ProviderCallRow): ProviderCallDetail {
  const providerKey = normalizeProvider(row.provider);
  if (!providerKey) {
    return {
      ...row,
      cost_source:
        num(row.actual_cost_usd) > 0
          ? "provider_reported"
          : num(row.estimated_cost_usd) > 0
            ? "estimated"
            : "cache_hit",
    };
  }
  // Single-row classification reuses the same rules.
  const bucket = classifyCostSource([row], providerKey, true);
  return { ...row, cost_source: bucket.source };
}

function windowBounds(createdAtIso: string, updatedAtIso: string): {
  fromIso: string;
  toIso: string;
} {
  const created = new Date(createdAtIso).getTime();
  const updated = new Date(updatedAtIso).getTime();
  const fromMs =
    Math.min(
      Number.isFinite(created) ? created : Date.now(),
      Number.isFinite(updated) ? updated : Date.now(),
    ) - WINDOW_SLACK_MS;
  const toMs =
    Math.max(
      Number.isFinite(created) ? created : Date.now(),
      Number.isFinite(updated) ? updated : Date.now(),
    ) + WINDOW_SLACK_MS;
  return {
    fromIso: new Date(fromMs).toISOString(),
    toIso: new Date(toMs).toISOString(),
  };
}

/**
 * Fetch and summarise call logs for a single snapshot. Returns the
 * summary plus the annotated raw rows (for the preview detail table).
 */
export async function fetchReportCostSummary(input: {
  instagramUsername: string;
  snapshotCreatedAt: string;
  snapshotUpdatedAt: string;
  presence: ProviderPresence;
}): Promise<{
  summary: CostSummary;
  calls: ProviderCallDetail[];
}> {
  const { fromIso, toIso } = windowBounds(
    input.snapshotCreatedAt,
    input.snapshotUpdatedAt,
  );

  const { data, error } = await supabaseAdmin
    .from("provider_call_logs")
    .select(
      "id, provider, actor, handle, status, http_status, actual_cost_usd, estimated_cost_usd, duration_ms, created_at",
    )
    .eq("handle", input.instagramUsername.toLowerCase())
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    // Soft-fail: surface a "no calls" summary rather than break the page.
    console.error("[admin] provider_call_logs read failed", error.message);
    const empty: ProviderCallRow[] = [];
    return {
      summary: summarizeCallLogs(empty, input.presence),
      calls: [],
    };
  }

  const rows = (data ?? []) as ProviderCallRow[];
  return {
    summary: summarizeCallLogs(rows, input.presence),
    calls: rows.map(annotateCallSource),
  };
}

/**
 * Batched variant for the list endpoint. Issues one query per
 * (handle, window) pair grouped by handle to keep latency bounded
 * without N round-trips when many rows belong to the same handle.
 */
export async function fetchReportCostSummariesBatch(
  inputs: Array<{
    snapshotId: string;
    instagramUsername: string;
    snapshotCreatedAt: string;
    snapshotUpdatedAt: string;
    presence: ProviderPresence;
  }>,
): Promise<Map<string, CostSummary>> {
  const out = new Map<string, CostSummary>();
  if (inputs.length === 0) return out;

  // Compute the union window per handle to issue one query per handle.
  const byHandle = new Map<
    string,
    {
      fromIso: string;
      toIso: string;
      members: typeof inputs;
    }
  >();
  for (const item of inputs) {
    const handle = item.instagramUsername.toLowerCase();
    const { fromIso, toIso } = windowBounds(
      item.snapshotCreatedAt,
      item.snapshotUpdatedAt,
    );
    const existing = byHandle.get(handle);
    if (!existing) {
      byHandle.set(handle, { fromIso, toIso, members: [item] });
    } else {
      existing.fromIso =
        existing.fromIso < fromIso ? existing.fromIso : fromIso;
      existing.toIso = existing.toIso > toIso ? existing.toIso : toIso;
      existing.members.push(item);
    }
  }

  await Promise.all(
    Array.from(byHandle.entries()).map(async ([handle, group]) => {
      const { data, error } = await supabaseAdmin
        .from("provider_call_logs")
        .select(
          "id, provider, actor, handle, status, http_status, actual_cost_usd, estimated_cost_usd, duration_ms, created_at",
        )
        .eq("handle", handle)
        .gte("created_at", group.fromIso)
        .lte("created_at", group.toIso)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error(
          "[admin] batch provider_call_logs read failed",
          error.message,
        );
        for (const m of group.members) {
          out.set(m.snapshotId, summarizeCallLogs([], m.presence));
        }
        return;
      }

      const rows = (data ?? []) as ProviderCallRow[];
      for (const m of group.members) {
        const { fromIso, toIso } = windowBounds(
          m.snapshotCreatedAt,
          m.snapshotUpdatedAt,
        );
        const fromMs = new Date(fromIso).getTime();
        const toMs = new Date(toIso).getTime();
        const subset = rows.filter((r) => {
          const t = new Date(r.created_at).getTime();
          return t >= fromMs && t <= toMs;
        });
        out.set(m.snapshotId, summarizeCallLogs(subset, m.presence));
      }
    }),
  );

  return out;
}
