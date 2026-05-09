/**
 * Billing reconciliation queries.
 *
 * Compares external billing imports (provider_billing_imports + batches)
 * against internal logged costs (provider_call_logs) for a given period.
 * Supports rounding-aware reconciliation status.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveCallCost } from "./cost-resolution";

/* ── Shared types ──────────────────────────────────────────────────── */

export interface ReconciliationKPIs {
  externalTotal: number;
  internalTotal: number;
  variance: number;
  variancePct: number | null;
  state: "sem dados" | "reconciliado" | "divergência";
}

export interface DailyPoint {
  date: string;
  internal: number;
  external: number;
  variance: number;
}

export interface ProviderBreakdown {
  provider: string;
  external: number;
  internal: number;
  variance: number;
  displayedRowSum: number | null;
  roundingDelta: number | null;
  source: "batch" | "row-sum";
}

export interface ActorBreakdown {
  actor_or_model: string;
  provider: string;
  external: number;
  internal: number;
  variance: number;
}

export interface BatchSummary {
  id: string;
  provider: string;
  period_start: string;
  period_end: string;
  currency: string;
  dashboard_total: number;
  raw_total: number | null;
  displayed_total: number | null;
  rounding_delta: number | null;
  raw_delta: number | null;
  reconciliation_status: string;
  source_note: string | null;
  internal_total: number;
  created_at: string;
}

export interface ReconciliationData {
  kpis: ReconciliationKPIs;
  daily: DailyPoint[];
  byProvider: ProviderBreakdown[];
  byActor: ActorBreakdown[];
  batches: BatchSummary[];
}

/* ── Read ──────────────────────────────────────────────────────────── */

