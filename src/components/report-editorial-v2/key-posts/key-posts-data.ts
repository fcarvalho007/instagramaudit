import type { AdapterResult, ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import {
  computeAmplitudeMultiplier,
  computeDeltaPct,
  computeSampleAverage,
} from "@/lib/report/key-post-stats";

import { describeWindow } from "../frequency/frequency-data";

/**
 * Adaptador de APRESENTAÇÃO das publicações-chave (Editorial V2, Fase E).
 *
 * Lê apenas dados já carregados do relatório:
 *   - `result.enriched.allPostsScatter` — todas as publicações da janela
 *     (amostra do gráfico e base da média, tal como em produção);
 *   - `result.enriched.topPosts[0]` — melhor publicação (lógica de produção);
 *   - `result.enriched.bottomPosts[last]` — pior publicação (lógica de
 *     produção; vazio quando há menos de 4 publicações elegíveis);
 *   - `result.enriched.windowRange` e `result.enriched.cadence` — contexto.
 *
 * Toda a aritmética vem de `@/lib/report/key-post-stats`, o mesmo helper que
 * o bloco de produção usa. Nenhuma fórmula nova, nenhum I/O, nenhum valor da
 * referência visual.
 */

export type KeyPost = ReportEnriched["topPosts"][number];
type ScatterPost = ReportEnriched["allPostsScatter"][number];

export interface KeyPostPoint {
  id: string;
  format: string;
  engagementPct: number;
  date: string;
  takenAtIso?: string;
  /** Posição horizontal 0–1, derivada da ordem cronológica real. */
  x: number;
  /** Posição vertical 0–1, derivada da escala real dos valores. */
  y: number;
  isBest: boolean;
  isWorst: boolean;
}

export type Amplitude =
  | { kind: "ratio"; ratio: number; label: string }
  | { kind: "points"; points: number; label: string }
  | { kind: "none"; label: string }
  | { kind: "unavailable"; label: string };

export interface EditorialKeyPostsData {
  /** Publicações representadas no gráfico (amostra real da janela). */
  points: KeyPostPoint[];
  sampleSize: number;
  /** Nº de publicações da amostra de performance (melhor/pior). */
  performanceSampleSize: number;
  average: number;
  /** Escala real do eixo Y (valores mínimos/máximos observados). */
  scale: { min: number; max: number };
  averageY: number;
  best: KeyPost | null;
  worst: KeyPost | null;
  hasComparison: boolean;
  bestDeltaPct: number | null;
  worstDeltaPct: number | null;
  amplitude: Amplitude;
  windowLabel: string;
  calculationNote: string;
  /** True quando todos os valores da amostra são iguais. */
  flatSample: boolean;
}

function finite(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function fmtPt(n: number, decimals = 2): string {
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function timeOf(p: ScatterPost, index: number): number {
  if (typeof p.takenAtIso === "string" && p.takenAtIso.length > 0) {
    const t = Date.parse(p.takenAtIso);
    if (Number.isFinite(t)) return t;
  }
  return index;
}

export function buildAmplitude(best: number, worst: number): Amplitude {
  const b = finite(best);
  const w = finite(worst);
  if (b === w) {
    return { kind: "none", label: "Sem amplitude mensurável" };
  }
  const ratio = computeAmplitudeMultiplier(b, w);
  if (w > 0 && ratio > 1) {
    return { kind: "ratio", ratio, label: `${ratio}× de amplitude` };
  }
  const points = b - w;
  if (points > 0) {
    return {
      kind: "points",
      points,
      label: `${fmtPt(points)} pontos percentuais de diferença`,
    };
  }
  return { kind: "unavailable", label: "Amplitude não calculável" };
}

export function buildEditorialKeyPostsData(
  result: AdapterResult,
  performanceSampleSize = 0,
): EditorialKeyPostsData {
  const enriched = result.enriched;
  const scatter: ScatterPost[] = enriched.allPostsScatter ?? [];

  const best = enriched.topPosts?.[0] ?? null;
  const bottom = enriched.bottomPosts ?? [];
  const worstCandidate = bottom.length > 0 ? bottom[bottom.length - 1]! : null;
  const worst =
    worstCandidate && best && worstCandidate.id === best.id
      ? null
      : worstCandidate;
  const hasComparison = Boolean(best && worst);

  const average = computeSampleAverage(scatter);

  const values = scatter.map((p) => finite(p.engagementPct));
  const rawMin = values.length > 0 ? Math.min(...values) : 0;
  const rawMax = values.length > 0 ? Math.max(...values) : 0;
  const flatSample = values.length > 0 && rawMin === rawMax;

  // Escala matemática real; a folga visual não altera nenhum rótulo numérico.
  const min = Math.min(rawMin, average);
  const max = Math.max(rawMax, average);
  const span = max - min;
  const pad = span > 0 ? span * 0.12 : Math.max(max, 1) * 0.2;
  const domainMin = Math.max(0, min - pad);
  const domainMax = max + pad;
  const domainSpan = domainMax - domainMin || 1;
  const yOf = (v: number) => (finite(v) - domainMin) / domainSpan;

  // Ordem cronológica real das publicações (o dataset vem ordenado por
  // engagement descendente; a apresentação usa o tempo).
  const chronological = scatter
    .map((p, i) => ({ p, t: timeOf(p, i) }))
    .sort((a, b) => a.t - b.t);
  const times = chronological.map((c) => c.t);
  const tMin = times.length > 0 ? times[0]! : 0;
  const tMax = times.length > 0 ? times[times.length - 1]! : 0;
  const tSpan = tMax - tMin;

  const points: KeyPostPoint[] = chronological.map(({ p, t }, index) => ({
    id: p.id,
    format: p.format,
    engagementPct: finite(p.engagementPct),
    date: p.date,
    ...(typeof p.takenAtIso === "string" && p.takenAtIso.length > 0
      ? { takenAtIso: p.takenAtIso }
      : {}),
    x:
      chronological.length <= 1
        ? 0.5
        : tSpan > 0
          ? (t - tMin) / tSpan
          : index / (chronological.length - 1),
    y: yOf(p.engagementPct),
    isBest: best !== null && p.id === best.id,
    isWorst: worst !== null && p.id === worst.id,
  }));

  const bestDeltaPct =
    best && average > 0 ? computeDeltaPct(best.engagementPct, average) : null;
  const worstDeltaPct =
    worst && average > 0 ? computeDeltaPct(worst.engagementPct, average) : null;

  const amplitude = hasComparison
    ? buildAmplitude(best!.engagementPct, worst!.engagementPct)
    : ({ kind: "unavailable", label: "Amplitude não calculável" } as Amplitude);

  const cadence = enriched.cadence;
  const windowLabel = describeWindow(
    String(cadence?.method ?? "insufficient"),
    finite(cadence?.windowDays),
  );

  return {
    points,
    sampleSize: scatter.length,
    performanceSampleSize,
    average,
    scale: { min: domainMin, max: domainMax },
    averageY: yOf(average),
    best,
    worst,
    hasComparison,
    bestDeltaPct,
    worstDeltaPct,
    amplitude,
    windowLabel,
    calculationNote:
      scatter.length > 0
        ? `Envolvimento por publicação nas ${scatter.length} publicações do ${windowLabel}. A média é a média aritmética destes valores.`
        : `Não há publicações com envolvimento registado no ${windowLabel}.`,
    flatSample,
  };
}

export { fmtPt as formatPtNumber };
