import { ENRICHED_COPY } from "./report-enriched-copy";

/**
 * Glossário ultra-curto (3 termos) para utilizadores não-técnicos
 * compreenderem rapidamente as palavras-chave do relatório. Renderizado
 * como nota tipográfica fina (tier 3), escondido em mobile para não
 * empurrar dados reais para fora do fold.
 *
 * Não consome dados — apenas copy estático. Nunca usado em
 * `/report/example`.
 */
export function ReportEnrichedGlossary() {
  const { eyebrow, items } = ENRICHED_COPY.glossary;
  return (
    <section
      aria-label="Como ler este relatório"
      className="mx-auto max-w-7xl px-6 pt-3 hidden md:block"
    >
      <div className="border-t border-border-subtle/30 pt-3">
        <p className="text-eyebrow-sm text-content-tertiary mb-2">
          {eyebrow}
        </p>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
          {items.map((it) => (
            <div key={it.term} className="min-w-0">
              <dt className="text-eyebrow-sm text-content-secondary">
                {it.term}
              </dt>
              <dd className="text-xs text-content-tertiary leading-relaxed mt-0.5">
                {it.definition}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}