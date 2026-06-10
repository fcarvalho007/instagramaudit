import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

/**
 * Subset de fontes activas no relatório público. Databox fica fora deste
 * tipo — só pode ser citado quando existirem métricas autenticadas no
 * perfil analisado (alcance, visitas, cliques, saves).
 */
export type ActiveBenchmarkSourceName = "Socialinsider" | "Buffer" | "Hootsuite";

interface Props {
  platform: "instagram";
  /** Tier Buffer já formatado para humano: "0–1K", "5–10K"… `null` para omitir. */
  followerTier?: string | null;
  /** Indústria — só passar se realmente conhecida. `null` força copy genérica. */
  industry?: string | null;
  /** Nomes de fontes a citar (1–3). Restrito a fontes activas. */
  sourceNames: ActiveBenchmarkSourceName[];
  /**
   * Aviso curto para perfis ≥1M, fora dos escalões Buffer públicos.
   * Quando presente, renderiza uma segunda linha discreta abaixo da
   * proveniência. Omitido em silêncio caso não se aplique.
   */
  aboveBufferRangeHint?: string | null;
  className?: string;
}


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
  aboveBufferRangeHint,
  className,
}: Props) {
  const { t } = useTranslation("report");
  const platformLabel = platform === "instagram"
    ? t("benchmarkEvidence.platform_instagram")
    : platform;
  const segments: string[] = [t("benchmarkEvidence.market_reference"), platformLabel];

  if (industry && industry.trim().length > 0) {
    segments.push(t("benchmarkEvidence.sector_prefix", { name: industry.trim().toLowerCase() }));
  } else if (followerTier && followerTier.trim().length > 0) {
    segments.push(t("benchmarkEvidence.tier_prefix", { tier: followerTier.trim() }));
  } else {
    segments.push(t("benchmarkEvidence.general_context"));
  }

  const sources = sourceNames.slice(0, 3) as ActiveBenchmarkSourceName[];

  const SOURCE_CONTEXT: Record<ActiveBenchmarkSourceName, string> = {
    Socialinsider: t("benchmarkEvidence.ctx_socialinsider"),
    Buffer: t("benchmarkEvidence.ctx_buffer"),
    Hootsuite: t("benchmarkEvidence.ctx_hootsuite"),
  };

  return (
    <div className={cn("space-y-1", className)}>
      <p
        className={cn(
          "text-eyebrow-sm text-[10.5px] leading-snug",
          "text-content-tertiary",
        )}
      >
        {segments.map((s, i) => (
          <span key={i}>
            {i > 0 ? <span className="mx-1.5 text-content-tertiary">·</span> : null}
            <span>{s}</span>
          </span>
        ))}
        {sources.length > 0 ? (
          <>
            <span className="mx-1.5 text-content-tertiary">·</span>
            <span className="text-content-tertiary normal-case tracking-normal">
              {t("benchmarkEvidence.sources_label")}
            </span>{" "}
            {sources.map((name, i) => (
              <span key={name}>
                {i > 0 ? <span className="text-content-tertiary">, </span> : null}
                <span
                  className="text-content-secondary normal-case tracking-normal"
                  title={`${name} — ${SOURCE_CONTEXT[name]}`}
                  aria-label={`${name} — ${SOURCE_CONTEXT[name]}`}
                >
                  {name}
                  <span className="text-content-tertiary ml-0.5">
                    ({SOURCE_CONTEXT[name]})
                  </span>
                </span>
              </span>
            ))}
          </>
        ) : null}
      </p>
      {aboveBufferRangeHint && aboveBufferRangeHint.trim().length > 0 ? (
        <p className="text-eyebrow-sm leading-snug text-content-tertiary">
          {aboveBufferRangeHint}
        </p>
      ) : null}
    </div>
  );
}
