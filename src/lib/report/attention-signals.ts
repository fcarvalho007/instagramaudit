import type { TFunction } from "i18next";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";

/**
 * Sinais "o que merece atenção primeiro".
 *
 * Extraído (sem alteração de comportamento) de
 * `report-overview-attention-row.tsx` para poder ser consumido também pela
 * camada de apresentação Editorial V2. Puro: sem JSX, sem ícones, sem I/O.
 * O primeiro sinal devolvido é o mais forte.
 */

export type AttentionTone = "warn" | "bad" | "neutral";

export type AttentionIconKey =
  | "engagement-gap"
  | "cadence-vs-response"
  | "format-concentration";

export interface AttentionSignal {
  key: AttentionIconKey;
  title: string;
  body: string;
  tone: AttentionTone;
  /** Valor factual curto associado ao sinal (já formatado em pt-PT). */
  value: string;
}

const FORMAT_PT: Record<string, string> = {
  Carousels: "Carrosséis",
  Carousel: "Carrosséis",
  Sidecar: "Carrosséis",
  Carrosséis: "Carrosséis",
  Reels: "Reels",
  Reel: "Reels",
  Images: "Imagens",
  Image: "Imagens",
  Imagens: "Imagens",
};

export function formatAttentionPct(n: number): string {
  if (!Number.isFinite(n)) return "0,00%";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

export function formatAttentionRhythm(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(1).replace(".", ",");
}

export function computeAttentionSignals(
  result: AdapterResult,
  t: TFunction<"report", undefined>,
): AttentionSignal[] {
  const k = result.data.keyMetrics;
  const benchmarkOk =
    result.coverage.benchmark === "real" && k.engagementBenchmark > 0;

  const out: AttentionSignal[] = [];

  // 1 · Engagement gap
  if (benchmarkOk && k.engagementDeltaPct <= -10) {
    const tone: AttentionTone = k.engagementDeltaPct <= -25 ? "bad" : "warn";
    out.push({
      key: "engagement-gap",
      title: t("attention.engagement_gap_title"),
      body: t("attention.engagement_gap_body", {
        rate: formatAttentionPct(k.engagementRate),
        benchmark: formatAttentionPct(k.engagementBenchmark),
      }),
      tone,
      value: formatAttentionPct(k.engagementRate),
    });
  }

  // 2 · Cadence vs response — só quando há benchmark e ritmo é alto
  if (
    benchmarkOk &&
    k.postingFrequencyWeekly >= 5 &&
    k.engagementDeltaPct <= -25
  ) {
    out.push({
      key: "cadence-vs-response",
      title: t("attention.cadence_vs_response_title"),
      body: t("attention.cadence_vs_response_body", {
        rhythm: formatAttentionRhythm(k.postingFrequencyWeekly),
      }),
      tone: "warn",
      value: `${formatAttentionRhythm(k.postingFrequencyWeekly)}/sem`,
    });
  }

  // 3 · Format concentration
  const breakdown = result.data.formatBreakdown ?? [];
  const nonZero = breakdown.filter((b) => (b.sharePct || 0) > 0).length;
  const formatLabel = FORMAT_PT[k.dominantFormat] ?? k.dominantFormat;
  if (
    formatLabel &&
    (k.dominantFormatShare >= 70 || (nonZero === 1 && k.dominantFormatShare > 0))
  ) {
    out.push({
      key: "format-concentration",
      title: t("attention.format_concentration_title"),
      body: t("attention.format_concentration_body", {
        format: formatLabel,
        share: k.dominantFormatShare,
      }),
      tone: "warn",
      value: `${Math.round(k.dominantFormatShare)}% ${formatLabel}`,
    });
  }

  return out;
}
