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
import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { AdminInfoTooltip } from "../admin-info-tooltip";
import { type AdminAccent, ACCENT_500 } from "../admin-tokens";
import { MOCK_REPORT_METRICS } from "@/lib/admin/mock-data";

type DeltaIntent = "good" | "bad";
type DeltaDirection = "up" | "down" | "down-good";

export function MetricsSection() {
  const m = MOCK_REPORT_METRICS;

  return (
    <section>
      <AdminSectionHeader
        title="Métricas operacionais"
        subtitle="últimos 30 dias"
        accent="revenue"
        info="Volume e desempenho do pipeline de relatórios nos últimos 30 dias."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ReportKpi
          accent="revenue"
          eyebrow={m.delivered.eyebrow}
          info={m.delivered.info}
          value={m.delivered.value}
          delta={m.delivered.delta}
          sub={m.delivered.sub}
        />
        <ReportKpi
          accent="info"
          eyebrow={m.avgTime.eyebrow}
          info={m.avgTime.info}
          value={m.avgTime.value}
          sub={m.avgTime.sub}
        />
        <ReportKpi
          accent="revenue"
          eyebrow={m.successRate.eyebrow}
          info={m.successRate.info}
          value={m.successRate.value}
          delta={m.successRate.delta}
          sub={m.successRate.sub}
        />
        <ReportKpi
          accent="revenue-alt"
          eyebrow={m.avgCost.eyebrow}
          info={m.avgCost.info}
          value={m.avgCost.value}
          delta={m.avgCost.delta}
          sub={m.avgCost.sub}
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
  delta?: { text: string; direction: DeltaDirection };
  sub?: ReactNode;
}

function ReportKpi({ accent, eyebrow, info, value, delta, sub }: ReportKpiProps) {
  const intent: DeltaIntent | null = delta
    ? delta.direction === "down"
      ? "bad"
      : "good" // up e down-good ambos verdes
    : null;

  const deltaCls =
    intent === "good"
      ? "text-admin-revenue-700"
      : intent === "bad"
      ? "text-admin-danger-500"
      : "";

  const arrow = !delta
    ? null
    : delta.direction === "up"
    ? "▲"
    : "▼";

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
        {delta ? (
          <span className={`text-xs ${deltaCls}`}>
            {arrow} {delta.text}
          </span>
        ) : null}
      </div>
      {sub ? (
        <p className="mt-2 text-[11px] text-admin-text-tertiary">{sub}</p>
      ) : null}
    </AdminCard>
  );
}