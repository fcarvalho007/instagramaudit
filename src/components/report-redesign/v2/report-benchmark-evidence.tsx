import { cn } from "@/lib/utils";
import type { BenchmarkSourceName } from "@/lib/knowledge/benchmark-context";

interface Props {
  platform: "instagram";
  /** Tier Buffer já formatado para humano: "0–1K", "5–10K"… `null` para omitir. */
  followerTier?: string | null;
  /** Indústria — só passar se realmente conhecida. `null` força copy genérica. */
  industry?: string | null;
  /** Nomes de fontes a citar (1–3). Devem vir filtrados por `uiDisplayAllowed`. */
  sourceNames: BenchmarkSourceName[];
  className?: string;
}

const PLATFORM_LABEL: Record<Props["platform"], string> = {
  instagram: "Instagram",
};

/**
 * Linha discreta de proveniência do benchmark, posicionada junto ao
 * valor de referência num cartão (Bloco 01 · Envolvimento).
 *
 * Política editorial:
 *  - Mostra **nomes** das fontes, nunca URLs (URLs vivem só na
 *    secção "Fontes de referência" da Metodologia).
 *  - Quando `industry` é desconhecido, usa cópia genérica ("contexto
 *    geral de mercado") — nunca inventa um setor.
 *  - Quando `followerTier` é desconhecido, omite esse segmento em
 *    silêncio.
 *  - Tipograficamente secundária: mono pequeno, sem destaque cromático.
 */
export function ReportBenchmarkEvidence({
  platform,
  followerTier,
  industry,
  sourceNames,
  className,
}: Props) {
  const segments: string[] = ["Referência de mercado", PLATFORM_LABEL[platform]];

  if (industry && industry.trim().length > 0) {
    segments.push(`setor ${industry.trim().toLowerCase()}`);
  } else if (followerTier && followerTier.trim().length > 0) {
    segments.push(`contas ${followerTier.trim()}`);
  } else {
    segments.push("contexto geral");
  }

  const sources = sourceNames.slice(0, 3);

  return (
    <p
      className={cn(
        "font-mono text-[10.5px] uppercase tracking-[0.14em] leading-snug",
        "text-slate-500",
        className,
      )}
    >
      {segments.map((s, i) => (
        <span key={i}>
          {i > 0 ? <span className="mx-1.5 text-slate-300">·</span> : null}
          <span>{s}</span>
        </span>
      ))}
      {sources.length > 0 ? (
        <>
          <span className="mx-1.5 text-slate-300">·</span>
          <span className="text-slate-400 normal-case tracking-normal">
            fontes:
          </span>{" "}
          {sources.map((name, i) => (
            <span key={name}>
              {i > 0 ? <span className="text-slate-300">, </span> : null}
              <span
                className="text-slate-600 normal-case tracking-normal"
                title={`Fonte: ${name} — detalhes na metodologia`}
                aria-label={`Fonte: ${name} — detalhes na metodologia`}
              >
                {name}
              </span>
            </span>
          ))}
        </>
      ) : null}
    </p>
  );
}
