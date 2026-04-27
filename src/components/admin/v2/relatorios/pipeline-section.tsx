/**
 * Secção 1 — Pipeline operacional.
 *
 * Cartão único com 4 fases horizontais (Pedido → Análise Apify → PDF → Email)
 * + rodapé com 4 stats agregados (tempo médio, taxa de entrega, falhas,
 * custo médio).
 *
 * Cada fase é um cartão interno warm com border-left colorido e um indicador
 * de saúde pulsante no canto inferior direito.
 */

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { ADMIN_LITERAL } from "../admin-tokens";
import {
  MOCK_PIPELINE_AGGREGATES,
  MOCK_PIPELINE_PHASES,
  type ReportPipelineHealth,
} from "@/lib/admin/mock-data";

const HEALTH_COLOR: Record<ReportPipelineHealth, string> = {
  ok: ADMIN_LITERAL.healthOk,
  warn: ADMIN_LITERAL.healthWarn,
  critical: ADMIN_LITERAL.healthCritical,
};

const HEALTH_LABEL: Record<ReportPipelineHealth, string> = {
  ok: "operacional",
  warn: "backlog",
  critical: "falha crítica",
};

export function PipelineSection() {
  const aggregates = MOCK_PIPELINE_AGGREGATES;
  const failuresCritical = aggregates.failuresToRecover.value > 0;

  return (
    <section>
      <AdminSectionHeader
        title="Pipeline operacional"
        subtitle="do pedido à entrega"
        accent="signal"
        info="Cada relatório passa por 4 fases: pedido recebido → análise Apify → PDF gerado → email entregue. Fases bloqueadas indicam intervenção manual necessária."
      />

      <AdminCard className="!p-7">
        {/* Fases */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MOCK_PIPELINE_PHASES.map((phase) => (
            <PhaseCard
              key={phase.id}
              accent={ADMIN_LITERAL[phase.accentKey]}
              eyebrow={phase.eyebrow}
              label={phase.label}
              value={phase.value}
              sub={phase.sub}
              health={phase.health}
            />
          ))}
        </div>

        {/* Rodapé · stats agregados */}
        <div className="mt-6 grid grid-cols-1 gap-5 border-t border-admin-border pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <AggregateStat
            eyebrow={aggregates.avgTotalTime.eyebrow}
            value={aggregates.avgTotalTime.value}
            sub={aggregates.avgTotalTime.sub}
          />
          <AggregateStat
            eyebrow={aggregates.successRate.eyebrow}
            value={aggregates.successRate.value}
            sub={aggregates.successRate.sub}
            valueColor="rgb(var(--admin-revenue-700))"
            divider
          />
          <AggregateStat
            eyebrow={aggregates.failuresToRecover.eyebrow}
            value={String(aggregates.failuresToRecover.value)}
            sub={aggregates.failuresToRecover.sub}
            valueColor={
              failuresCritical ? "rgb(var(--admin-danger-500))" : undefined
            }
            divider
          />
          <AggregateStat
            eyebrow={aggregates.avgCost.eyebrow}
            value={aggregates.avgCost.value}
            sub={aggregates.avgCost.sub}
            divider
          />
        </div>
      </AdminCard>
    </section>
  );
}

function PhaseCard({
  accent,
  eyebrow,
  label,
  value,
  sub,
  health,
}: {
  accent: string;
  eyebrow: string;
  label: string;
  value: number;
  sub: string;
  health: ReportPipelineHealth;
}) {
  return (
    <div
      className="relative bg-admin-canvas px-6 py-5"
      style={{
        borderLeft: `4px solid ${accent}`,
        borderRadius: "0 12px 12px 0",
      }}
    >
      <p className="admin-eyebrow mb-1.5">{eyebrow}</p>
      <p className="m-0 text-[13px] text-admin-text-secondary">{label}</p>
      <p
        className="mt-3 font-mono font-medium leading-none text-admin-text-primary"
        style={{ fontSize: "32px", letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      <p className="mt-2 text-[12px] text-admin-text-tertiary">{sub}</p>

      <span
        aria-label={`Estado ${HEALTH_LABEL[health]}`}
        title={HEALTH_LABEL[health]}
        className="admin-pulse-dot absolute bottom-3 right-3 block h-2 w-2 rounded-full"
        style={{ backgroundColor: HEALTH_COLOR[health] }}
      />
    </div>
  );
}

function AggregateStat({
  eyebrow,
  value,
  sub,
  valueColor,
  divider,
}: {
  eyebrow: string;
  value: string;
  sub: string;
  valueColor?: string;
  divider?: boolean;
}) {
  return (
    <div
      className={
        divider
          ? "sm:border-l sm:border-admin-border sm:pl-5"
          : ""
      }
    >
      <p className="admin-eyebrow mb-2">{eyebrow}</p>
      <p
        className="m-0 font-mono font-medium leading-tight"
        style={{
          fontSize: "22px",
          letterSpacing: "-0.01em",
          color: valueColor ?? "rgb(var(--admin-neutral-900))",
        }}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-admin-text-tertiary">{sub}</p>
    </div>
  );
}