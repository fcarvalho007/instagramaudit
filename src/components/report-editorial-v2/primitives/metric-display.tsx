import type { ReactNode } from "react";

/**
 * Número editorial em destaque. Valor formatado a montante — este
 * primitivo nunca calcula nem formata métricas.
 */
export function MetricDisplay({
  label,
  value,
  unit,
  note,
  size = "md",
}: {
  label: string;
  value: string;
  unit?: string;
  note?: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <div className="flex flex-col gap-[6px]">
      <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--ev2-ink-3)]">
        {label}
      </span>
      <span
        className={
          size === "lg"
            ? "ev2-tabular text-[44px] leading-[1.05] text-[var(--ev2-ink)] lg:text-[64px]"
            : "ev2-tabular text-[28px] leading-[1.1] text-[var(--ev2-ink)] lg:text-[36px]"
        }
      >
        {value}
        {unit ? (
          <span className="ml-[4px] text-[0.45em] text-[var(--ev2-ink-3)]">{unit}</span>
        ) : null}
      </span>
      {note ? <span className="text-[13px] text-[var(--ev2-ink-2)]">{note}</span> : null}
    </div>
  );
}
