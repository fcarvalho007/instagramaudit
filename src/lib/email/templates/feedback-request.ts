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

export interface FeedbackRequestInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  reportUrl?: string | null;
  feedbackUrl?: string | null;
  /** Whether the recipient has actually viewed the report. Defaults to true. */
  reportViewed?: boolean;
  /** Optional one-click unsubscribe URL (marketing footer). */
  unsubscribeUrl?: string | null;
}

const HEADLINE = "Pedido de feedback";
const PREHEADER = "Duas ou três frases chegam — ajuda-nos a melhorar.";
const FALLBACK_SUBJECT = "O teu relatório foi útil?";

function buildSubject(handle: string | null | undefined): string {
  return handle ? `O relatório de @${handle} foi útil?` : FALLBACK_SUBJECT;
}

export function getFeedbackRequestParts(
  input: FeedbackRequestInput,
): EmailTemplateParts {
  const handle = input.instagramHandle ? `@${input.instagramHandle}` : "o teu perfil";
  const safeHandle = escapeHtml(handle);
  const feedbackUrl = input.feedbackUrl?.trim() || null;
  const reportUrl = input.reportUrl?.trim() || null;
  const reportViewed = input.reportViewed ?? true;
  const subject = buildSubject(input.instagramHandle);
  const unsubscribeUrl = input.unsubscribeUrl?.trim() || null;

  const openingText = reportViewed
    ? `Vimos que já abriste o relatório de ${handle}. Obrigado por experimentares.`
    : `Quando tiveres oportunidade de abrir o relatório de ${handle}, agradecíamos o teu feedback.`;
  const openingHtml = reportViewed
    ? `Vimos que já abriste o relatório de <strong style="color:#0a0e1a;">${safeHandle}</strong>. Obrigado por experimentares.`
    : `Quando tiveres oportunidade de abrir o relatório de <strong style="color:#0a0e1a;">${safeHandle}</strong>, agradecíamos o teu feedback.`;

  const ctaTextLines = feedbackUrl
    ? ["Dar feedback:", feedbackUrl]
    : ["Basta responderes a este email — três frases chegam."];

  const text = joinLines([
    greetingText(input.firstName),
    "",
    openingText,
    "",
    "Podemos pedir-te 2 minutos? Estamos na fase de validar se a análise é genuinamente útil — ou se há outro caminho que faria mais sentido.",
    "",
    ...ctaTextLines,
    "",
    "Três perguntas, três frases curtas. O que te ajudou, o que faltou, o que mudarias.",
    "",
    ...(reportUrl && !feedbackUrl
      ? [`(Se quiseres rever o relatório antes: ${reportUrl})`, ""]
      : reportUrl
      ? [`(Se quiseres rever o relatório antes: ${reportUrl})`, ""]
      : []),
    ...signatureText("Obrigado pela ajuda,"),
    ...(unsubscribeUrl
      ? ["", "Se já não queres receber estes emails, anula a subscrição:", unsubscribeUrl]
      : []),
  ]);

  const ctaHtml = feedbackUrl
    ? renderButtonHtml("Dar feedback", feedbackUrl)
    : pMuted("Basta responderes a este email — três frases chegam.");

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(openingHtml),
    pMuted(
      "Podemos pedir-te 2 minutos? Estamos na fase de validar se a análise é genuinamente útil — ou se há outro caminho que faria mais sentido.",
    ),
    ctaHtml,
    `<div style="height:20px;"></div>`,
    feedbackUrl ? renderUrlFallbackHtml(feedbackUrl) : "",
    feedbackUrl ? `<div style="height:20px;"></div>` : "",
    pMuted("Três perguntas, três frases curtas. O que te ajudou, o que faltou, o que mudarias."),
    reportUrl
      ? pMuted(`Se quiseres rever o relatório antes: <a href="${escapeHtml(reportUrl)}" target="_blank" rel="noopener noreferrer" style="color:#3772E5;text-decoration:underline;">abrir relatório</a>.`)
      : "",
    signatureHtml("Obrigado pela ajuda,"),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    preheader: PREHEADER,
    headline: HEADLINE,
    body_html: bodyHtml,
    body_text: text,
  };
}

export function renderFeedbackRequest(
  input: FeedbackRequestInput,
): RenderedEmail {
  const parts = getFeedbackRequestParts(input);
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

renderFeedbackRequest.subject = FALLBACK_SUBJECT;