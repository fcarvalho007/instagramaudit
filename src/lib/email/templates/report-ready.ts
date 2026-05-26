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

export interface ReportReadyInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  /** Public report URL — required. */
  reportUrl: string;
}

const HEADLINE = "Relatório pronto";
const PREHEADER = "Análise completa, com leitura editorial dos dados públicos.";
const FALLBACK_SUBJECT = "O teu relatório está disponível";

function buildSubject(handle: string | null | undefined): string {
  return handle ? `O teu relatório de @${handle} está disponível` : FALLBACK_SUBJECT;
}

export function getReportReadyParts(input: ReportReadyInput): EmailTemplateParts {
  if (!input.reportUrl || !input.reportUrl.trim()) {
    throw new Error("reportUrl is required for reportReady");
  }
  const handle = input.instagramHandle ? `@${input.instagramHandle}` : "o teu perfil";
  const safeHandle = escapeHtml(handle);
  const url = input.reportUrl.trim();
  const subject = buildSubject(input.instagramHandle);

  const text = joinLines([
    greetingText(input.firstName),
    "",
    `O relatório de ${handle} está pronto.`,
    "",
    "Abrir relatório:",
    url,
    "",
    "Tira uns minutos a explorar. Não é um dashboard de métricas — é uma leitura editorial dos dados públicos do perfil, cruzada com referências de mercado. Alguns blocos podem surpreender, no bom e no mau sentido.",
    "",
    "Esta é uma versão beta:",
    "· pode ainda haver pontas soltas — se vires algo estranho, dá-nos sinal;",
    "· vai melhorar nas próximas semanas com base em quem a usa.",
    "",
    "Daqui a uns dias, vamos pedir-te 2 minutos de feedback. O input de quem usa agora é o que define o caminho.",
    "",
    ...signatureText("Boa leitura,"),
  ]);

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(`O relatório de <strong style="color:#0a0e1a;">${safeHandle}</strong> está pronto.`),
    renderButtonHtml("Abrir relatório", url),
    `<div style="height:20px;"></div>`,
    renderUrlFallbackHtml(url),
    `<div style="height:24px;"></div>`,
    pMuted(
      "Tira uns minutos a explorar. Não é um <em>dashboard</em> de métricas — é uma leitura editorial dos dados públicos do perfil, cruzada com referências de mercado. Alguns blocos podem surpreender, no bom e no mau sentido.",
    ),
    pMuted(
      "Esta é uma versão <strong style=\"color:#0a0e1a;\">beta</strong>:<br/>· pode ainda haver pontas soltas — se vires algo estranho, dá-nos sinal;<br/>· vai melhorar nas próximas semanas com base em quem a usa.",
    ),
    pMuted(
      "Daqui a uns dias, vamos pedir-te 2 minutos de feedback. O <em>input</em> de quem usa agora é o que define o caminho.",
    ),
    signatureHtml("Boa leitura,"),
  ].join("\n");

  return {
    subject,
    preheader: PREHEADER,
    headline: HEADLINE,
    body_html: bodyHtml,
    body_text: text,
  };
}

export function renderReportReady(input: ReportReadyInput): RenderedEmail {
  const parts = getReportReadyParts(input);
  return {
    subject: parts.subject,
    text: parts.body_text,
    html: wrapHtml({
      title: parts.subject,
      headline: parts.headline,
      bodyHtml: parts.body_html,
      preheader: parts.preheader,
    }),
  };
}

renderReportReady.subject = FALLBACK_SUBJECT;