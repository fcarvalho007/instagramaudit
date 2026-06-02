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
import type { AdminPeriod } from "../period-select";

interface MetricsApi {
  success: boolean;
  total_analyses: number;
  with_unlock: number;
  unlock_rate_pct: number | null;
  delivered: number;
  failed: number;
  in_progress: number;
  success_rate_pct: number | null;
  avg_delivery_minutes: number | null;
  avg_cost_usd: number | null;
  total_cost_usd?: number | null;
  apify_cost_usd?: number | null;
  lab_cost_usd?: number | null;
  window_days: number;
}

export function MetricsSection({ period }: { period: AdminPeriod }) {
  const { data } = useQuery<MetricsApi>({
    queryKey: ["admin", "report-requests", "metrics", period],
    queryFn: async () => {
      const res = await adminFetch(
        `/api/admin/report-requests/metrics?period=${period}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  const delivered = data?.delivered ?? 0;
  const total = data?.total_analyses ?? 0;
  const withUnlock = data?.with_unlock ?? 0;
  const unlockRate = data?.unlock_rate_pct;
  const avgCost = data?.avg_cost_usd;
  const totalCost = data?.total_cost_usd ?? null;
  const apifyCost = data?.apify_cost_usd ?? null;
  const labCost = data?.lab_cost_usd ?? null;

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Métricas operacionais"
        subtitle={`janela ${period}`}
        accent="revenue"
        info="Análises geradas, taxa de unlock por email e desempenho do pipeline na janela selecionada."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ReportKpi
          accent="revenue"
          eyebrow="Pediram análise"
          info="Total de snapshots gerados na janela (cada análise = 1 relatório real, fonte: `analysis_snapshots`)."
          value={String(total)}
          sub={`${delivered} com PDF entregue por email`}
        />
        <ReportKpi
          accent="info"
          eyebrow="Submeteram email"
          info="Análises em que o utilizador preencheu o lead magnet (email) para receber o PDF."
          value={`${withUnlock}`}
          sub={unlockRate != null ? `${unlockRate.toFixed(1)}% de conversão` : "—"}
        />
        <ReportKpi
          accent="revenue-alt"
          eyebrow="Custo médio · análise"
          info="Custo de produção (Apify + OpenAI das análises públicas e enriquecimento) ÷ análises fresh. Exclui Apify Lab/I&D e refreshes — alinha com cost-per-lead em /admin/visao-geral."
          value={avgCost != null ? `$${avgCost.toFixed(3)}` : "—"}
          sub={
            totalCost != null && apifyCost != null
              ? `Produção $${totalCost.toFixed(3)} · Apify $${apifyCost.toFixed(3)}${
                  labCost != null && labCost > 0
                    ? ` · Lab $${labCost.toFixed(3)} (excluído)`
                    : ""
                }`
              : "Produção por análise fresh"
          }
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