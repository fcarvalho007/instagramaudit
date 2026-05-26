/**
 * Secção 2 — Métricas operacionais.
 *
 * 4 KPICards size lg, cada um com tooltip "i" para explicar a fórmula.
 * Composição local (não toca em `KPICard` partilhado): cartão + eyebrow com
 * info tooltip + valor mono grande + delta + sub.
 *
 * O KPI de custo médio mostra delta `↓ -$0.04` em verde porque despesa a
 * baixar é positivo — não usar o `direction: "down"` padrão do `AdminStat`.
 */

import { type ReactNode } from "react";
import { AdminCard } from "../admin-card";
import { AdminInfoTooltip } from "../admin-info-tooltip";
import { type AdminAccent, ACCENT_500 } from "../admin-tokens";
import { AdminSectionHeader } from "../admin-section-header";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin/fetch";

interface MetricsApi {
  success: boolean;
  total_30d: number;
  delivered_30d: number;
  failed_30d: number;
  in_progress_30d: number;
  success_rate_pct: number | null;
  avg_delivery_minutes: number | null;
  avg_cost_usd: number | null;
}

export function MetricsSection() {
  const { data } = useQuery<MetricsApi>({
    queryKey: ["admin", "report-requests", "metrics"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/report-requests/metrics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  const delivered = data?.delivered_30d ?? 0;
  const total = data?.total_30d ?? 0;
  const avgMin = data?.avg_delivery_minutes;
  const successPct = data?.success_rate_pct;
  const avgCost = data?.avg_cost_usd;

  function fmtMinutes(v: number | null | undefined): string {
    if (v == null) return "—";
    if (v < 1) return `${Math.round(v * 60)}s`;
    const m = Math.floor(v);
    const s = Math.round((v - m) * 60);
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Métricas operacionais"
        subtitle="últimos 30 dias"
        accent="revenue"
        info="Volume e desempenho do pipeline de relatórios nos últimos 30 dias."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ReportKpi
          accent="revenue"
          eyebrow="Entregues · 30d"
          info="Pedidos com email entregue ao cliente nos últimos 30 dias."
          value={String(delivered)}
          sub={`${total} pedidos totais`}
        />
        <ReportKpi
          accent="info"
          eyebrow="Tempo médio · entrega"
          info="Tempo médio do pedido até email entregue (apenas pedidos entregues)."
          value={fmtMinutes(avgMin)}
          sub="pedido → email"
        />
        <ReportKpi
          accent="revenue"
          eyebrow="Taxa de sucesso"
          info="Percentagem de pedidos entregues sobre o total na janela."
          value={successPct != null ? `${successPct.toFixed(1)}%` : "—"}
          sub={`${data?.failed_30d ?? 0} falhas`}
        />
        <ReportKpi
          accent="revenue-alt"
          eyebrow="Custo médio · pedido"
          info="Soma de custos de providers (Apify+OpenAI) na janela ÷ nº pedidos."
          value={avgCost != null ? `$${avgCost.toFixed(3)}` : "—"}
          sub="apify + openai"
        />
      </div>
    </section>
  );
}

interface ReportKpiProps {
  accent: AdminAccent;
  eyebrow: string;
  info: string;
  value: ReactNode;
  sub?: ReactNode;
}

function ReportKpi({ accent, eyebrow, info, value, sub }: ReportKpiProps) {
  return (
    <AdminCard
      variant="accent-left"
      accent={accent}
      className="!p-4"
    >
      <div
        className="mb-2 flex items-center gap-1.5"
        style={{ color: ACCENT_500[accent] }}
      >
        <span className="admin-eyebrow" style={{ color: "inherit" }}>
          {eyebrow}
        </span>
        <AdminInfoTooltip label={info} />
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono font-medium tracking-tight text-admin-text-primary"
          style={{ fontSize: "2.25rem", lineHeight: 1.1, letterSpacing: "-0.02em" }}
        >
          {value}
        </span>
      </div>
      {sub ? (
        <p className="mt-2 text-[12px] text-admin-text-tertiary">{sub}</p>
      ) : null}
    </AdminCard>
  );
}