export async function getReconciliationData(
  periodDays: number,
): Promise<ReconciliationData> {
  const since = new Date(Date.now() - periodDays * 86_400_000).toISOString();

  // External billing rows
  const { data: extRows } = await supabaseAdmin
    .from("provider_billing_imports")
    .select("provider, actor_or_model, actual_cost_usd, displayed_cost_usd, raw_calculated_cost_usd, period_start")
    .gte("period_start", since);

  // Internal logged costs
  const { data: intRows } = await supabaseAdmin
    .from("provider_call_logs")
    .select("provider, actor, actual_cost_usd, estimated_cost_usd, created_at")
    .gte("created_at", since);

  // Batches
  const { data: batchRows } = await supabaseAdmin
    .from("provider_billing_import_batches")
    .select("*")
    .gte("period_start", since)
    .order("created_at", { ascending: false });

  const ext = extRows ?? [];
  const int = intRows ?? [];

  // Build batch-level dashboard totals per provider (authoritative external cost)
  const batchByProvider = new Map<string, { dashboardTotal: number; displayedTotal: number | null; roundingDelta: number | null }>();
  for (const b of (batchRows ?? [])) {
    const prev = batchByProvider.get(b.provider) ?? { dashboardTotal: 0, displayedTotal: null, roundingDelta: null };
    prev.dashboardTotal += Number(b.dashboard_total_actual_cost_usd ?? 0);
    if (b.imported_total_displayed_cost_usd != null) {
      prev.displayedTotal = (prev.displayedTotal ?? 0) + Number(b.imported_total_displayed_cost_usd);
    }
    if (b.rounding_delta_usd != null) {
      prev.roundingDelta = (prev.roundingDelta ?? 0) + Number(b.rounding_delta_usd);
    }
    batchByProvider.set(b.provider, prev);
  }

  // KPIs — external total from batch dashboard totals (not row sums)
  let externalTotal = 0;
  for (const v of batchByProvider.values()) externalTotal += v.dashboardTotal;
  const internalTotal = int.reduce((s, r) => s + resolveCallCost(r), 0);
  const variance = externalTotal - internalTotal;
  const variancePct = externalTotal > 0 ? (variance / externalTotal) * 100 : null;

  let state: ReconciliationKPIs["state"] = "sem dados";
  if (batchByProvider.size > 0 || ext.length > 0) {
    state =
      Math.abs(variance) / Math.max(externalTotal, 0.001) < 0.1
        ? "reconciliado"
        : "divergência";
  }

  // Daily aggregation
  const dailyMap = new Map<string, { internal: number; external: number }>();
  for (const r of ext) {
    const d = (r.period_start as string).slice(0, 10);
    const entry = dailyMap.get(d) ?? { internal: 0, external: 0 };
    entry.external += Number(r.raw_calculated_cost_usd ?? r.actual_cost_usd ?? 0);
    dailyMap.set(d, entry);
  }
  for (const r of int) {
    const d = (r.created_at as string).slice(0, 10);
    const entry = dailyMap.get(d) ?? { internal: 0, external: 0 };
    entry.internal += resolveCallCost(r);
    dailyMap.set(d, entry);
  }
  const daily: DailyPoint[] = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      internal: Number(v.internal.toFixed(4)),
      external: Number(v.external.toFixed(4)),
      variance: Number((v.external - v.internal).toFixed(4)),
    }));

  // Provider breakdown — external from batch dashboard totals
  const provMap = new Map<string, { internal: number }>();
  for (const r of int) {
    const entry = provMap.get(r.provider) ?? { internal: 0 };
    entry.internal += resolveCallCost(r);
    provMap.set(r.provider, entry);
  }

  // Merge providers from both internal logs and batches
  const allProviders = new Set([...provMap.keys(), ...batchByProvider.keys()]);
  const byProvider: ProviderBreakdown[] = [...allProviders].map((provider) => {
    const intData = provMap.get(provider);
    const batchData = batchByProvider.get(provider);
    const ext = batchData?.dashboardTotal ?? 0;
    const intVal = intData?.internal ?? 0;
    return {
      provider,
      external: Number(ext.toFixed(4)),
      internal: Number(intVal.toFixed(4)),
      variance: Number((ext - intVal).toFixed(4)),
      displayedRowSum: batchData?.displayedTotal != null ? Number(batchData.displayedTotal.toFixed(4)) : null,
      roundingDelta: batchData?.roundingDelta != null ? Number(batchData.roundingDelta.toFixed(4)) : null,
      source: batchData ? "batch" as const : "row-sum" as const,
    };
  });

  // Actor/model breakdown
  const actorMap = new Map<
    string,
    { provider: string; external: number; internal: number }
  >();
  for (const r of ext) {
    const key = r.actor_or_model ?? "(sem detalhe)";
    const entry = actorMap.get(key) ?? {
      provider: r.provider,
      external: 0,
      internal: 0,
    };
    entry.external += Number(r.actual_cost_usd ?? 0);
    actorMap.set(key, entry);
  }
  for (const r of int) {
    const key = r.actor ?? "(sem detalhe)";
    const entry = actorMap.get(key) ?? {
      provider: r.provider,
      external: 0,
      internal: 0,
    };
    entry.internal += resolveCallCost(r);
    actorMap.set(key, entry);
  }
  const byActor: ActorBreakdown[] = [...actorMap.entries()].map(
    ([actor_or_model, v]) => ({
      actor_or_model,
      provider: v.provider,
      external: Number(v.external.toFixed(4)),
      internal: Number(v.internal.toFixed(4)),
      variance: Number((v.external - v.internal).toFixed(4)),
    }),
  );

  // Batch summaries — enrich with internal totals for the same provider+period
  const batches: BatchSummary[] = (batchRows ?? []).map((b) => {
    // Sum internal costs for same provider in batch period
    const bStart = new Date(b.period_start as string).getTime();
    const bEnd = new Date(b.period_end as string).getTime();
    let intTotal = 0;
    for (const r of int) {
      if (r.provider !== b.provider) continue;
      const t = new Date(r.created_at as string).getTime();
      if (t >= bStart && t <= bEnd) {
        intTotal += resolveCallCost(r);
      }
    }
    return {
      id: b.id,
      provider: b.provider,
      period_start: b.period_start as string,
      period_end: b.period_end as string,
      currency: b.currency,
      dashboard_total: Number(b.dashboard_total_actual_cost_usd ?? 0),
      raw_total: b.imported_total_raw_cost_usd != null ? Number(b.imported_total_raw_cost_usd) : null,
      displayed_total: b.imported_total_displayed_cost_usd != null ? Number(b.imported_total_displayed_cost_usd) : null,
      rounding_delta: b.rounding_delta_usd != null ? Number(b.rounding_delta_usd) : null,
      raw_delta: b.raw_delta_usd != null ? Number(b.raw_delta_usd) : null,
      reconciliation_status: b.reconciliation_status,
      source_note: b.source_note ?? null,
      internal_total: Number(intTotal.toFixed(4)),
      created_at: b.created_at as string,
    };
  });

  return {
    kpis: { externalTotal, internalTotal, variance, variancePct, state },
    daily,
    byProvider,
    byActor,
    batches,
  };
}

/* ── Single row insert ─────────────────────────────────────────────── */

export interface BillingImportInput {
  provider: string;
  source: string;
  period_start: string;
  period_end: string;
  service?: string;
  service_group?: string;
  label?: string;
  actor_or_model?: string;
  metric_name?: string;
  quantity?: number;
  unit_price_usd?: number;
  raw_calculated_cost_usd?: number;
  displayed_cost_usd?: number;
  actual_cost_usd: number;
  reconciliation_note?: string;
  notes?: string;
  batch_id?: string;
}

