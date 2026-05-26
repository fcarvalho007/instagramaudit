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

export interface WelcomeBetaInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  /** Absolute URL to the public report (e.g. /analyze/{handle}). */
  reportUrl: string;
  /** Optional secondary CTA URL ("Dar feedback…"). Omitted when null. */
  feedbackUrl?: string | null;
  /** Optional one-click unsubscribe URL (marketing footer). */
  unsubscribeUrl?: string | null;
}

const SUBJECT = "Bem-vindo à beta — o que esperar daqui";
const HEADLINE = "Bem-vindo à beta";
const PREHEADER = "O que está aberto, o que é premium e como ajudar a melhorar.";

export function getWelcomeBetaParts(input: WelcomeBetaInput): EmailTemplateParts {
  if (!input.reportUrl || !input.reportUrl.trim()) {
    throw new Error("reportUrl is required for welcomeBeta");
  }
  const handle = input.instagramHandle
    ? `@${input.instagramHandle}`
    : "o teu perfil";
  const safeHandle = escapeHtml(handle);
  const url = input.reportUrl.trim();
  const feedbackUrl = input.feedbackUrl?.trim() || null;
  const unsubscribeUrl = input.unsubscribeUrl?.trim() || null;

  const text = joinLines([
    greetingText(input.firstName),
    "",
    "Obrigado por entrares na beta.",
    "",
    "O InstaBench é uma ferramenta de análise editorial de perfis de Instagram — pensada para quem tem de tomar decisões rápidas sobre conteúdo, marca ou audiência. A ideia: cruzar os dados públicos do perfil com referências de mercado e devolver uma leitura clara, em vez de um dashboard de números.",
    "",
    "O projeto nasceu da prática docente — Frederico Carvalho, com 20 anos em marketing digital, sentia falta de uma ferramenta que alunos e clientes pudessem usar em poucos minutos. Esta é a primeira tentativa de resolver isso.",
    "",
    "O que esperar nesta fase:",
    "· 3 secções gratuitas (Visão geral · Diagnóstico · Desempenho parcial)",
    "· 3 secções premium (Conteúdo · Procura · Comparação)",
    "· Apenas Instagram, por agora — outras redes seguem se fizer sentido",
    "· A interface ainda muda; os dados não",
    "",
    `Abrir o relatório de ${handle}:`,
    url,
    "",
    "Se algo correr mal ou tiveres uma ideia, responde a este email. Esta beta existe para validar utilidade, e o input de quem usa pesa muito mais do que aparenta.",
    ...(feedbackUrl
      ? ["", "Dar feedback quando terminares a leitura:", feedbackUrl]
      : []),
    "",
    ...signatureText("Bom trabalho,"),
    ...(unsubscribeUrl
      ? ["", "Se já não queres receber estes emails, anula a subscrição:", unsubscribeUrl]
      : []),
  ]);

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p("Obrigado por entrares na beta."),
    p(
      `O <strong style="color:#0a0e1a;">InstaBench</strong> é uma ferramenta de análise editorial de perfis de Instagram — pensada para quem tem de tomar decisões rápidas sobre conteúdo, marca ou audiência. A ideia: cruzar os dados públicos do perfil com referências de mercado e devolver uma leitura clara, em vez de um <em>dashboard</em> de números.`,
    ),
    pMuted(
      "O projeto nasceu da prática docente — Frederico Carvalho, com 20 anos em marketing digital, sentia falta de uma ferramenta que alunos e clientes pudessem usar em poucos minutos. Esta é a primeira tentativa de resolver isso.",
    ),
    p(
      `O que esperar nesta fase:<br/>· 3 secções <strong style="color:#0a0e1a;">gratuitas</strong> (Visão geral · Diagnóstico · Desempenho parcial)<br/>· 3 secções <strong style="color:#0a0e1a;">premium</strong> (Conteúdo · Procura · Comparação)<br/>· Apenas Instagram, por agora — outras redes seguem se fizer sentido<br/>· A interface ainda muda; os dados não`,
    ),
    renderButtonHtml(`Abrir relatório de ${handle}`, url),
    `<div style="height:20px;"></div>`,
    renderUrlFallbackHtml(url),
    `<div style="height:24px;"></div>`,
    pMuted(
      "Se algo correr mal ou tiveres uma ideia, responde a este email. Esta beta existe para validar utilidade, e o <em>input</em> de quem usa pesa muito mais do que aparenta.",
    ),
    ...(feedbackUrl
      ? [
          pMuted(
            `<a href="${escapeHtml(feedbackUrl)}" style="color:#3772E5;text-decoration:underline;">Dar feedback quando terminares a leitura</a>`,
          ),
        ]
      : []),
    signatureHtml("Bom trabalho,"),
  ].join("\n");

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    headline: HEADLINE,
    body_html: bodyHtml,
    body_text: text,
  };
}

export function renderWelcomeBeta(input: WelcomeBetaInput): RenderedEmail {
  const parts = getWelcomeBetaParts(input);
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

renderWelcomeBeta.subject = SUBJECT;