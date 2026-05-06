/**
 * Billing reconciliation queries.
 *
 * Compares external billing imports (provider_billing_imports) against
 * internal logged costs (provider_call_logs) for a given period.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
}

export interface ActorBreakdown {
  actor_or_model: string;
  provider: string;
  external: number;
  internal: number;
  variance: number;
}

export interface ReconciliationData {
  kpis: ReconciliationKPIs;
  daily: DailyPoint[];
  byProvider: ProviderBreakdown[];
  byActor: ActorBreakdown[];
}

export async function getReconciliationData(
  periodDays: number,
): Promise<ReconciliationData> {
  const since = new Date(Date.now() - periodDays * 86_400_000).toISOString();

  // External billing
  const { data: extRows } = await supabaseAdmin
    .from("provider_billing_imports")
    .select("provider, actor_or_model, actual_cost_usd, period_start")
    .gte("period_start", since);

  // Internal logged costs
  const { data: intRows } = await supabaseAdmin
    .from("provider_call_logs")
    .select("provider, actor, estimated_cost_usd, created_at")
    .gte("created_at", since);

  const ext = extRows ?? [];
  const int = intRows ?? [];

  // KPIs
  const externalTotal = ext.reduce((s, r) => s + Number(r.actual_cost_usd ?? 0), 0);
  const internalTotal = int.reduce((s, r) => s + Number(r.estimated_cost_usd ?? 0), 0);
  const variance = externalTotal - internalTotal;
  const variancePct = externalTotal > 0 ? (variance / externalTotal) * 100 : null;

  let state: ReconciliationKPIs["state"] = "sem dados";
  if (ext.length > 0) {
    state = Math.abs(variance) / Math.max(externalTotal, 0.001) < 0.1
      ? "reconciliado"
      : "divergência";
  }

  // Daily aggregation
  const dailyMap = new Map<string, { internal: number; external: number }>();

  for (const r of ext) {
    const d = (r.period_start as string).slice(0, 10);
    const entry = dailyMap.get(d) ?? { internal: 0, external: 0 };
    entry.external += Number(r.actual_cost_usd ?? 0);
    dailyMap.set(d, entry);
  }
  for (const r of int) {
    const d = (r.created_at as string).slice(0, 10);
    const entry = dailyMap.get(d) ?? { internal: 0, external: 0 };
    entry.internal += Number(r.estimated_cost_usd ?? 0);
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

  // Provider breakdown
  const provMap = new Map<string, { external: number; internal: number }>();
  for (const r of ext) {
    const p = r.provider;
    const entry = provMap.get(p) ?? { external: 0, internal: 0 };
    entry.external += Number(r.actual_cost_usd ?? 0);
    provMap.set(p, entry);
  }
  for (const r of int) {
    const p = r.provider;
    const entry = provMap.get(p) ?? { external: 0, internal: 0 };
    entry.internal += Number(r.estimated_cost_usd ?? 0);
    provMap.set(p, entry);
  }
  const byProvider: ProviderBreakdown[] = [...provMap.entries()].map(([provider, v]) => ({
    provider,
    external: Number(v.external.toFixed(4)),
    internal: Number(v.internal.toFixed(4)),
    variance: Number((v.external - v.internal).toFixed(4)),
  }));

  // Actor/model breakdown
  const actorMap = new Map<string, { provider: string; external: number; internal: number }>();
  for (const r of ext) {
    const key = r.actor_or_model ?? "(sem detalhe)";
    const entry = actorMap.get(key) ?? { provider: r.provider, external: 0, internal: 0 };
    entry.external += Number(r.actual_cost_usd ?? 0);
    actorMap.set(key, entry);
  }
  for (const r of int) {
    const key = r.actor ?? "(sem detalhe)";
    const entry = actorMap.get(key) ?? { provider: r.provider, external: 0, internal: 0 };
    entry.internal += Number(r.estimated_cost_usd ?? 0);
    actorMap.set(key, entry);
  }
  const byActor: ActorBreakdown[] = [...actorMap.entries()].map(([actor_or_model, v]) => ({
    actor_or_model,
    provider: v.provider,
    external: Number(v.external.toFixed(4)),
    internal: Number(v.internal.toFixed(4)),
    variance: Number((v.external - v.internal).toFixed(4)),
  }));

  return { kpis: { externalTotal, internalTotal, variance, variancePct, state }, daily, byProvider, byActor };
}

export interface BillingImportInput {
  provider: string;
  source: string;
  period_start: string;
  period_end: string;
  service?: string;
  actor_or_model?: string;
  metric_name?: string;
  quantity?: number;
  unit_price_usd?: number;
  actual_cost_usd: number;
  notes?: string;
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
      actor_or_model: input.actor_or_model ?? null,
      metric_name: input.metric_name ?? null,
      quantity: input.quantity ?? null,
      unit_price_usd: input.unit_price_usd ?? null,
      actual_cost_usd: input.actual_cost_usd,
      notes: input.notes ?? null,
    });
  if (error) throw new Error(error.message);
  return { success: true };
}