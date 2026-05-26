/**
 * Secção "Reconciliação de custos" — compara custos externos (billing imports)
 * com custos internos (provider_call_logs). Includes batch-level summaries
 * with rounding-aware reconciliation status.
 */

import { useQuery } from "@tanstack/react-query";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { KPICard } from "../kpi-card";
import { SectionError, SectionSkeleton } from "../section-state";
import { adminFetch } from "@/lib/admin/fetch";
import type { AdminPeriod } from "../period-select";

/* ── Types ─────────────────────────────────────────────────────────── */

interface ReconciliationKPIs {
  externalTotal: number;
  internalTotal: number;
  variance: number;
  variancePct: number | null;
  state: "sem dados" | "reconciliado" | "divergência";
}

interface DailyPoint {
  date: string;
  internal: number;
  external: number;
  variance: number;
}

interface ProviderBreakdown {
  provider: string;
  external: number;
  internal: number;
  variance: number;
}

interface ActorBreakdown {
  actor_or_model: string;
  provider: string;
  external: number;
  internal: number;
  variance: number;
}

interface BatchSummary {
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

interface ReconciliationData {
  kpis: ReconciliationKPIs;
  daily: DailyPoint[];
  byProvider: ProviderBreakdown[];
  byActor: ActorBreakdown[];
  batches: BatchSummary[];
}

/* ── Helpers ───────────────────────────────────────────────────────── */

const PERIOD_DAYS: Record<AdminPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  ytd: 365,
};

