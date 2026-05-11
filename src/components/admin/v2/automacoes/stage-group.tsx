/**
 * StageGroup — agrupa cards de uma stage do ciclo de vida.
 */

import type { ReactNode } from "react";

interface Props {
  number: string;
  eyebrow: string;
  title: string;
  meta?: string;
  color: string;
  bg: string;
  children: ReactNode;
}

export function StageGroup({ number, eyebrow, title, meta, color, bg, children }: Props) {
  return (
    <section
      className="relative rounded-2xl border px-4 py-4 sm:px-5 sm:py-5"
      style={{ background: bg, borderColor: `${color}26` }}
    >
      <header className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-1">
        <span
          className="font-serif text-[36px] font-medium leading-none tabular-nums"
          style={{ color }}
        >
          {number}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color }}
          >
            {eyebrow}
          </span>
          <h2 className="m-0 font-serif text-[18px] font-medium leading-tight text-admin-text-primary">
            {title}
          </h2>
        </div>
        {meta && (
          <span className="text-[11px] font-medium text-admin-text-tertiary">{meta}</span>
        )}
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
