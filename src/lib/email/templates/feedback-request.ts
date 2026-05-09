import {
  type RenderedEmail,
  escapeHtml,
  greetingHtml,
  greetingText,
  joinLines,
  p,
  pMuted,
  renderButtonHtml,
  wrapHtml,
} from "../shared";

export interface FeedbackRequestInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  reportUrl?: string | null;
  feedbackUrl?: string | null;
}

const SUBJECT = "Podes dar feedback ao teu relatório InstaBench?";
const HEADLINE = "O teu feedback ajuda-nos a melhorar";

export function renderFeedbackRequest(input: FeedbackRequestInput): RenderedEmail {
  const handle = input.instagramHandle ? `@${input.instagramHandle}` : "o teu perfil";
  const safeHandle = escapeHtml(handle);
  const feedbackUrl = input.feedbackUrl?.trim() || null;
  const reportUrl = input.reportUrl?.trim() || null;

  const ctaTextLines = feedbackUrl
    ? ["Dar feedback:", feedbackUrl]
    : ["Basta responderes a este email — três frases chegam."];

  const text = joinLines([
    greetingText(input.firstName),
    "",
    `Notámos que já consultaste o relatório de ${handle} — obrigado.`,
    "",
    "Gostaríamos de saber, em duas ou três frases, o que foi mais útil e o que falta melhorar.",
    "",
    ...ctaTextLines,
    "",
    ...(reportUrl && !feedbackUrl
      ? [`Caso precises de rever o relatório: ${reportUrl}`, ""]
      : []),
    "O teu input nesta fase pesa muito na direção do produto.",
    "",
    "—",
    "InstaBench",
  ]);

  const ctaHtml = feedbackUrl
    ? renderButtonHtml("Dar feedback", feedbackUrl)
    : pMuted("Basta responderes a este email — três frases chegam.");

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(`Notámos que já consultaste o relatório de <strong style="color:#0a0e1a;">${safeHandle}</strong> — obrigado.`),
    pMuted("Gostaríamos de saber, em duas ou três frases, o que foi mais útil e o que falta melhorar."),
    ctaHtml,
    `<div style="height:20px;"></div>`,
    reportUrl
      ? pMuted(`Caso precises de rever o relatório, podes <a href="${escapeHtml(reportUrl)}" target="_blank" rel="noopener noreferrer" style="color:#3772E5;text-decoration:underline;">abri-lo aqui</a>.`)
      : "",
    pMuted("O teu input nesta fase pesa muito na direção do produto."),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: SUBJECT,
    text,
    html: wrapHtml({ title: SUBJECT, headline: HEADLINE, bodyHtml }),
  };
}

renderFeedbackRequest.subject = SUBJECT;