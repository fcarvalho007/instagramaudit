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
  signatureHtml,
  signatureText,
  wrapHtml,
} from "../shared";

/**
 * Optional narrative insights derived from the free report.
 * When omitted (current admin flow), the template falls back to a
 * neutral "primeira leitura" paragraph — never broken placeholders.
 */
export interface CommercialFollowupInsights {
  /** Ex.: "está acima da média no engagement". Frase curta, sem ponto final. */
  engagementVerdict?: string | null;
  /** Ex.: "há margem nos comentários e na consistência dos formatos". */
  gapArea?: string | null;
}

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
  /** Optional narrative insights. Degrada para texto neutro se ausentes. */
  insights?: CommercialFollowupInsights | null;
}

const HEADLINE = "O relatório completo responde à pergunta seguinte";
const PREHEADER =
  "A comparação com concorrentes e a evolução temporal ficam no relatório completo.";

const UNLOCK_BULLETS: ReadonlyArray<string> = [
  "comparação com perfis semelhantes",
  "leitura temporal para perceber se o engagement está a subir ou a descer",
  "análise dos formatos que estão a puxar melhor desempenho",
  "identificação de oportunidades editoriais",
  "leitura completa das secções disponíveis",
];

function subjectFor(handleLabel: string): string {
  return `O que o relatório gratuito ainda não mostra sobre ${handleLabel}`;
}

export function getCommercialFollowupParts(
  input: CommercialFollowupInput,
): EmailTemplateParts {
  const handleRaw = input.instagramHandle?.replace(/^@/, "").trim() ?? "";
  const handleLabel = handleRaw ? `@${handleRaw}` : "o teu perfil";
  const safeHandle = escapeHtml(handleLabel);
  const checkoutUrl = input.checkoutUrl?.trim() || null;
  const reportUrl = input.reportUrl?.trim() || null;
  const replyTo = input.replyToEmail?.trim() || null;
  const unsubscribeUrl = input.unsubscribeUrl?.trim() || null;
  const engagementVerdict = input.insights?.engagementVerdict?.trim() || null;
  const gapArea = input.insights?.gapArea?.trim() || null;
  const hasInsights = Boolean(engagementVerdict && gapArea);

  const subject = subjectFor(handleLabel);

  const firstReadingLineText = hasInsights
    ? `o perfil ${engagementVerdict}, mas ainda ${gapArea}.`
    : `o que está a funcionar bem e onde ainda há margem para crescer.`;

  const firstReadingLineHtml = hasInsights
    ? `o perfil ${escapeHtml(engagementVerdict!)}, mas ainda ${escapeHtml(gapArea!)}.`
    : `o que está a funcionar bem e onde ainda há margem para crescer.`;

  // ---------- plain text ----------
  const text = joinLines([
    greetingText(input.firstName),
    "",
    `A análise gratuita de ${handleLabel} já mostrou uma primeira leitura:`,
    firstReadingLineText,
    "",
    "A pergunta seguinte é mais importante:",
    "isto é um bom resultado isolado, ou está realmente acima dos concorrentes directos?",
    "",
    "É essa leitura que fica no relatório completo.",
    "",
    "O relatório completo desbloqueia:",
    ...UNLOCK_BULLETS.map((b) => `· ${b};`),
    "",
    "Não é uma subscrição.",
    "Não há renovação automática.",
    "É um pagamento único para desbloquear este relatório.",
    "",
    ...(checkoutUrl
      ? ["Desbloquear relatório completo:", checkoutUrl, ""]
      : [
          replyTo
            ? `Para desbloquear, responde a este email ou escreve para ${replyTo}.`
            : "Para desbloquear, basta responderes a este email.",
          "",
        ]),
    "Se a análise for para uso académico, equipa ou clientes, responde a este email. Há formas melhores de usar isto em escala.",
    ...(reportUrl ? ["", `Rever o relatório gratuito: ${reportUrl}`] : []),
    "",
    ...signatureText(),
    ...(unsubscribeUrl
      ? ["", "Se já não queres receber estes emails, anula a subscrição:", unsubscribeUrl]
      : []),
  ]);

  // ---------- HTML ----------
  const insightCardHtml = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;background-color:#fafaf9;border-left:3px solid #3772E5;border-radius:6px;">
  <tr>
    <td style="padding:16px 20px;">
      <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;letter-spacing:0.14em;color:#3772E5;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Primeira leitura</p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#1c1917;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${firstReadingLineHtml}</p>
    </td>
  </tr>
</table>`;

  const unlockListHtml = `<p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#1c1917;">O relatório completo desbloqueia:</p>
<ul style="margin:0 0 20px 0;padding:0 0 0 20px;color:#1c1917;font-size:15px;line-height:1.7;">
${UNLOCK_BULLETS.map((b) => `  <li style="margin:0 0 6px 0;">${escapeHtml(b)};</li>`).join("\n")}
</ul>`;

  const reassuranceHtml = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;background-color:#f5f5f4;border-radius:6px;">
  <tr>
    <td style="padding:14px 18px;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#44403c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        Não é uma subscrição.<br/>
        Não há renovação automática.<br/>
        É um pagamento único para desbloquear este relatório.
      </p>
    </td>
  </tr>
</table>`;

  const ctaHtml = checkoutUrl
    ? renderButtonHtml("Desbloquear relatório completo", checkoutUrl)
    : replyTo
      ? renderButtonHtml("Responder para desbloquear", `mailto:${replyTo}`)
      : pMuted("Para desbloquear, basta responderes a este email.");

  const secondaryNoteHtml = pMuted(
    `Se a análise for para uso académico, equipa ou clientes, responde a este email${replyTo ? ` ou escreve para <a href="mailto:${escapeHtml(replyTo)}" style="color:#3772E5;text-decoration:underline;">${escapeHtml(replyTo)}</a>` : ""}. Há formas melhores de usar isto em escala.`,
  );

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(
      `A análise gratuita de <strong style="color:#0a0e1a;">${safeHandle}</strong> já mostrou uma primeira leitura:`,
    ),
    insightCardHtml,
    p(
      `<strong style="color:#0a0e1a;">A pergunta seguinte é mais importante:</strong> isto é um bom resultado isolado, ou está realmente acima dos concorrentes directos?`,
    ),
    p("É essa leitura que fica no relatório completo."),
    unlockListHtml,
    reassuranceHtml,
    ctaHtml,
    `<div style="height:20px;"></div>`,
    secondaryNoteHtml,
    reportUrl
      ? pMuted(
          `Rever o relatório gratuito: <a href="${escapeHtml(reportUrl)}" target="_blank" rel="noopener noreferrer" style="color:#3772E5;text-decoration:underline;">abrir relatório</a>.`,
        )
      : "",
    signatureHtml(),
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

export function renderCommercialFollowup(
  input: CommercialFollowupInput,
): RenderedEmail {
  const parts = getCommercialFollowupParts(input);
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
