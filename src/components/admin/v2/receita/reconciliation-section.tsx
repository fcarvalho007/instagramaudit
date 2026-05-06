/**
 * Secção "Reconciliação de custos" — compara custos externos (billing imports)
 * com custos internos (provider_call_logs).
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { BillingImportForm } from "./billing-import-form";
import type { AdminPeriod } from "../period-select";

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

interface ReconciliationData {
  kpis: ReconciliationKPIs;
  daily: DailyPoint[];
  byProvider: ProviderBreakdown[];
  byActor: ActorBreakdown[];
}

const PERIOD_DAYS: Record<AdminPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  mtd: 30,
  ytd: 365,
};

function fmt(v: number): string {
  return `$${v.toFixed(3)}`;
}

export function ReconciliationSection({ period }: { period: AdminPeriod }) {
  const days = PERIOD_DAYS[period] ?? 30;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error } = useQuery<ReconciliationData>({
    queryKey: ["billing-reconciliation", days],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/billing-reconciliation?days=${days}`);
      if (!res.ok) throw new Error("Erro ao carregar reconciliação");
      return res.json();
    },
  });

  if (isLoading) return <SectionSkeleton lines={4} />;
  if (error || !data) return <SectionError message="Falha ao carregar reconciliação" />;

  const { kpis, daily, byProvider, byActor } = data;

  const stateColor =
    kpis.state === "reconciliado"
      ? "text-signal-success"
      : kpis.state === "divergência"
        ? "text-signal-warning"
        : "text-foreground-muted";

  return (
    <section className="space-y-6">
      <AdminSectionHeader
        title="Reconciliação de custos"
        subtitle="Comparação entre custos reais dos fornecedores e custos registados internamente"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Custo real externo" value={fmt(kpis.externalTotal)} />
        <KPICard label="Custo interno registado" value={fmt(kpis.internalTotal)} />
        <KPICard
          label="Diferença"
          value={fmt(kpis.variance)}
          sublabel={kpis.variancePct != null ? `${kpis.variancePct.toFixed(1)}%` : "—"}
        />
        <KPICard label="Estado" value={kpis.state} className={stateColor} />
      </div>

      {/* Chart */}
      {daily.length > 0 && (
        <AdminCard>
          <p className="text-eyebrow-sm mb-3">Custo diário — interno vs externo</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={daily} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} />
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
                  <tr key={r.provider} className="border-b border-border-subtle/50">
                    <td className="py-1.5 font-medium">{r.provider}</td>
                    <td className="py-1.5 text-right font-mono text-xs">{fmt(r.external)}</td>
                    <td className="py-1.5 text-right font-mono text-xs">{fmt(r.internal)}</td>
                    <td className="py-1.5 text-right font-mono text-xs">{fmt(r.variance)}</td>
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
                  <tr key={r.actor_or_model} className="border-b border-border-subtle/50">
                    <td className="py-1.5 font-medium text-xs">{r.actor_or_model}</td>
                    <td className="py-1.5 text-xs text-foreground-muted">{r.provider}</td>
                    <td className="py-1.5 text-right font-mono text-xs">{fmt(r.external)}</td>
                    <td className="py-1.5 text-right font-mono text-xs">{fmt(r.internal)}</td>
                    <td className="py-1.5 text-right font-mono text-xs">{fmt(r.variance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {/* Import form toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-sm text-accent-cyan hover:underline"
        >
          {showForm ? "Fechar formulário" : "+ Registar custo externo"}
        </button>
        {showForm && (
          <BillingImportForm
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["billing-reconciliation"] });
              setShowForm(false);
            }}
          />
        )}
      </div>
    </section>
  );
}