import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { aggregateByWeekday } from "@/lib/report/weekday-counts";
import { buildCadenceLabelPt } from "@/lib/report/cadence-label";

import type { StatusTone } from "../primitives/status-pill";

/**
 * Adaptador de APRESENTAÇÃO da Frequência editorial (Editorial V2).
 *
 * Lê apenas valores já calculados em produção:
 *   - `keyMetrics.postingFrequencyWeekly` (= `cadence.weekly`);
 *   - `enriched.cadence` (método, amostra, janela, suficiência, nota);
 *   - `enriched.postingTimeline` (dias e contagens);
 *   - `enriched.windowRange` (limites ISO da janela).
 *
 * A agregação por dia da semana usa o helper partilhado
 * `aggregateByWeekday`, o mesmo do cartão de produção. Nenhuma regra de
 * cadência nova, nenhum I/O.
 */

export const WEEKDAY_LABELS_SHORT = [
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
  "Dom",
] as const;

export const WEEKDAY_LABELS_LONG = [
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
  "domingo",
] as const;

export interface EditorialWeekdayColumn {
  /** 0 = segunda … 6 = domingo. */
  weekday: number;
  short: string;
  long: string;
  posts: number;
  /** Altura proporcional em percentagem (0–100). */
  heightPct: number;
  /** Verdadeiro para todos os dias que partilham o máximo (empates incluídos). */
  isPeak: boolean;
}

export interface EditorialFrequencyData {
  weekly: number;
  sampleSize: number;
  windowDays: number;
  sufficient: boolean;
  method: string;
  notePt: string | null;
  /** Descrição da janela real, derivada do método de cadência. */
  windowLabel: string;
  /** Nota de cálculo com o contexto activo (nunca "quatro semanas" fixo). */
  calculationNote: string;
  cadenceLabel: string;
  status: { tone: StatusTone; label: string };
  columns: EditorialWeekdayColumn[];
  totalPosts: number;
  maxPosts: number;
  /** Dias com o valor máximo — mais do que um significa empate. */
  peakWeekdays: number[];
  hasTie: boolean;
  /** Dias da semana sem qualquer publicação na amostra. */
  silentWeekdays: number[];
  hasWeekdayData: boolean;
  windowRange: { startIso: string; endIso: string } | null;
}

function finite(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * Descreve a janela realmente usada pela cascata de cadência de produção.
 * Nunca assume 30 dias nem "quatro semanas".
 */
export function describeWindow(method: string, windowDays: number): string {
  if (method === "window_30d") return "últimos 30 dias";
  if (method === "window_90d") return "últimos 90 dias";
  if (method === "sample_span" && windowDays > 0) {
    return `período observado de ${windowDays} dias`;
  }
  return "publicações mais recentes disponíveis";
}

function deriveStatus(
  sufficient: boolean,
  weekly: number,
): { tone: StatusTone; label: string } {
  // Enquanto produção marcar a amostra como insuficiente, nunca é
  // apresentado um estado "saudável".
  if (!sufficient) return { tone: "neutral", label: "Amostra insuficiente" };
  if (weekly >= 3) return { tone: "success", label: "Ritmo consistente" };
  if (weekly >= 1) return { tone: "neutral", label: "Ritmo moderado" };
  return { tone: "warning", label: "Ritmo irregular" };
}

export function buildEditorialFrequencyData(
  result: AdapterResult,
): EditorialFrequencyData {
  const cadence = result.enriched.cadence;
  const timeline = result.enriched.postingTimeline ?? [];

  const weekly = finite(result.data.keyMetrics.postingFrequencyWeekly);
  const sampleSize = finite(cadence?.sampleSize);
  const windowDays = finite(cadence?.windowDays);
  const sufficient = Boolean(cadence?.sufficient);
  const method = String(cadence?.method ?? "insufficient");

  const buckets = aggregateByWeekday(timeline);
  const totalPosts = buckets.reduce((sum, b) => sum + b.posts, 0);
  const maxPosts = buckets.reduce((max, b) => Math.max(max, b.posts), 0);

  const columns: EditorialWeekdayColumn[] = buckets.map((b) => ({
    weekday: b.weekday,
    short: WEEKDAY_LABELS_SHORT[b.weekday]!,
    long: WEEKDAY_LABELS_LONG[b.weekday]!,
    posts: b.posts,
    heightPct: maxPosts > 0 ? Math.round((b.posts / maxPosts) * 100) : 0,
    isPeak: maxPosts > 0 && b.posts === maxPosts,
  }));

  const peakWeekdays = columns.filter((c) => c.isPeak).map((c) => c.weekday);
  const silentWeekdays = columns.filter((c) => c.posts === 0).map((c) => c.weekday);
  const windowLabel = describeWindow(method, windowDays);

  const calculationNote = sufficient
    ? `Distribuição de ${totalPosts} publicações por dia da semana (${windowLabel}).`
    : `${cadence?.notePt ?? "Amostra recente insuficiente"}. A distribuição abaixo mostra as ${totalPosts} publicações disponíveis, sem avaliação de ritmo.`;

  return {
    weekly,
    sampleSize,
    windowDays,
    sufficient,
    method,
    notePt: cadence?.notePt ?? null,
    windowLabel,
    calculationNote,
    cadenceLabel: buildCadenceLabelPt({ weekly, sufficient }),
    status: deriveStatus(sufficient, weekly),
    columns,
    totalPosts,
    maxPosts,
    peakWeekdays,
    hasTie: peakWeekdays.length > 1,
    silentWeekdays,
    hasWeekdayData: totalPosts > 0,
    windowRange: result.enriched.windowRange ?? null,
  };
}
