import {
  type EmailTemplateParts,
  type RenderedEmail,
  escapeHtml,
  greetingHtml,
  greetingText,
  joinLines,
  p,
  pMuted,
  renderButtonHtml,
  renderUrlFallbackHtml,
  signatureHtml,
  signatureText,
  wrapHtml,
} from "../shared";

export interface ReportSummaryKpis {
  /** Followers (integer). */
  followers: number;
  /** Average engagement rate, in percent (e.g. 3.42 for 3.42 %). */
  engagementPct: number;
  /** Dominant format label, already pt-PT (e.g. "Carrosséis"). */
  dominantFormat: string;
  /** Δ vs benchmark (percentage points, can be negative). */
  benchmarkDeltaPp: number;
}

export interface ReportSummaryTopPost {
  /** Format label, pt-PT (e.g. "Reel", "Carrossel", "Imagem"). */
  format: string;
  /** Engagement % for this post. */
  engagementPct: number;
  /** Optional thumbnail URL (URL público do bucket `post-thumbnails`). */
  thumbnailUrl?: string | null;
  /** Optional permalink to the original post. */
  permalink?: string | null;
}

export interface ReportSummaryInput {
  firstName?: string | null;
  instagramHandle: string;
  /** Absolute URL to the public report (e.g. /analyze/{handle}). */
  reportUrl: string;
  kpis: ReportSummaryKpis;
  topPost: ReportSummaryTopPost;
  /** Optional one-click unsubscribe URL (marketing footer). */
  unsubscribeUrl?: string | null;
}

function formatInt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

function formatPct(n: number, fractionDigits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return `${new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n)} %`;
}

function formatDelta(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  const abs = Math.abs(rounded);
  return `${sign}${new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(abs)} pp`;
}

function buildSubject(handle: string): string {
  return `Resumo da análise de @${handle}`;
}

const HEADLINE = "Resumo do relatório";
const PREHEADER = "As 3 conclusões principais em 60 segundos.";

function buildInsights(
  handle: string,
  kpis: ReportSummaryKpis,
  topPost: ReportSummaryTopPost,
): string[] {
  const followers = formatInt(kpis.followers);
  const eng = formatPct(kpis.engagementPct);
  const delta = formatDelta(kpis.benchmarkDeltaPp);
  const benchmarkLine = Number.isFinite(kpis.benchmarkDeltaPp)
    ? kpis.benchmarkDeltaPp >= 0
      ? `Engagement médio em ${eng} — ${delta} acima da referência de mercado.`
      : `Engagement médio em ${eng} — ${delta} face à referência de mercado.`
    : `Engagement médio em ${eng}.`;
  return [
    `@${handle} tem ${followers} seguidores e o formato dominante é ${kpis.dominantFormat}.`,
    benchmarkLine,
    `O post de topo foi um ${topPost.format} com ${formatPct(topPost.engagementPct)} de engagement.`,
  ];
}

function insightListHtml(insights: string[]): string {
  const items = insights
    .map(
      (line, i) =>
        `<li style="margin:0 0 10px 0;padding-left:8px;font-size:15px;line-height:1.6;color:#1c1917;"><strong style="color:#0a0e1a;">${i + 1}.</strong> ${escapeHtml(line)}</li>`,
    )
    .join("\n");
  return `<ol style="margin:0 0 20px 0;padding:0 0 0 20px;list-style:none;">${items}</ol>`;
}

export function getReportSummaryParts(
  input: ReportSummaryInput,
): EmailTemplateParts {
  if (!input.reportUrl?.trim()) {
    throw new Error("reportUrl is required for reportSummary");
  }
  if (!input.instagramHandle?.trim()) {
    throw new Error("instagramHandle is required for reportSummary");
  }

  const handle = input.instagramHandle.replace(/^@/, "");
  const url = input.reportUrl.trim();
  const subject = buildSubject(handle);
  const insights = buildInsights(handle, input.kpis, input.topPost);
  const unsubscribeUrl = input.unsubscribeUrl?.trim() || null;

  const text = joinLines([
    greetingText(input.firstName),
    "",
    `Em vez de abrires já o relatório completo, deixamos as 3 conclusões principais sobre @${handle}:`,
    "",
    `1. ${insights[0]}`,
    `2. ${insights[1]}`,
    `3. ${insights[2]}`,
    "",
    "Ver relatório completo:",
    url,
    "",
    "O relatório tem o detalhe e a evidência por trás de cada conclusão — incluindo outras observações que não couberam neste resumo.",
    "",
    ...signatureText(),
    ...(unsubscribeUrl
      ? ["", "Se já não queres receber estes emails, anula a subscrição:", unsubscribeUrl]
      : []),
  ]);

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(
      `Em vez de abrires já o relatório completo, deixamos as <strong style="color:#0a0e1a;">3 conclusões principais</strong> sobre <strong style="color:#0a0e1a;">@${escapeHtml(handle)}</strong>:`,
    ),
    insightListHtml(insights),
    renderButtonHtml("Ver relatório completo", url),
    `<div style="height:20px;"></div>`,
    renderUrlFallbackHtml(url),
    `<div style="height:20px;"></div>`,
    pMuted(
      "O relatório tem o detalhe e a evidência por trás de cada conclusão — incluindo outras observações que não couberam neste resumo.",
    ),
    signatureHtml(),
  ].join("\n");

  return {
    subject,
    preheader: PREHEADER,
    headline: HEADLINE,
    body_html: bodyHtml,
    body_text: text,
  };
}

export function renderReportSummary(input: ReportSummaryInput): RenderedEmail {
  const parts = getReportSummaryParts(input);
  const unsubscribeUrl = input.unsubscribeUrl?.trim() || null;
  return {
    subject: parts.subject,
    text: parts.body_text,
    html: wrapHtml({
      title: parts.subject,
      headline: parts.headline,
      bodyHtml: parts.body_html,
      preheader: parts.preheader,
      unsubscribeUrl,
    }),
  };
}