function fmt(v: number, decimals = 4): string {
  return `$${v.toFixed(decimals)}`;
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    OK: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
    "Rounding difference": { bg: "bg-amber-500/15", text: "text-amber-400" },
    "Needs review": { bg: "bg-red-500/15", text: "text-red-400" },
    pending: { bg: "bg-neutral-500/15", text: "text-neutral-400" },
  };
  const s = map[status] ?? map.pending!;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[12px] font-medium ${s.bg} ${s.text}`}
    >
      {status}
    </span>
  );
}

/* ── Component ─────────────────────────────────────────────────────── */

export function ReconciliationSection({ period }: { period: AdminPeriod }) {
  const days = PERIOD_DAYS[period] ?? 30;


  const { data, isLoading, error } = useQuery<ReconciliationData>({
    queryKey: ["billing-reconciliation", days],
    queryFn: async () => {
      const res = await adminFetch(
        `/api/admin/billing-reconciliation?days=${days}`,
      );
      if (!res.ok) throw new Error("Erro ao carregar reconciliação");
      return res.json();
    },
  });

  if (isLoading) return <SectionSkeleton />;
  if (error || !data) return <SectionError error={error} />;

  const { kpis, daily, byProvider, byActor, batches } = data;

  return (
    <section className="space-y-6">
      <AdminSectionHeader
        title="Reconciliação de custos"
        subtitle="Comparação entre custos reais dos fornecedores e custos registados internamente"
        accent="expense"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          eyebrow="Custo real externo"
          value={fmt(kpis.externalTotal, 2)}
        />
        <KPICard
          eyebrow="Custo interno registado"
          value={fmt(kpis.internalTotal, 2)}
        />
        <KPICard
          eyebrow="Diferença"
          value={fmt(kpis.variance, 2)}
          sub={
            kpis.variancePct != null
              ? `${kpis.variancePct.toFixed(1)}%`
              : "—"
          }
        />
        <KPICard eyebrow="Estado" value={kpis.state} />
      </div>

      {/* Batch summary table */}
      {batches.length > 0 && (
        <AdminCard>
          <p className="text-eyebrow-sm mb-3">
            Importações por batch (dashboard)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-foreground-muted border-b border-border-subtle">
                  <th className="pb-2 pr-3">Provider</th>
                  <th className="pb-2 pr-3">Período</th>
                  <th className="pb-2 pr-3 text-right">Dashboard total</th>
                  <th className="pb-2 pr-3 text-right">Raw total</th>
                  <th className="pb-2 pr-3 text-right">Displayed total</th>
                  <th className="pb-2 pr-3 text-right">Δ rounding</th>
                  <th className="pb-2 pr-3 text-right">Δ raw</th>
                  <th className="pb-2 pr-3 text-right">Interno</th>
                  <th className="pb-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-border-subtle/50"
                  >
                    <td className="py-1.5 pr-3 font-medium">{b.provider}</td>
                    <td className="py-1.5 pr-3 text-foreground-muted">
                      {b.period_start.slice(0, 10)} → {b.period_end.slice(0, 10)}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono">
                      {fmt(b.dashboard_total, 2)}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono">
                      {b.raw_total != null ? fmt(b.raw_total, 4) : "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono">
                      {b.displayed_total != null
                        ? fmt(b.displayed_total, 2)
                        : "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono">
                      {b.rounding_delta != null
                        ? fmt(b.rounding_delta, 2)
                        : "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono">
                      {b.raw_delta != null ? fmt(b.raw_delta, 4) : "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono">
                      {fmt(b.internal_total, 4)}
                    </td>
                    <td className="py-1.5">
                      {statusBadge(b.reconciliation_status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Rounding explanation */}
          {batches.some(
            (b) => b.reconciliation_status === "Rounding difference",
          ) && (
            <p className="mt-3 text-[12px] text-foreground-muted/70 leading-relaxed">
              ⓘ Diferença de arredondamento: o dashboard do fornecedor
              arredonda cada linha individualmente antes de somar. O total
              raw (calculado a partir de quantidade × preço unitário sem
              arredondamento) reconcilia com o valor do dashboard (Δ raw
              &lt; $0.01). A diferença aparente no total displayed é
              esperada e não representa uma discrepância real.
            </p>
          )}
        </AdminCard>
      )}

      {/* Chart */}
      {daily.length > 0 && (
        <AdminCard>
          <p className="text-eyebrow-sm mb-3">
            Custo diário — interno vs externo
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={daily}
              margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
              />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => `$${v}`}
              />
              <Tooltip formatter={(v: number) => `$${v.toFixed(4)}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="internal"
                name="Interno"
                stroke="var(--accent-cyan)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="external"
                name="Externo"
                stroke="var(--accent-gold)"
                strokeWidth={2}
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        </AdminCard>
      )}

      {/* Provider breakdown */}
      {byProvider.length > 0 && (
        <AdminCard>
          <p className="text-eyebrow-sm mb-3">Por fornecedor</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground-muted border-b border-border-subtle">
                  <th className="pb-2">Provider</th>
                  <th className="pb-2 text-right">Externo</th>
                  <th className="pb-2 text-right">Interno</th>
                  <th className="pb-2 text-right">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {byProvider.map((r) => (
                  <tr
                    key={r.provider}
                    className="border-b border-border-subtle/50"
                  >
                    <td className="py-1.5 font-medium">{r.provider}</td>
                    <td className="py-1.5 text-right font-mono text-xs">
                      {fmt(r.external)}
                    </td>
                    <td className="py-1.5 text-right font-mono text-xs">
                      {fmt(r.internal)}
                    </td>
                    <td className="py-1.5 text-right font-mono text-xs">
                      {fmt(r.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {/* Actor/model breakdown */}
      {byActor.length > 0 && (
        <AdminCard>
          <p className="text-eyebrow-sm mb-3">Por actor / modelo</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground-muted border-b border-border-subtle">
                  <th className="pb-2">Actor / modelo</th>
                  <th className="pb-2">Provider</th>
                  <th className="pb-2 text-right">Externo</th>
                  <th className="pb-2 text-right">Interno</th>
                  <th className="pb-2 text-right">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {byActor.map((r) => (
                  <tr
                    key={r.actor_or_model}
                    className="border-b border-border-subtle/50"
                  >
                    <td className="py-1.5 font-medium text-xs">
                      {r.actor_or_model}
                    </td>
                    <td className="py-1.5 text-xs text-foreground-muted">
                      {r.provider}
                    </td>
                    <td className="py-1.5 text-right font-mono text-xs">
                      {fmt(r.external)}
                    </td>
                    <td className="py-1.5 text-right font-mono text-xs">
                      {fmt(r.internal)}
                    </td>
                    <td className="py-1.5 text-right font-mono text-xs">
                      {fmt(r.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

    </section>
  );
}
