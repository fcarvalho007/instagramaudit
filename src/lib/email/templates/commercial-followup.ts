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

export interface CommercialFollowupInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  pricingOption?: string | null;
  reportUrl?: string | null;
  /** Optional reply-to email used in the soft CTA (mailto:). */
  replyToEmail?: string | null;
}

const SUBJECT = "Próximo passo para analisar melhor o teu Instagram";
const HEADLINE = "Continuamos a conversa?";

export function renderCommercialFollowup(input: CommercialFollowupInput): RenderedEmail {
  const handle = input.instagramHandle ? `@${input.instagramHandle}` : "o teu perfil";
  const safeHandle = escapeHtml(handle);
  const pricing = input.pricingOption?.trim() || null;
  const reportUrl = input.reportUrl?.trim() || null;
  const replyTo = input.replyToEmail?.trim() || null;

  const pricingLine = pricing
    ? `Vimos que mostraste interesse na opção "${pricing}" — fica à vontade para responder e marcamos uma conversa curta.`
    : null;

  const text = joinLines([
    greetingText(input.firstName),
    "",
    `Esperamos que o relatório de ${handle} tenha sido útil.`,
    "",
    "Se quiseres aprofundar — comparar com mais concorrentes, monitorizar a evolução ao longo do tempo ou receber relatórios recorrentes — podemos preparar uma proposta adaptada ao teu caso.",
    ...(pricingLine ? ["", pricingLine] : []),
    "",
    replyTo
      ? `Para falar connosco, basta responderes a este email ou escreveres para ${replyTo}.`
      : "Para falar connosco, basta responderes a este email.",
    ...(reportUrl ? ["", `Rever o relatório: ${reportUrl}`] : []),
    "",
    "Sem pressão — respondemos quando fizer sentido para ti.",
    "",
    "—",
    "InstaBench",
  ]);

  const ctaUrl = replyTo ? `mailto:${replyTo}` : null;
  const ctaHtml = ctaUrl
    ? renderButtonHtml("Falar connosco", ctaUrl)
    : pMuted("Para falar connosco, basta responderes a este email.");

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(`Esperamos que o relatório de <strong style="color:#0a0e1a;">${safeHandle}</strong> tenha sido útil.`),
    pMuted(
      "Se quiseres aprofundar — comparar com mais concorrentes, monitorizar a evolução ao longo do tempo ou receber relatórios recorrentes — podemos preparar uma proposta adaptada ao teu caso.",
    ),
    pricing
      ? pMuted(`Vimos que mostraste interesse na opção <strong style="color:#0a0e1a;">${escapeHtml(pricing)}</strong> — fica à vontade para responder e marcamos uma conversa curta.`)
      : "",
    ctaHtml,
    `<div style="height:20px;"></div>`,
    reportUrl
      ? pMuted(`Podes também <a href="${escapeHtml(reportUrl)}" target="_blank" rel="noopener noreferrer" style="color:#3772E5;text-decoration:underline;">rever o relatório</a> antes de decidires.`)
      : "",
    pMuted("Sem pressão — respondemos quando fizer sentido para ti."),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: SUBJECT,
    text,
    html: wrapHtml({ title: SUBJECT, headline: HEADLINE, bodyHtml }),
  };
}

renderCommercialFollowup.subject = SUBJECT;