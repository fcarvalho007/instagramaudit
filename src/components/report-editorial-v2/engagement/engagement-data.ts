import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";

import type { StatusTone } from "../primitives/status-pill";

/**
 * Adaptador de APRESENTAÇÃO do Engagement (Editorial V2).
 *
 * Lê exclusivamente valores já calculados em produção
 * (`keyMetrics.engagementRate|engagementBenchmark|engagementDeltaPct`,
 * `profile.tier/tierRange`, `meta.windowLabel`). Não recalcula engagement,
 * não reclassifica escalões e não faz qualquer I/O.
 *
 * NOTA DE ARQUITECTURA — o contrato de dados actual só transporta a
 * referência do escalão do próprio perfil. A tabela completa dos cinco
 * escalões vive em `benchmark_references` e é lida server-side; renderizar
 * as cinco bandas exigiria alterar o loader. Por isso esta camada usa a
 * comparação de escalão único (`tierBands.length === 1`).
 */
export interface EngagementTierBand {
  /** Rótulo do escalão, tal como já existe nos dados de produção. */
  label: string;
  /** Valor de referência em %, vindo da produção. */
  value: number;
  /** Escalão do perfil analisado. */
  isCurrent: boolean;
}

export interface EditorialEngagementData {
  rate: number;
  benchmark: number;
  deltaPct: number;
  hasBenchmark: boolean;
  /** Interacções por cada 1 000 seguidores — derivado da mesma taxa. */
  perThousand: number;
  tierLabel: string;
  tierRange: string;
  dominantFormat: string;
  postsAnalyzed: number;
  windowLabel: string | null;
  datasetVersion: string | null;
  status: { tone: StatusTone; label: string };
  /** Bandas de referência disponíveis sem I/O adicional. */
  tierBands: readonly EngagementTierBand[];
}

function finite(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function deriveStatus(
  hasBenchmark: boolean,
  deltaPct: number,
): { tone: StatusTone; label: string } {
  if (!hasBenchmark) {
    return { tone: "neutral", label: "Sem referência publicada" };
  }
  // Mesma regra de ±10% já usada pelo motor de benchmark de produção.
  if (deltaPct >= 10) return { tone: "success", label: "Acima da referência" };
  if (deltaPct <= -10) return { tone: "warning", label: "Abaixo da referência" };
  return { tone: "neutral", label: "Alinhado com a referência" };
}

export function buildEditorialEngagementData(
  result: AdapterResult,
): EditorialEngagementData {
  const k = result.data.keyMetrics;
  const profile = result.data.profile;
  const meta = result.data.meta;

  const rate = finite(k.engagementRate);
  const benchmark = finite(k.engagementBenchmark);
  const deltaPct = finite(k.engagementDeltaPct);
  const hasBenchmark = benchmark > 0;

  const tierLabel = String(profile.tier ?? "");
  const tierRange = String(profile.tierRange ?? "");

  return {
    rate,
    benchmark,
    deltaPct,
    hasBenchmark,
    perThousand: Math.round(rate * 10 * 10) / 10,
    tierLabel,
    tierRange,
    dominantFormat: String(k.dominantFormat ?? ""),
    postsAnalyzed: finite(k.postsAnalyzed),
    windowLabel: meta.windowLabel ?? null,
    datasetVersion: meta.benchmarkDatasetVersion ?? null,
    status: deriveStatus(hasBenchmark, deltaPct),
    tierBands: hasBenchmark
      ? [
          {
            label: tierRange ? `${tierLabel} (${tierRange})` : tierLabel,
            value: benchmark,
            isCurrent: true,
          },
        ]
      : [],
  };
}
