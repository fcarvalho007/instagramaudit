/**
 * PeriodSelect — select estilizado para escolher período no header de tab.
 *
 * Acção mock por agora (não filtra dados); existe apenas como controlo visual
 * coerente com o design system admin v2.
 */

import { useId } from "react";

export type AdminPeriod = "30d" | "90d" | "ytd";

const LABELS: Record<AdminPeriod, string> = {
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  ytd: "Este ano",
};

interface PeriodSelectProps {
  value: AdminPeriod;
  onChange: (next: AdminPeriod) => void;
}

export function PeriodSelect({ value, onChange }: PeriodSelectProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5 text-[12px] text-admin-text-secondary transition-colors hover:border-admin-border-strong"
    >
      <span className="admin-eyebrow">Período</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as AdminPeriod)}
        className="bg-transparent text-[12px] text-admin-text-primary outline-none focus-visible:ring-2 focus-visible:ring-admin-revenue-500 rounded"
      >
        {(Object.keys(LABELS) as AdminPeriod[]).map((k) => (
          <option key={k} value={k}>
            {LABELS[k]}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ExportCsvButtonProps {
  onExport?: () => void;
}

export function ExportCsvButton({ onExport }: ExportCsvButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        onExport?.();
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5 text-[12px] font-medium text-admin-text-primary transition-colors hover:border-admin-border-strong hover:bg-admin-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-revenue-500"
    >
      <span aria-hidden="true">⬇</span>
      Exportar CSV
    </button>
  );
}