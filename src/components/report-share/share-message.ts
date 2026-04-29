/**
 * Pure helper that builds a deterministic pt-PT teaser message used by
 * every share channel (WhatsApp, LinkedIn, Email, Copiar). Reads only
 * already-derived report data — no provider calls, no async work.
 *
 * The teaser surfaces 1–3 concrete signals (engagement vs. mediana,
 * tier de benchmark, cadência) para gerar curiosidade no destinatário
 * sem expor jargão técnico.
 */

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";

export interface ShareMessageInput {
  result: AdapterResult;
  url: string;
}

export interface ShareMessage {
  /** Texto curto pronto para WhatsApp/Email/Copiar (sem URL no fim). */
  text: string;
  /** Mesmo texto + URL — para canais que não anexam URL automaticamente. */
  textWithUrl: string;
  /** Subject pré-preenchido para mailto:. */
  emailSubject: string;
}

function formatPct(value: number): string {
  // 4.231 → "4,2%"; 0 → "0%"
  if (!Number.isFinite(value)) return "0%";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toString().replace(".", ",")}%`;
}

function formatCadence(perWeek: number): string | null {
  if (!Number.isFinite(perWeek) || perWeek <= 0) return null;
  const rounded = Math.round(perWeek * 10) / 10;
  const display = rounded.toString().replace(".", ",");
  return `${display} publicações/semana`;
}

export function buildShareMessage({ result, url }: ShareMessageInput): ShareMessage {
  const { data } = result;
  const handle = data.profile.username;
  const km = data.keyMetrics;
  const positioning = result.enriched.benchmarkSource;

  const engagement = formatPct(km.engagementRate);

  // Comparação face à mediana — só inclui se houver delta válido.
  let comparison: string | null = null;
  if (
    typeof km.engagementBenchmark === "number" &&
    km.engagementBenchmark > 0 &&
    typeof km.engagementDeltaPct === "number"
  ) {
    const delta = km.engagementDeltaPct;
    if (delta >= 10) comparison = "acima da mediana do setor";
    else if (delta <= -10) comparison = "abaixo da mediana do setor";
    else comparison = "alinhado com a mediana do setor";
  }

  const cadence = formatCadence(km.postingFrequencyWeekly);

  // Monta a frase principal de forma fluida.
  const parts: string[] = [];
  parts.push(`${engagement} de engagement`);
  if (comparison) parts.push(comparison);
  if (cadence) parts.push(cadence);

  const summary = parts.join(", ");
  const datasetTag = positioning.datasetVersion
    ? ` (benchmark ${positioning.datasetVersion})`
    : "";

  const text = `Análise pública de @${handle}: ${summary}${datasetTag}. Vê o relatório completo:`;
  const textWithUrl = `${text}\n${url}`;
  const emailSubject = `Análise de @${handle} no Instagram`;

  return { text, textWithUrl, emailSubject };
}
