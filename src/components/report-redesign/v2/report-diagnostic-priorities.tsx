import { cn } from "@/lib/utils";
import type { PriorityItem } from "@/lib/report/block02-diagnostic";
import { ReportSourceLabel } from "./report-source-label";
import { useTranslation } from "react-i18next";

interface Props {
  items: PriorityItem[];
  source?: "ai" | "deterministic";
}

const STYLE = {
  alta: {
    border: "border-l-signal-danger/60",
    chip: "bg-tint-danger text-signal-danger ring-signal-danger/15",
    labelKey: "diagnostic.priorities_levels.alta",
  },
  media: {
    border: "border-l-accent-primary/60",
    chip: "bg-tint-primary text-accent-primary ring-accent-primary/15",
    labelKey: "diagnostic.priorities_levels.media",
  },
  oportunidade: {
    border: "border-l-signal-success/60",
    chip: "bg-tint-success text-signal-success ring-signal-success/15",
    labelKey: "diagnostic.priorities_levels.oportunidade",
  },
} as const;

export function ReportDiagnosticPriorities({ items, source = "deterministic" }: Props) {
  const { t } = useTranslation("report");
  if (items.length === 0) return null;
  return (
    <section aria-label={t("diagnostic.priorities_aria")} className="space-y-6 md:space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-eyebrow-sm text-content-tertiary">
            07 · Prioridades de acção
          </p>
          {source === "ai" ? <ReportSourceLabel type="ia" /> : null}
          <span className="text-eyebrow-sm ml-auto text-content-tertiary tabular-nums">
            {t("diagnostic.priorities_count", { count: items.length })}
          </span>
        </div>
        <h3 className="font-display text-[1.5rem] md:text-[1.75rem] leading-tight tracking-tight text-content-primary">
          O que testar, corrigir ou repetir?
        </h3>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((it, i) => {
          const s = STYLE[it.level];
          return (
            <article
              key={`${it.title}-${i}`}
              className={cn(
                "h-full rounded-2xl border border-border-default bg-surface-secondary",
                "p-6 flex flex-col gap-3.5",
                "shadow-card",
                "border-l-4",
                s.border,
              )}
            >
              <span
                className={cn(
                  "self-start inline-flex items-center rounded-full px-2.5 py-1",
                  "text-eyebrow-sm ring-1",
                  s.chip,
                )}
              >
                {t(s.labelKey)}
              </span>
              <h4 className="font-display text-[1.05rem] font-semibold tracking-tight text-content-primary leading-snug">
                {it.title}
              </h4>
              <p className="text-sm text-content-secondary leading-relaxed">{it.body}</p>
              <p className="text-eyebrow-sm mt-auto text-content-tertiary">
                {it.resolves}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
