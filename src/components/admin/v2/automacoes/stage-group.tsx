/**
 * StageGroup — agrupa cards de uma stage do ciclo de vida.
 * Recebe tokens (sem `--`); resolve via `rgb(var(--<token>))`.
 */

import type { ReactNode } from "react";

interface Props {
  number: string;
  eyebrow: string;
  title: string;
  description?: string;
  meta?: string;
  tokenColor: string;
  tokenBg: string;
  variant?: "default" | "muted";
  children: ReactNode;
}

export function StageGroup({ number, eyebrow, title, description, meta, tokenColor, tokenBg, variant = "default", children }: Props) {
  const muted = variant === "muted";
  const background = muted
    ? "rgb(var(--admin-surface-muted))"
    : `rgb(var(--${tokenBg}))`;
  const borderColor = muted
    ? "rgb(var(--admin-text-tertiary) / 0.2)"
    : `color-mix(in oklab, rgb(var(--${tokenColor})) 18%, transparent)`;
  const headingColor = muted
    ? "rgb(var(--admin-text-tertiary))"
    : `rgb(var(--${tokenColor}))`;
  return (
    <section
      className="relative rounded-2xl border px-4 py-4 sm:px-5 sm:py-5"
      style={{ background, borderColor }}
    >
      <header className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-1">
        <span
          className="font-serif text-[36px] font-medium leading-none tabular-nums"
          style={{ color: headingColor }}
        >
          {number}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: headingColor }}
          >
            {eyebrow}
          </span>
          <h2
            className={`m-0 font-serif text-[18px] font-medium leading-tight ${
              muted ? "text-admin-text-tertiary" : "text-admin-text-primary"
            }`}
          >
            {title}
          </h2>
          {description && (
            <p className="m-0 mt-0.5 text-[12px] text-admin-text-secondary">
              {description}
            </p>
          )}
          {muted && (
            <p className="m-0 mt-1 text-[11px] italic text-admin-text-tertiary">
              Mantido para histórico, compatibilidade e auditoria. Não dispara em produção.
            </p>
          )}
        </div>
        {meta && (
          <span className="text-[11px] font-medium text-admin-text-tertiary">{meta}</span>
        )}
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
