/**
 * Fonte única dos cálculos de "melhores e piores publicações".
 *
 * Extraído sem alteração de comportamento de
 * `src/components/report-redesign/v2/report-post-comparison.tsx`, para que a
 * camada Editorial V2 use exactamente a mesma aritmética do relatório de
 * produção — sem criar uma segunda fórmula.
 *
 * Todas as funções são puras e determinísticas. Nenhum I/O, nenhum valor
 * de referência, nenhum fallback estático.
 */

export interface EngagementSamplePost {
  engagementPct: number;
}

/**
 * Média aritmética do engagement da amostra. Devolve 0 quando a amostra
 * está vazia — mesmo comportamento que o bloco de produção.
 */
export function computeSampleAverage(
  posts: readonly EngagementSamplePost[],
): number {
  if (posts.length === 0) return 0;
  const total = posts.reduce((sum, p) => sum + finite(p.engagementPct), 0);
  return total / posts.length;
}

/**
 * Multiplicador de amplitude usado em produção: rácio arredondado entre o
 * melhor e o pior valor. Devolve 0 quando o denominador não é positivo
 * (nunca `Infinity` nem `NaN`).
 */
export function computeAmplitudeMultiplier(
  bestEngagement: number,
  worstEngagement: number,
): number {
  const best = finite(bestEngagement);
  const worst = finite(worstEngagement);
  return worst > 0 ? Math.round(best / worst) : 0;
}

/**
 * Diferença percentual face à média da amostra. Devolve 0 quando a média
 * não é positiva — não se calcula percentagem relativa a zero.
 */
export function computeDeltaPct(value: number, average: number): number {
  const avg = finite(average);
  if (avg <= 0) return 0;
  return ((finite(value) - avg) / avg) * 100;
}

function finite(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}
