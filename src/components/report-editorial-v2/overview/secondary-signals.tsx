import { Gauge, Layers, TrendingDown, type LucideIcon } from "lucide-react";

import type {
  AttentionIconKey,
  AttentionSignal,
} from "@/lib/report/attention-signals";

import { TONE_VARS } from "./primary-signal";

const ICONS: Record<AttentionIconKey, LucideIcon> = {
  "engagement-gap": TrendingDown,
  "cadence-vs-response": Gauge,
  "format-concentration": Layers,
};

/**
 * Sinais secundários agrupados num único cartão. Mesmo mecanismo de
 * produção; apenas os sinais que sobram depois do primário.
 */
export function SecondarySignals({
  signals,
  headingId,
}: {
  signals: readonly AttentionSignal[];
  headingId: string;
}) {
  if (signals.length === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-[14px] border border-[var(--ev2-hair-2)] bg-[var(--ev2-surface)]"
    >
      <h3
        id={headingId}
        className="border-b border-[var(--ev2-hair)] px-[var(--ev2-s3)] py-[var(--ev2-s2)] text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--ev2-ink-3)]"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Outros sinais observados
      </h3>
      <ul className="divide-y divide-[var(--ev2-hair)]">
        {signals.map((s) => {
          const Icon = ICONS[s.key];
          const tone = TONE_VARS[s.tone];
          return (
            <li
              key={s.key}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[12px] px-[var(--ev2-s3)] py-[14px] min-h-[56px]"
            >
              <span
                aria-hidden="true"
                className="grid size-[28px] shrink-0 place-items-center rounded-[8px]"
                style={{ background: tone.bg, color: tone.fg }}
              >
                <Icon className="size-[15px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium text-[var(--ev2-ink)]">
                  {s.title}
                </span>
                <span className="block text-[12.5px]" style={{ color: tone.fg }}>
                  {tone.label}
                </span>
              </span>
              <span className="ev2-tabular shrink-0 text-[16px] text-[var(--ev2-ink)]">
                {s.value}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
