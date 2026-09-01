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

/**
 * Liga cada base de evidência ao cartão de diagnóstico (ou secção do
 * relatório) que a sustenta. Fecha o salto "diagnóstico → acção".
 */
const BASIS_ANCHOR: Record<string, string> = {
  "Resposta do público": "diag-audiencia",
  "Análise visual das capas": "diag-capas",
  "Frequência editorial": "frequencia",
  "Mix de formatos": "formatos",
  "Publicações-chave": "publicacoes-chave",
  "Padrão das captions": "diag-legendas",
  "Integração entre canais": "diag-integracao",
  "Tipo de conteúdo dominante": "diag-conteudo",
};

/** Remove a numeração legada "Pergunta N", que já não coincide com os cartões. */
function cleanResolves(text: string): string {
  return text
    .replace(/\s*—?\s*Pergunta\s*\d+\s*—?\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function ReportDiagnosticPriorities({ items }: Props) {
  const { t } = useTranslation("report");
  if (items.length === 0) return null;
  return (
    <section aria-label={t("diagnostic.priorities_aria")} className="space-y-6 md:space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-eyebrow-sm text-content-tertiary">
            08 · {t("diagnostic.priorities_title")}
          </p>
          <span className="text-eyebrow-sm ml-auto text-content-tertiary tabular-nums">
            {t("diagnostic.priorities_count", { count: items.length })}
          </span>
        </div>
        <h3 className="font-display text-[1.5rem] md:text-[1.75rem] leading-tight tracking-tight text-content-primary">
          {t("diagnostic.priorities_heading")}
        </h3>
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-eyebrow-sm ring-1 bg-tint-primary text-accent-primary ring-accent-primary/15">
          {t("diagnostic.priorities_horizon")}
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((it, i) => {
          const s = STYLE[it.level];
          const category = it.category;
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
                {category ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1",
                      "text-eyebrow-sm ring-1 bg-surface-muted text-content-secondary ring-border-default",
                    )}
                  >
                    {t(CATEGORY_KEY[category])}
                  </span>
                ) : null}
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
                  {basedOn.map((b, j) => {
                    const anchor = BASIS_ANCHOR[b];
                    return (
                      <span key={`${b}-${j}`}>
                        {j > 0 ? " · " : null}
                        {anchor ? (
                          <a
                            href={`#${anchor}`}
                            className="underline decoration-dotted underline-offset-2 hover:text-accent-primary"
                          >
                            {b}
                          </a>
                        ) : (
                          b
                        )}
                      </span>
                    );
                  })}
                </p>
              ) : it.resolves ? (
                <p className="text-eyebrow-sm mt-auto text-content-tertiary">
                  {cleanResolves(it.resolves)}
                </p>
              ) : null}

            </article>
          );
        })}
      </div>
    </section>
  );
}
