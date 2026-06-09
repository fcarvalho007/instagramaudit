import { cn } from "@/lib/utils";
import type { PriorityItem } from "@/lib/report/block02-diagnostic";
import { useTranslation } from "react-i18next";

interface Props {
  items: PriorityItem[];
  /** @deprecated kept for backward compatibility — per-item source pill replaces this. */
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

const CATEGORY_KEY = {
  testar: "diagnostic.priorities_category.testar",
  corrigir: "diagnostic.priorities_category.corrigir",
  repetir: "diagnostic.priorities_category.repetir",
  oportunidade: "diagnostic.priorities_category.oportunidade",
} as const;

export function ReportDiagnosticPriorities({ items }: Props) {
  const { t } = useTranslation("report");
  if (items.length === 0) return null;
  return (
    <section aria-label={t("diagnostic.priorities_aria")} className="space-y-6 md:space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-eyebrow-sm text-content-tertiary">
            07 · Prioridades de acção
          </p>
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
          const category = it.category ?? "oportunidade";
          const basedOn = it.basedOn ?? [];
          const evidence = it.evidence ?? [];
          const src = it.source ?? "deterministic";
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
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1",
                    "text-eyebrow-sm ring-1",
                    s.chip,
                  )}
                >
                  {t(s.labelKey)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1",
                    "text-eyebrow-sm ring-1 bg-surface-muted text-content-secondary ring-border-default",
                  )}
                >
                  {t(CATEGORY_KEY[category])}
                </span>
                <span
                  className={cn(
                    "ml-auto inline-flex items-center rounded-full px-2 py-0.5",
                    "text-[10px] font-medium tracking-wide uppercase",
                    "bg-transparent text-content-tertiary ring-1 ring-border-default",
                  )}
                  title={t(`diagnostic.priorities_source.${src}`)}
                >
                  {t(`diagnostic.priorities_source.${src}`)}
                </span>
              </div>

              <h4 className="font-display text-[1.05rem] font-semibold tracking-tight text-content-primary leading-snug">
                {it.title}
              </h4>
              <p className="text-sm text-content-secondary leading-relaxed">{it.body}</p>

              {evidence.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {evidence.slice(0, 2).map((ev, j) => (
                    <span
                      key={`${ev.label}-${j}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs bg-surface-muted text-content-secondary ring-1 ring-border-default tabular-nums"
                    >
                      <span className="text-content-tertiary">{ev.label}</span>
                      {ev.value ? (
                        <span className="font-semibold text-content-primary">{ev.value}</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              ) : null}

              {basedOn.length > 0 ? (
                <p className="text-xs text-content-tertiary mt-auto leading-relaxed">
                  <span className="font-medium">{t("diagnostic.priorities_based_on")}</span>{" "}
                  {basedOn.join(" · ")}
                </p>
              ) : it.resolves ? (
                <p className="text-eyebrow-sm mt-auto text-content-tertiary">{it.resolves}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