export async function insertBillingImportRow(input: BillingImportInput) {
  const { error } = await supabaseAdmin
    .from("provider_billing_imports")
    .insert({
      provider: input.provider,
      source: input.source,
      period_start: input.period_start,
      period_end: input.period_end,
      service: input.service ?? null,
      service_group: input.service_group ?? null,
      label: input.label ?? null,
      actor_or_model: input.actor_or_model ?? null,
      metric_name: input.metric_name ?? null,
      quantity: input.quantity ?? null,
      unit_price_usd: input.unit_price_usd ?? null,
      raw_calculated_cost_usd: input.raw_calculated_cost_usd ?? null,
      displayed_cost_usd: input.displayed_cost_usd ?? null,
      actual_cost_usd: input.actual_cost_usd,
      reconciliation_note: input.reconciliation_note ?? null,
      notes: input.notes ?? null,
      batch_id: input.batch_id ?? null,
    });
  if (error) throw new Error(error.message);
  return { success: true };
}

/* ── Batch insert ──────────────────────────────────────────────────── */

export interface BatchRowInput {
  actor_or_model?: string;
  label?: string;
  metric_name?: string;
  quantity?: number;
  unit_price_usd?: number;
  raw_calculated_cost_usd?: number;
  displayed_cost_usd?: number;
  actual_cost_usd: number;
  reconciliation_note?: string;
  notes?: string;
}

export interface BatchInput {
  provider: string;
  period_start: string;
  period_end: string;
  currency?: string;
  service_group?: string;
  dashboard_total_actual_cost_usd: number;
  source_note?: string;
  rows: BatchRowInput[];
}

function computeReconciliationStatus(
  dashTotal: number,
  rawTotal: number | null,
  displayedTotal: number | null,
): string {
  if (rawTotal == null && displayedTotal == null) return "pending";
  const rawDelta = rawTotal != null ? Math.abs(dashTotal - rawTotal) : Infinity;
  const displayedDelta =
    displayedTotal != null ? Math.abs(dashTotal - displayedTotal) : 0;
  if (rawDelta < 0.01 && displayedDelta < 0.001) return "OK";
  if (rawDelta < 0.01 && displayedDelta >= 0.001) return "Rounding difference";
  return "Needs review";
}

export async function insertBillingBatch(input: BatchInput) {
  const rawTotal =
    input.rows.reduce(
      (s, r) => s + (r.raw_calculated_cost_usd ?? 0),
      0,
    ) || null;
  const displayedTotal =
    input.rows.reduce(
      (s, r) => s + (r.displayed_cost_usd ?? 0),
      0,
    ) || null;

  const roundingDelta =
    displayedTotal != null
      ? input.dashboard_total_actual_cost_usd - displayedTotal
      : null;
  const rawDeltaVal =
    rawTotal != null
      ? input.dashboard_total_actual_cost_usd - rawTotal
      : null;

  const status = computeReconciliationStatus(
    input.dashboard_total_actual_cost_usd,
    rawTotal,
    displayedTotal,
  );

  // Insert batch
  const { data: batchData, error: batchErr } = await supabaseAdmin
    .from("provider_billing_import_batches")
    .insert({
      provider: input.provider,
      period_start: input.period_start,
      period_end: input.period_end,
      currency: input.currency ?? "USD",
      dashboard_total_actual_cost_usd: input.dashboard_total_actual_cost_usd,
      imported_total_raw_cost_usd: rawTotal,
      imported_total_displayed_cost_usd: displayedTotal,
      rounding_delta_usd: roundingDelta,
      raw_delta_usd: rawDeltaVal,
      reconciliation_status: status,
      source_note: input.source_note ?? null,
    })
    .select("id")
    .single();

  if (batchErr || !batchData) {
    throw new Error(batchErr?.message ?? "Erro ao criar batch");
  }

  const batchId = batchData.id;

  // Insert rows linked to batch
  if (input.rows.length > 0) {
    const rows = input.rows.map((r) => ({
      provider: input.provider,
      source: "dashboard" as const,
      period_start: input.period_start,
      period_end: input.period_end,
      service_group: input.service_group ?? null,
      actor_or_model: r.actor_or_model ?? null,
      label: r.label ?? null,
      metric_name: r.metric_name ?? null,
      quantity: r.quantity ?? null,
      unit_price_usd: r.unit_price_usd ?? null,
      raw_calculated_cost_usd: r.raw_calculated_cost_usd ?? null,
      displayed_cost_usd: r.displayed_cost_usd ?? null,
      actual_cost_usd: r.actual_cost_usd,
      reconciliation_note: r.reconciliation_note ?? null,
      notes: r.notes ?? null,
      batch_id: batchId,
    }));
    const { error: rowsErr } = await supabaseAdmin
      .from("provider_billing_imports")
      .insert(rows);
    if (rowsErr) throw new Error(rowsErr.message);
  }

  return {
    success: true,
    batch_id: batchId,
    reconciliation_status: status,
    rounding_delta_usd: roundingDelta,
    raw_delta_usd: rawDeltaVal,
  };
}