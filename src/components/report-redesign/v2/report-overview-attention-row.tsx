import {
  AlertTriangle,
  Gauge,
  Layers,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { cn } from "@/lib/utils";
import {
  computeAttentionSignals,
  type AttentionIconKey,
  type AttentionSignal,
  type AttentionTone,
} from "@/lib/report/attention-signals";

import { REDESIGN_TOKENS } from "../report-tokens";

interface Props {
  result: AdapterResult;
}

const SIGNAL_ICONS: Record<AttentionIconKey, LucideIcon> = {
  "engagement-gap": TrendingDown,
  "cadence-vs-response": Gauge,
  "format-concentration": Layers,
};

type Tone = AttentionTone;
type Signal = AttentionSignal;

/**
 * Linha "O que merece atenção primeiro" (Phase 1B.1G).
 *
 * Devolve até 3 sinais derivados apenas do `AdapterResult` actual.
 * Cada sinal só dispara quando os dados são suficientes — sem
 * placeholders, sem inventar valores.
 */
export function ReportOverviewAttentionRow({ result }: Props) {
  const { t } = useTranslation("report");
  const signals = computeAttentionSignals(result, t).slice(0, 3);
  if (signals.length === 0) return null;

  return (
    <section
      aria-label={t("attention.title")}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="h-4 w-4 text-amber-600"
          aria-hidden="true"
        />
        <h3 className={REDESIGN_TOKENS.eyebrow}>
          {t("attention.title")}
        </h3>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-3 md:gap-4",
          signals.length >= 3
            ? "sm:grid-cols-2 lg:grid-cols-3"
            : signals.length === 2
              ? "sm:grid-cols-2"
              : "sm:grid-cols-1",
        )}
      >
        {signals.map((s) => (
          <SignalCard key={s.key} signal={s} />
        ))}
      </div>
    </section>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const Icon = SIGNAL_ICONS[signal.key];
  const toneCls =
    signal.tone === "bad"
      ? {
          accent: "border-l-rose-300",
          icon: "bg-rose-50 text-rose-600 ring-rose-100",
          dot: "bg-rose-500",
        }
      : signal.tone === "warn"
        ? {
            accent: "border-l-amber-300",
            icon: "bg-amber-50 text-amber-600 ring-amber-100",
            dot: "bg-amber-500",
          }
        : {
            accent: "border-l-border-default",
            icon: "bg-surface-muted text-content-secondary ring-border-default",
            dot: "bg-content-tertiary",
          };

  return (
    <article
      className={cn(
        "rounded-2xl border border-border-default border-l-2 bg-white p-3.5 md:p-4 flex items-start gap-3 min-w-0",
        "shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
        toneCls.accent,
      )}
    >
      <span
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
          toneCls.icon,
        )}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 space-y-1">
        <h4 className="flex items-center gap-2 font-display text-[0.95rem] font-semibold tracking-tight text-content-primary leading-snug">
          <span
            aria-hidden="true"
            className={cn("size-1.5 rounded-full shrink-0", toneCls.dot)}
          />
          <span className="min-w-0">{signal.title}</span>
        </h4>
        <p className="text-[12.5px] text-content-secondary leading-relaxed">
          {signal.body}
        </p>
      </div>
    </article>
  );
}
