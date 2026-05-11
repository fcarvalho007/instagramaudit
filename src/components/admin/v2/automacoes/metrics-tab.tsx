/**
 * MetricsTab — KPIs e contagens read-only por fase.
 */

import { AdminCard } from "../admin-card";
import { EligibilitySummary } from "./eligibility-summary";
import type {
  AutomationFlow,
  AutomationFlowResponse,
} from "@/lib/admin/automation-flow-types";

interface Props {
  data: AutomationFlowResponse;
}

export function MetricsTab({ data }: Props) {
  const totalEligible = data.flows.reduce((a, f) => a + f.eligibleCount, 0);
  const totalInFlight = data.flows.reduce((a, f) => a + f.inFlightCount, 0);
  const total24h = data.flows.reduce((a, f) => a + (f.last24hCount ?? 0), 0);
  const totalFailures = data.flows.reduce(
    (a, f) => a + (f.failuresTotal ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <EligibilitySummary
        totalActive={data.totalActive}
        totalArchived={data.totalArchived}
        totalEligible={totalEligible}
        totalInFlight={totalInFlight}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AdminCard>
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-admin-text-tertiary">
            Atividade — últimas 24h
          </h3>
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tabular-nums leading-none text-admin-text-primary">
              {total24h}
            </span>
            <span className="text-[12px] text-admin-text-tertiary">
              eventos no total
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {data.flows.map((f) => (
              <li
                key={f.key}
                className="flex items-center justify-between text-[12px]"
              >
                <span className="text-admin-text-secondary">{f.title}</span>
                <span className="font-semibold tabular-nums text-admin-text-primary">
                  {f.last24hCount ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard>
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-admin-text-tertiary">
            Falhas recentes (30d)
          </h3>
          <div className="mb-3 flex items-baseline gap-2">
            <span
              className="text-[28px] font-semibold tabular-nums leading-none"
              style={{
                color:
                  totalFailures > 0
                    ? "rgb(var(--admin-signal-500))"
                    : undefined,
              }}
            >
              {totalFailures}
            </span>
            <span className="text-[12px] text-admin-text-tertiary">
              entregas com erro
            </span>
          </div>
          <p className="mb-3 text-[11px] text-admin-text-tertiary">
            Inclui apenas falhas de entrega de link (`report_requests.delivery_status = failed`).
          </p>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-admin-text-tertiary">
            Última atividade por fase
          </h4>
          <ul className="flex flex-col gap-1">
            {data.flows.map((f) => (
              <li
                key={f.key}
                className="flex items-center justify-between text-[12px]"
              >
                <span className="text-admin-text-secondary">{f.title}</span>
                <span className="tabular-nums text-admin-text-tertiary">
                  {f.lastEventAt ? formatRelative(f.lastEventAt) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>

      <AdminCard>
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-admin-text-tertiary">
          Contagens por fase
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-admin-text-tertiary">
                <th className="py-2 pr-3 font-medium">Fase</th>
                <th className="py-2 pr-3 font-medium tabular-nums">Elegíveis</th>
                <th className="py-2 pr-3 font-medium tabular-nums">Em curso</th>
                <th className="py-2 pr-3 font-medium tabular-nums">Concluídos</th>
                <th className="py-2 font-medium tabular-nums">24h</th>
              </tr>
            </thead>
            <tbody>
              {data.flows.map((f: AutomationFlow) => (
                <tr
                  key={f.key}
                  className="border-t"
                  style={{ borderColor: "rgb(var(--admin-border-default))" }}
                >
                  <td className="py-2 pr-3 text-admin-text-primary">{f.title}</td>
                  <td className="py-2 pr-3 tabular-nums text-admin-text-primary">{f.eligibleCount}</td>
                  <td className="py-2 pr-3 tabular-nums text-admin-text-primary">{f.inFlightCount}</td>
                  <td className="py-2 pr-3 tabular-nums text-admin-text-primary">{f.completedLeads ?? f.sentEvents}</td>
                  <td className="py-2 tabular-nums text-admin-text-primary">{f.last24hCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "agora";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "há instantes";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const mo = Math.floor(d / 30);
  return `há ${mo} m`;
}