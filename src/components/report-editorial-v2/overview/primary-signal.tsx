import { Gauge, Layers, TrendingDown, type LucideIcon } from "lucide-react";

import type {
  AttentionIconKey,
  AttentionSignal,
  AttentionTone,
} from "@/lib/report/attention-signals";

const ICONS: Record<AttentionIconKey, LucideIcon> = {
  "engagement-gap": TrendingDown,
  "cadence-vs-response": Gauge,
  "format-concentration": Layers,
};

export const TONE_VARS: Record<
  AttentionTone,
  { fg: string; bg: string; bd: string; label: string }
> = {
  bad: {
    fg: "var(--ev2-danger)",
    bg: "var(--ev2-danger-bg)",
    bd: "var(--ev2-danger-bd)",
    label: "Crítico",
  },
  warn: {
    fg: "var(--ev2-warning)",
    bg: "var(--ev2-warning-bg)",
    bd: "var(--ev2-warning-bd)",
    label: "A melhorar",
  },
  neutral: {
    fg: "var(--ev2-blue)",
    bg: "var(--ev2-blue-4)",
    bd: "var(--ev2-blue-3)",
    label: "Estável",
  },
};

/**
 * Sinal dominante. É simplesmente o primeiro sinal devolvido pelo
 * mecanismo de atenção já existente em produção — não há novo ranking.
 */
export function PrimarySignal({
  signal,
  headingId,
}: {
  signal: AttentionSignal;
  headingId: string;
}) {
  const Icon = ICONS[signal.key];
  const tone = TONE_VARS[signal.tone];

  return (
    <article
      className="rounded-[14px] border bg-[var(--ev2-surface)] p-[var(--ev2-s3)] lg:p-[var(--ev2-s4)]"
      style={{ borderColor: tone.bd, borderLeftWidth: 3, borderLeftColor: tone.fg }}
    >
      <div className="flex items-center gap-[10px]">
        <span
          aria-hidden="true"
          className="grid size-[30px] shrink-0 place-items-center rounded-[9px]"
          style={{ background: tone.bg, color: tone.fg }}
        >
          <Icon className="size-[16px]" />
        </span>
        <span
          className="rounded-full border px-[10px] py-[3px] text-[11px] font-medium uppercase tracking-[0.1em]"
          style={{ color: tone.fg, background: tone.bg, borderColor: tone.bd }}
        >
          {tone.label}
        </span>
      </div>

      <h3
        id={headingId}
        className="mt-[var(--ev2-s2)] text-[22px] text-[var(--ev2-ink)] lg:text-[26px]"
      >
        {signal.title}
      </h3>

      <p className="ev2-tabular mt-[var(--ev2-s1)] text-[40px] leading-[1.05] text-[var(--ev2-ink)] lg:text-[52px]">
        {signal.value}
      </p>

      <p className="mt-[var(--ev2-s2)] max-w-[58ch] text-[15px] leading-[1.6] text-[var(--ev2-ink-2)]">
        {signal.body}
      </p>
    </article>
  );
}
