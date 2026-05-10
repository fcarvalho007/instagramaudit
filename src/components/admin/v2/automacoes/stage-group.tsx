/**
 * StageGroup — agrupa nós de uma fase do ciclo de vida com barra lateral
 * colorida e header (nome da fase, número, contador agregado).
 *
 * Inspirado no `DayGroupContainer` do CRM Webinar, sem lógica de webinar.
 */

import type { ReactNode } from "react";

interface Props {
  number: string;
  label: string;
  description?: string;
  count?: number;
  countLabel?: string;
  color: string;
  children: ReactNode;
}

export function StageGroup({
  number,
  label,
  description,
  count,
  countLabel = "elegíveis",
  color,
  children,
}: Props) {
  return (
    <section
      className="relative rounded-xl border pl-4 pr-3 py-3 sm:pl-5 sm:pr-4"
      style={{
        borderColor: `${color}33`,
        background: `${color}08`,
      }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
        style={{ background: color }}
      />
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums"
          style={{ background: color, color: "#fff" }}
        >
          {number}
        </span>
        <h3
          className="m-0 text-[12px] font-semibold uppercase tracking-[0.1em]"
          style={{ color }}
        >
          {label}
        </h3>
        {typeof count === "number" && count > 0 && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{
              background: `${color}1A`,
              color,
            }}
          >
            {count} {countLabel}
          </span>
        )}
        {description && (
          <span className="text-[11px] text-admin-text-tertiary">
            · {description}
          </span>
        )}
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}