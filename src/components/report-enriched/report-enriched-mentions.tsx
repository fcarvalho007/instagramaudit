import { ExternalLink } from "lucide-react";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { ENRICHED_COPY } from "./report-enriched-copy";

interface Props {
  enriched: ReportEnriched;
}

/**
 * Mostra contas mencionadas nas captions, como leitura subtil do
 * ecossistema do perfil. Esconde-se quando não há menções detetadas.
 */
export function ReportEnrichedMentions({ enriched }: Props) {
  const items = enriched.mentionsSummary;
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Marcas e perfis mencionados nas captions"
      className="mx-auto max-w-7xl px-6 pt-4"
    >
      <div className="rounded-xl border border-border-subtle/30 bg-surface-secondary/30 p-5 md:p-6 space-y-4">
        <header className="space-y-1.5 max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-content-tertiary">
            {ENRICHED_COPY.mentions.eyebrow}
          </p>
          <h2 className="font-display text-xl md:text-2xl font-medium tracking-tight text-content-primary leading-snug">
            {ENRICHED_COPY.mentions.title}
          </h2>
          <p className="text-sm text-content-secondary leading-relaxed">
            {ENRICHED_COPY.mentions.subtitle}
          </p>
        </header>

        <ul className="flex flex-wrap gap-2">
          {items.map((m) => (
            <li key={m.handle}>
              <a
                href={`https://www.instagram.com/${m.handle}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-subtle/60 text-content-secondary hover:text-accent-primary hover:border-accent-primary/40 transition-colors"
              >
                <span className="text-sm">@{m.handle}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-content-tertiary">
                  {m.count} {m.count === 1 ? "menção" : "menções"}
                </span>
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}