/**
 * Secção 1 — Pipeline operacional.
 *
 * Lê estado real do pipeline em `/api/admin/report-requests/pipeline`.
 */

import { useQuery } from "@tanstack/react-query";
import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { adminFetch } from "@/lib/admin/fetch";
import type { AdminPeriod } from "../period-select";

interface PipelineApi {
  success: boolean;
  phases: { snapshot: number; email_submitted: number; pdf: number; email: number };
  failures_to_recover: number;
  avg_total_seconds: number | null;
  success_rate_pct: number | null;
  avg_cost_usd: number | null;
  total_window: number;
  window_days: number;
}

function formatSeconds(s: number | null): string {
  if (s == null) return "—";
  const mins = Math.floor(s / 60);
  const secs = Math.round(s % 60);
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

export function PipelineSection({ period }: { period: AdminPeriod }) {
  const { data } = useQuery<PipelineApi>({
    queryKey: ["admin", "report-requests", "pipeline", period],
    queryFn: async () => {
      const res = await adminFetch(
        `/api/admin/report-requests/pipeline?period=${period}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 15_000,
  });

  const phases = data?.phases ?? { snapshot: 0, email_submitted: 0, pdf: 0, email: 0 };
  const failures = data?.failures_to_recover ?? 0;

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Pipeline operacional"
        subtitle="funil cumulativo — Fase 1 é o total de análises geradas; fases seguintes são subconjuntos"
        accent="signal"
        info="Funil cumulativo: Fase 1 = total de análises na janela (igual ao KPI 'Pediram análise'). Fases 2-4 = progressão até entrega por email."
      />
      <AdminCard className="!p-7">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PhaseCard accent="#3772E5" eyebrow="Fase 1" label="Análise gerada" value={phases.snapshot} sub="total na janela" />
          <PhaseCard accent="#7664E4" eyebrow="Fase 2" label="Email submetido" value={phases.email_submitted} sub="lead criado" />
          <PhaseCard accent="#D85A30" eyebrow="Fase 3" label="PDF gerado" value={phases.pdf} sub="aguarda envio" />
          <PhaseCard accent="#1D9E75" eyebrow="Fase 4" label="Email entregue" value={phases.email} sub="ciclo completo" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 border-t border-admin-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <AggregateStat
            eyebrow="Taxa de sucesso"
            value={data?.success_rate_pct != null ? `${data.success_rate_pct.toFixed(1)}%` : "—"}
            sub={`${data?.total_window ?? 0} análises (${period})`}
            valueColor="rgb(var(--admin-revenue-700))"
          />
          <AggregateStat
            eyebrow="A recuperar"
            value={String(failures)}
            sub="falhas a investigar"
            valueColor={failures > 0 ? "rgb(var(--admin-danger-500))" : undefined}
            divider
          />
          <AggregateStat
            eyebrow="Custo médio"
            value={data?.avg_cost_usd != null ? `$${data.avg_cost_usd.toFixed(3)}` : "—"}
            sub="scrapecreators (apify fallback) + openai"
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
}: {
  accent: string;
  eyebrow: string;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div
      className="relative bg-admin-canvas px-6 py-5"
      style={{ borderLeft: `4px solid ${accent}`, borderRadius: "0 12px 12px 0" }}
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
    <div className={divider ? "sm:border-l sm:border-admin-border sm:pl-5" : ""}>
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
      <p className="mt-1 text-[12px] text-admin-text-tertiary">{sub}</p>
    </div>
  );
}