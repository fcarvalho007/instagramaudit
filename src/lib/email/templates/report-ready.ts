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

export interface ReportReadyInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  /** Public report URL — required. */
  reportUrl: string;
}

const SUBJECT = "O teu relatório InstaBench já está pronto";
const HEADLINE = "O teu relatório está pronto";
const PREHEADER = "Análise completa disponível para consultares.";

export function renderReportReady(input: ReportReadyInput): RenderedEmail {
  if (!input.reportUrl || !input.reportUrl.trim()) {
    throw new Error("reportUrl is required for reportReady");
  }
  const handle = input.instagramHandle ? `@${input.instagramHandle}` : "o teu perfil";
  const safeHandle = escapeHtml(handle);
  const url = input.reportUrl.trim();

  const text = joinLines([
    greetingText(input.firstName),
    "",
    `A análise do perfil ${handle} já está disponível para consultares.`,
    "",
    "Abrir relatório:",
    url,
    "",
    "É um relatório beta — pode evoluir nos próximos dias com base no que aprendermos.",
    "Depois de explorares, agradecíamos imenso o teu feedback. Vamos contactar-te em breve para o pedir.",
    "",
    ...signatureText(),
  ]);

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(`A análise do perfil <strong style="color:#0a0e1a;">${safeHandle}</strong> já está disponível para consultares.`),
    renderButtonHtml("Abrir relatório", url),
    `<div style="height:20px;"></div>`,
    renderUrlFallbackHtml(url),
    `<div style="height:24px;"></div>`,
    pMuted("É um relatório <strong style=\"color:#0a0e1a;\">beta</strong> — pode evoluir nos próximos dias com base no que aprendermos."),
    pMuted("Depois de explorares, agradecíamos imenso o teu feedback. Vamos contactar-te em breve para o pedir."),
    signatureHtml(),
  ].join("\n");

  return {
    subject: SUBJECT,
    text,
    html: wrapHtml({ title: SUBJECT, headline: HEADLINE, bodyHtml, preheader: PREHEADER }),
  };
}

renderReportReady.subject = SUBJECT;