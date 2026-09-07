import {
  BENCHMARK_DATASET_VERSION,
  INSTAGRAM_BENCHMARK_CONTEXT,
} from "@/lib/knowledge/benchmark-context";
import type { VariantFeatures } from "@/lib/report/report-variant";

/**
 * Camada de dados APENAS de apresentação para a metodologia Editorial V2.
 *
 * Toda a informação renderizada vem de proveniência real de produção:
 *  - registo de fontes de benchmark (`benchmark-context.ts`);
 *  - versão do dataset de benchmark;
 *  - data de recolha do snapshot (`profile.analyzedAt`, derivada de
 *    `meta.generated_at`).
 *
 * Nada aqui inventa fontes, datas ou descrições. Campos em falta são
 * omitidos.
 */

export type MethodologyDimensionId =
  | "collection"
  | "market_reference"
  | "editorial_reading"
  | "demand_signals";

export interface MethodologyDimension {
  id: MethodologyDimensionId;
  title: string;
  body: string;
}

export interface MethodologySource {
  name: string;
  /** Etiqueta real de última actualização/ano. Nunca inventada. */
  dateLabel: string | null;
  description: string;
  /** URL só quando existe no registo de produção. */
  url: string | null;
}

export interface EditorialMethodologyData {
  dimensions: readonly MethodologyDimension[];
  sources: readonly MethodologySource[];
  datasetVersion: string;
  /** Data de recolha real do snapshot, ou `null` quando desconhecida. */
  collectedAt: string | null;
}

/** `formatPtDate` devolve "—" quando não há data real no snapshot. */
export function normaliseCollectedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "—") return null;
  return trimmed;
}

const DIMENSION_COLLECTION: MethodologyDimension = {
  id: "collection",
  title: "Recolha automática",
  body: "Métricas e publicações públicas do perfil, recolhidas sem sessão iniciada. Não inclui mensagens privadas nem conteúdo apagado.",
};

const DIMENSION_MARKET: MethodologyDimension = {
  id: "market_reference",
  title: "Referência de mercado",
  body: "Comparação com contas de dimensão semelhante e com estudos agregados citados abaixo. Serve de enquadramento, não de meta fixa.",
};

const DIMENSION_READING: MethodologyDimension = {
  id: "editorial_reading",
  title: "Leitura editorial",
  body: "As leituras são geradas a partir dos sinais observados e apresentadas separadas dos factos. Não alteram nenhum valor recolhido ou calculado.",
};

const DIMENSION_DEMAND: MethodologyDimension = {
  id: "demand_signals",
  title: "Sinais de procura",
  body: "Indicadores públicos de procura associados aos temas do perfil.",
};

export function buildEditorialMethodologyData({
  features,
  analyzedAt,
}: {
  features: VariantFeatures;
  analyzedAt: string | null | undefined;
}): EditorialMethodologyData {
  const dimensions: MethodologyDimension[] = [
    DIMENSION_COLLECTION,
    DIMENSION_MARKET,
    DIMENSION_READING,
  ];

  // "Sinais de procura" só é descrito quando a variante realmente mostra
  // a secção. No relatório público (`public_mvp`) está oculta.
  if (features.marketSignals !== "hidden") {
    dimensions.push(DIMENSION_DEMAND);
  }

  const sources: MethodologySource[] = INSTAGRAM_BENCHMARK_CONTEXT.sources
    .filter((source) => source.visibility === "active" && source.uiDisplayAllowed)
    .map((source) => ({
      name: source.name,
      dateLabel:
        source.lastUpdatedLabel ??
        (Number.isFinite(source.publishedYear) ? String(source.publishedYear) : null),
      description: source.shortDescription,
      url: source.url && source.url.startsWith("http") ? source.url : null,
    }));

  return {
    dimensions,
    sources,
    datasetVersion: BENCHMARK_DATASET_VERSION,
    collectedAt: normaliseCollectedAt(analyzedAt),
  };
}
