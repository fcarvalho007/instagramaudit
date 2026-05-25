import {
  type RenderedEmail,
  escapeHtml,
  greetingHtml,
  greetingText,
  joinLines,
  p,
  pMuted,
  renderButtonHtml,
  signatureHtml,
  signatureText,
  wrapHtml,
} from "../shared";

export interface CommercialFollowupInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  reportUrl?: string | null;
  /** Optional reply-to email used in the soft CTA (mailto:). */
  replyToEmail?: string | null;
  /** Optional checkout URL — primary CTA when present. */
  checkoutUrl?: string | null;
  /** Optional one-click unsubscribe URL (marketing footer). */
  unsubscribeUrl?: string | null;
}

const SUBJECT = "Próximos passos para o relatório completo";
const HEADLINE = "Próximos passos";
const PREHEADER = "Duas opções para desbloquear o relatório completo. Sem subscrição.";

export function renderCommercialFollowup(input: CommercialFollowupInput): RenderedEmail {
  const handle = input.instagramHandle ? `@${input.instagramHandle}` : "o teu perfil";
  const safeHandle = escapeHtml(handle);
  const checkoutUrl = input.checkoutUrl?.trim() || null;
  const reportUrl = input.reportUrl?.trim() || null;
  const replyTo = input.replyToEmail?.trim() || null;
  const unsubscribeUrl = input.unsubscribeUrl?.trim() || null;

  const text = joinLines([
    greetingText(input.firstName),
    "",
    "Obrigado pelo interesse em desbloquear o relatório completo. Os próximos passos:",
    "",
    "Duas opções:",
    `· 1 relatório — 7€, acesso vitalício às 6 secções de ${handle}`,
    "· Pack 5 relatórios — 28€ (5,60€ por relatório, poupas 20%), ideal para comparar várias contas (clientes, concorrentes ou hipóteses)",
    "",
    "Sem subscrição. Sem renovação automática.",
    "",
    ...(checkoutUrl ? ["Desbloquear:", checkoutUrl, ""] : []),
    `Se a tua dúvida é sobre uso académico — para alunos, turmas ou investigação — responde a este email${replyTo ? ` ou escreve para ${replyTo}` : ""}. Há condições específicas para docentes.`,
    ...(reportUrl ? ["", `Rever o relatório: ${reportUrl}`] : []),
    "",
    ...signatureText(),
    ...(unsubscribeUrl
      ? ["", "Se já não queres receber estes emails, anula a subscrição:", unsubscribeUrl]
      : []),
  ]);

  const ctaHtml = checkoutUrl
    ? renderButtonHtml("Desbloquear", checkoutUrl)
    : replyTo
    ? renderButtonHtml("Falar connosco", `mailto:${replyTo}`)
    : pMuted("Para falar connosco, basta responderes a este email.");

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(
      `Obrigado pelo interesse em desbloquear o relatório completo de <strong style="color:#0a0e1a;">${safeHandle}</strong>. Os próximos passos:`,
    ),
    p(
      `Duas opções:<br/>· <strong style="color:#0a0e1a;">1 relatório</strong> — 7€, acesso vitalício às 6 secções de ${safeHandle}<br/>· <strong style="color:#0a0e1a;">Pack 5 relatórios</strong> — 28€ (5,60€ por relatório, poupas 20%), ideal para comparar várias contas (clientes, concorrentes ou hipóteses)`,
    ),
    pMuted("Sem subscrição. Sem renovação automática."),
    ctaHtml,
    `<div style="height:20px;"></div>`,
    pMuted(
      `Se a tua dúvida é sobre uso académico — para alunos, turmas ou investigação — responde a este email${replyTo ? ` ou escreve para <a href="mailto:${escapeHtml(replyTo)}" style="color:#3772E5;text-decoration:underline;">${escapeHtml(replyTo)}</a>` : ""}. Há condições específicas para docentes.`,
    ),
    reportUrl
      ? pMuted(`Rever o relatório: <a href="${escapeHtml(reportUrl)}" target="_blank" rel="noopener noreferrer" style="color:#3772E5;text-decoration:underline;">abrir relatório</a>.`)
      : "",
    signatureHtml(),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: SUBJECT,
    text,
    html: wrapHtml({
      title: SUBJECT,
      headline: HEADLINE,
      bodyHtml,
      preheader: PREHEADER,
      unsubscribeUrl,
    }),
  };
}

renderCommercialFollowup.subject = SUBJECT;