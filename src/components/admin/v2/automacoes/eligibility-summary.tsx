/**
 * EligibilitySummary — strip de KPIs no topo da página de automações.
 */

import { AdminCard } from "../admin-card";

interface Props {
  totalActive: number;
  totalArchived: number;
  totalEligible: number;
  totalInFlight: number;
}

export function EligibilitySummary({
  totalActive,
  totalArchived,
  totalEligible,
  totalInFlight,
}: Props) {
  const items: Array<{ label: string; value: number; color: string }> = [
    { label: "Leads ativas", value: totalActive, color: "rgb(var(--admin-leads-500))" },
    { label: "Aguardam ação admin", value: totalEligible, color: "rgb(var(--admin-signal-500))" },
    { label: "Em curso", value: totalInFlight, color: "rgb(var(--admin-warning-500))" },
    { label: "Arquivadas", value: totalArchived, color: "rgb(var(--admin-text-tertiary))" },
  ];

  return (
    <AdminCard>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.12em] text-admin-text-tertiary">
              {it.label}
            </span>
            <span
              className="text-[26px] font-semibold tabular-nums leading-none"
              style={{ color: it.color }}
            >
              {it.value}
            </span>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}