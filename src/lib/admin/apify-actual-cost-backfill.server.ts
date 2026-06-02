/**
 * Backfill de `actual_cost_usd` a partir do run metadata da Apify.
 *
 * Lê `provider_call_logs` (provider='apify') e/ou `apify_lab_runs` com
 * `apify_run_id` preenchido e `actual_cost_usd` em NULL/0, chama
 * `GET https://api.apify.com/v2/actor-runs/{runId}` e actualiza a row com
 * `usageTotalUsd`.
 *
 * NÃO arranca novos actor runs. Apenas leituras de metadata.
 *
 * `dryRun: true` faz as chamadas HTTP e calcula deltas, mas não escreve
 * em DB.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const APIFY_RUNS_BASE = "https://api.apify.com/v2/actor-runs";
const FETCH_TIMEOUT_MS = 10_000;
const REQUEST_GAP_MS = 120;

export type BackfillScope =
  | "provider_call_logs"
  | "apify_lab_runs"
  | "both";

export interface BackfillOptions {
  scope?: BackfillScope;
  limit?: number;
  driftThresholdPct?: number;
  dryRun?: boolean;
}

interface ScopeStats {
  scope: "provider_call_logs" | "apify_lab_runs";
  scanned: number;
  updated: number;
  skipped_missing_usage: number;
  skipped_missing_remote: number;
  errors: number;
  drift_flagged: number;
  sum_estimated_before: number;
  sum_actual_before: number;
  sum_actual_after: number;
  missing_run_ids: string[];
}

export interface BackfillResult {
  ok: boolean;
  dry_run: boolean;
  drift_threshold_pct: number;
  scopes: ScopeStats[];
  totals: {
    scanned: number;
    updated: number;
    drift_flagged: number;
    sum_estimated_before: number;
    sum_actual_before: number;
    sum_actual_after: number;
  };
  aborted_reason?: string;
}

interface ApifyRunMetadata {
  data?: {
    id?: string;
    status?: string;
    usageTotalUsd?: number;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRunUsage(
  runId: string,
  token: string,
): Promise<
  | { kind: "ok"; usageUsd: number | null }
  | { kind: "missing_remote" }
  | { kind: "auth_error" }
  | { kind: "error"; message: string }
> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${APIFY_RUNS_BASE}/${runId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (res.status === 404) return { kind: "missing_remote" };
    if (res.status === 401 || res.status === 403) return { kind: "auth_error" };
    if (!res.ok) {
      return { kind: "error", message: `HTTP ${res.status}` };
    }
    const body = (await res.json()) as ApifyRunMetadata;
    const usage = body.data?.usageTotalUsd;
    return {
      kind: "ok",
      usageUsd: typeof usage === "number" && Number.isFinite(usage) ? usage : null,
    };
  } catch (err) {
    return { kind: "error", message: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

function computeDriftPct(actual: number, estimated: number): number {
  const base = Math.max(Math.abs(estimated), 0.001);
  return (Math.abs(actual - estimated) / base) * 100;
}

interface CandidateRow {
  id: string;
  apify_run_id: string;
  estimated_cost_usd: number | null;
  actual_cost_usd: number | null;
  handle: string | null;
  created_at: string;
}

async function loadCandidates(
  table: "provider_call_logs" | "apify_lab_runs",
  limit: number,
): Promise<{ rows: CandidateRow[]; missingRunIds: string[] }> {
  const baseSelect =
    "id, apify_run_id, estimated_cost_usd, actual_cost_usd, handle:profile_handle, created_at";
  const isPCL = table === "provider_call_logs";
  const select = isPCL
    ? "id, apify_run_id, estimated_cost_usd, actual_cost_usd, handle, created_at"
    : baseSelect;

  // Candidates: have run_id and missing cost.
  let query = supabaseAdmin
    .from(table as never)
    .select(select)
    .not("apify_run_id", "is", null)
    .or("actual_cost_usd.is.null,actual_cost_usd.eq.0")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (isPCL) {
    query = (query as unknown as { eq: (c: string, v: string) => typeof query }).eq(
      "provider",
      "apify",
    );
  }

  const { data, error } = (await query) as unknown as {
    data: CandidateRow[] | null;
    error: { message: string } | null;
  };
  if (error) throw new Error(`load ${table}: ${error.message}`);

  // Missing run_ids (no apify_run_id at all).
  const missingQ = supabaseAdmin
    .from(table as never)
    .select("id")
    .is("apify_run_id", null);
  const missingQuery = isPCL
    ? (missingQ as unknown as { eq: (c: string, v: string) => typeof missingQ }).eq(
        "provider",
        "apify",
      )
    : missingQ;
  const { data: missingRows } = (await missingQuery) as unknown as {
    data: { id: string }[] | null;
  };

  return {
    rows: data ?? [],
    missingRunIds: (missingRows ?? []).map((r) => r.id),
  };
}

async function processScope(
  table: "provider_call_logs" | "apify_lab_runs",
  token: string,
  options: Required<Pick<BackfillOptions, "limit" | "driftThresholdPct" | "dryRun">>,
): Promise<{ stats: ScopeStats; auth_error: boolean }> {
  const stats: ScopeStats = {
    scope: table,
    scanned: 0,
    updated: 0,
    skipped_missing_usage: 0,
    skipped_missing_remote: 0,
    errors: 0,
    drift_flagged: 0,
    sum_estimated_before: 0,
    sum_actual_before: 0,
    sum_actual_after: 0,
    missing_run_ids: [],
  };

  const { rows, missingRunIds } = await loadCandidates(table, options.limit);
  stats.missing_run_ids = missingRunIds;

  for (const row of rows) {
    stats.scanned += 1;
    const estimated = Number(row.estimated_cost_usd ?? 0);
    const actualBefore = Number(row.actual_cost_usd ?? 0);
    stats.sum_estimated_before += estimated;
    stats.sum_actual_before += actualBefore;

    const result = await fetchRunUsage(row.apify_run_id, token);
    await sleep(REQUEST_GAP_MS);

    if (result.kind === "auth_error") {
      // Aborta scope inteiro — token inválido.
      stats.sum_actual_after += actualBefore;
      return { stats, auth_error: true };
    }
    if (result.kind === "missing_remote") {
      stats.skipped_missing_remote += 1;
      stats.sum_actual_after += actualBefore;
      continue;
    }
    if (result.kind === "error") {
      stats.errors += 1;
      stats.sum_actual_after += actualBefore;
      continue;
    }
    if (result.usageUsd === null) {
      stats.skipped_missing_usage += 1;
      stats.sum_actual_after += actualBefore;
      continue;
    }

    const usage = Number(result.usageUsd.toFixed(6));
    stats.sum_actual_after += usage;

    const driftPct =
      estimated > 0 ? computeDriftPct(usage, estimated) : 0;
    const isDrift = estimated > 0 && driftPct > options.driftThresholdPct;
    if (isDrift) stats.drift_flagged += 1;

    if (!options.dryRun) {
      const { error: updErr } = await supabaseAdmin
        .from(table as never)
        .update({ actual_cost_usd: usage } as never)
        .eq("id", row.id);
      if (updErr) {
        stats.errors += 1;
        // Reverte contagem do sum_actual_after para o valor antigo.
        stats.sum_actual_after = stats.sum_actual_after - usage + actualBefore;
        continue;
      }
      stats.updated += 1;

      if (isDrift) {
        await supabaseAdmin.from("usage_alerts" as never).insert({
          kind: "apify_cost_drift",
          severity: "warning",
          metric_name: "actual_vs_estimated_pct",
          metric_value: Number(driftPct.toFixed(2)),
          threshold_value: options.driftThresholdPct,
          window_start: row.created_at,
          window_end: row.created_at,
          handle: row.handle ?? null,
          network: "instagram",
          notes: `run=${row.apify_run_id} table=${table} estimated=${estimated.toFixed(6)} actual=${usage.toFixed(6)}`,
        } as never);
      }
    } else {
      // Em dry-run conta como "would update".
      stats.updated += 1;
    }
  }

  return { stats, auth_error: false };
}

export async function backfillApifyActualCost(
  options: BackfillOptions = {},
): Promise<BackfillResult> {
  const token = process.env.APIFY_TOKEN;
  const driftThresholdPct = options.driftThresholdPct ?? 30;
  const limit = Math.min(Math.max(options.limit ?? 500, 1), 1000);
  const dryRun = options.dryRun ?? false;
  const scope: BackfillScope = options.scope ?? "both";

  if (!token) {
    return {
      ok: false,
      dry_run: dryRun,
      drift_threshold_pct: driftThresholdPct,
      scopes: [],
      totals: {
        scanned: 0,
        updated: 0,
        drift_flagged: 0,
        sum_estimated_before: 0,
        sum_actual_before: 0,
        sum_actual_after: 0,
      },
      aborted_reason: "missing_apify_token",
    };
  }

  const tables: ("provider_call_logs" | "apify_lab_runs")[] =
    scope === "both"
      ? ["provider_call_logs", "apify_lab_runs"]
      : [scope];

  const scopes: ScopeStats[] = [];
  let abortedReason: string | undefined;

  for (const table of tables) {
    const { stats, auth_error } = await processScope(table, token, {
      limit,
      driftThresholdPct,
      dryRun,
    });
    scopes.push(stats);
    if (auth_error) {
      abortedReason = "apify_auth_error";
      break;
    }
  }

  const totals = scopes.reduce(
    (acc, s) => {
      acc.scanned += s.scanned;
      acc.updated += s.updated;
      acc.drift_flagged += s.drift_flagged;
      acc.sum_estimated_before += s.sum_estimated_before;
      acc.sum_actual_before += s.sum_actual_before;
      acc.sum_actual_after += s.sum_actual_after;
      return acc;
    },
    {
      scanned: 0,
      updated: 0,
      drift_flagged: 0,
      sum_estimated_before: 0,
      sum_actual_before: 0,
      sum_actual_after: 0,
    },
  );

  // Round totals para apresentação consistente.
  for (const key of [
    "sum_estimated_before",
    "sum_actual_before",
    "sum_actual_after",
  ] as const) {
    totals[key] = Number(totals[key].toFixed(6));
  }

  // Registar batch em provider_billing_import_batches (apenas modo aplicar).
  if (!dryRun && !abortedReason && totals.updated > 0) {
    const now = new Date().toISOString();
    const reconciliation_status =
      scopes.some(
        (s) =>
          s.skipped_missing_remote > 0 ||
          s.skipped_missing_usage > 0 ||
          s.errors > 0 ||
          s.missing_run_ids.length > 0,
      )
        ? "partial"
        : "completed";
    await supabaseAdmin.from("provider_billing_import_batches" as never).insert({
      provider: "apify",
      period_start: now,
      period_end: now,
      currency: "USD",
      dashboard_total_actual_cost_usd: 0,
      imported_total_raw_cost_usd: Number(
        (totals.sum_actual_after - totals.sum_actual_before).toFixed(6),
      ),
      imported_total_displayed_cost_usd: totals.sum_actual_after,
      reconciliation_status,
      source_note: "backfill_run_metadata",
    } as never);
  }

  return {
    ok: !abortedReason,
    dry_run: dryRun,
    drift_threshold_pct: driftThresholdPct,
    scopes,
    totals,
    aborted_reason: abortedReason,
  };
}