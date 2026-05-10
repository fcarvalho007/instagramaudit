import {
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
  /** Optional thumbnail URL (already proxied via /api/public/ig-thumb). */
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

const HEADLINE = "Resumo da tua análise";
const PREHEADER = "Os principais sinais do teu relatório InstaBench.";

function kpiCellHtml(label: string, value: string): string {
  const safeLabel = escapeHtml(label);
  const safeValue = escapeHtml(value);
  return `<td width="50%" valign="top" style="padding:14px 16px;background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:10px;">
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.16em;color:#78716c;text-transform:uppercase;margin:0 0 6px 0;">${safeLabel}</div>
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:22px;font-weight:600;color:#0a0e1a;line-height:1.2;font-variant-numeric:tabular-nums;">${safeValue}</div>
</td>`;
}

function kpiGridHtml(kpis: ReportSummaryKpis): string {
  const cells = [
    kpiCellHtml("Seguidores", formatInt(kpis.followers)),
    kpiCellHtml("Engagement médio", formatPct(kpis.engagementPct)),
    kpiCellHtml("Formato dominante", kpis.dominantFormat),
    kpiCellHtml("Δ vs benchmark", formatDelta(kpis.benchmarkDeltaPp)),
  ];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="8" border="0" style="border-collapse:separate;border-spacing:8px;margin:0 -8px 8px -8px;">
  <tr>${cells[0]}${cells[1]}</tr>
  <tr>${cells[2]}${cells[3]}</tr>
</table>`;
}

function topPostHtml(top: ReportSummaryTopPost): string {
  const safeFormat = escapeHtml(top.format);
  const safeEng = escapeHtml(formatPct(top.engagementPct));
  const thumbHtml = top.thumbnailUrl
    ? `<img src="${escapeHtml(top.thumbnailUrl)}" alt="" width="80" height="80" style="display:block;width:80px;height:80px;border-radius:8px;object-fit:cover;border:1px solid #e7e5e4;" />`
    : `<div style="width:80px;height:80px;border-radius:8px;background:linear-gradient(135deg,#3772E5,#7664E4);"></div>`;
  const linkOpen = top.permalink
    ? `<a href="${escapeHtml(top.permalink)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit;">`
    : "";
  const linkClose = top.permalink ? `</a>` : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px 0;background-color:#ffffff;border:1px solid #e7e5e4;border-radius:10px;">
  <tr>
    <td style="padding:14px;">
      ${linkOpen}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="top" style="padding-right:14px;">${thumbHtml}</td>
          <td valign="top">
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.16em;color:#78716c;text-transform:uppercase;margin:0 0 6px 0;">Post de topo</div>
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#0a0e1a;margin:0 0 4px 0;">${safeFormat}</div>
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#57534e;font-variant-numeric:tabular-nums;">Engagement: <strong style="color:#0a0e1a;">${safeEng}</strong></div>
          </td>
        </tr>
      </table>
      ${linkClose}
    </td>
  </tr>
</table>`;
}

export function renderReportSummary(input: ReportSummaryInput): RenderedEmail {
  if (!input.reportUrl?.trim()) {
    throw new Error("reportUrl is required for reportSummary");
  }
  if (!input.instagramHandle?.trim()) {
    throw new Error("instagramHandle is required for reportSummary");
  }

  const handle = input.instagramHandle.replace(/^@/, "");
  const url = input.reportUrl.trim();
  const subject = buildSubject(handle);

  const text = joinLines([
    greetingText(input.firstName),
    "",
    `Aqui ficam 4 números reais do teu raio-X de @${handle}:`,
    `· Seguidores: ${formatInt(input.kpis.followers)}`,
    `· Engagement médio: ${formatPct(input.kpis.engagementPct)}`,
    `· Formato dominante: ${input.kpis.dominantFormat}`,
    `· Δ vs benchmark: ${formatDelta(input.kpis.benchmarkDeltaPp)}`,
    "",
    `Post de topo — ${input.topPost.format} · Engagement ${formatPct(input.topPost.engagementPct)}`,
    "",
    "Este é um snapshot parcial. O relatório completo tem benchmarks por formato, comparação com concorrência e recomendações.",
    "",
    "Ver relatório completo:",
    url,
    "",
    ...signatureText(),
  ]);

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(
      `Aqui ficam <strong style="color:#0a0e1a;">4 números reais</strong> do teu raio-X de <strong style="color:#0a0e1a;">@${escapeHtml(handle)}</strong>.`,
    ),
    kpiGridHtml(input.kpis),
    topPostHtml(input.topPost),
    pMuted(
      "Este é um snapshot parcial. O relatório completo tem benchmarks por formato, comparação com concorrência e recomendações.",
    ),
    renderButtonHtml("Ver relatório completo", url),
    `<div style="height:20px;"></div>`,
    renderUrlFallbackHtml(url),
    signatureHtml(),
  ].join("\n");

  return {
    subject,
    text,
    html: wrapHtml({ title: subject, headline: HEADLINE, bodyHtml, preheader: PREHEADER }),
  };
}