/**
 * Template "report-access" — pós-onboarding (modo beta sem verificação).
 *
 * Enviado depois de uma conta nova ser criada e do relatório abrir
 * imediatamente no navegador. Serve dois propósitos:
 *
 *   1. Confirmar amigavelmente que o relatório está pronto e dar o link
 *      directo para reabrir o resultado.
 *   2. Entregar um link seguro de acesso à área pessoal (magic link
 *      assinado, TTL longo) para que o utilizador possa voltar mais tarde
 *      sem precisar de password.
 *
 * Tom: PT-PT, simpático, transparente. Explica o que é o AuditProfiles e
 * deixa claro que o link de acesso é apenas conveniência — nunca pede
 * password nem expõe credenciais.
 */

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

export interface ReportAccessInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  /** Link público do relatório (ex.: /analyze/<handle>). */
  reportUrl: string;
  /** Magic link assinado para reabrir o relatório / aceder à conta. */
  accountAccessUrl: string;
  /** TTL do magic link em dias (apenas para copy). */
  accessExpiresInDays: number;
}

const HEADLINE = "O teu relatório está pronto";
const PREHEADER =
  "Abrimos já o resultado no browser. Aqui ficam os links para voltares quando quiseres.";

export function getReportAccessParts(
  input: ReportAccessInput,
): EmailTemplateParts {
  if (!input.reportUrl?.trim()) {
    throw new Error("reportUrl is required for report-access");
  }
  if (!input.accountAccessUrl?.trim()) {
    throw new Error("accountAccessUrl is required for report-access");
  }
  const reportUrl = input.reportUrl.trim();
  const accessUrl = input.accountAccessUrl.trim();
  const days = Math.max(1, Math.round(input.accessExpiresInDays));
  const handleLabel = input.instagramHandle
    ? `@${input.instagramHandle}`
    : null;

  const subject = handleLabel
    ? `O teu relatório de ${handleLabel} está pronto`
    : "O teu relatório AuditProfiles está pronto";

  const text = joinLines([
    greetingText(input.firstName),
    "",
    "Obrigado por experimentares o AuditProfiles — o teu relatório já abriu no browser.",
    "",
    handleLabel
      ? `Reabrir o relatório de ${handleLabel}:`
      : "Reabrir o relatório:",
    reportUrl,
    "",
    "Para voltares mais tarde sem teres de escrever password, guarda este link de acesso seguro:",
    accessUrl,
    "",
    `O link de acesso fica válido durante ${days} dias. Não partilhes — é só para ti.`,
    "",
    "Sobre o AuditProfiles: cruzamos dados públicos do Instagram com referências de mercado e devolvemos uma leitura editorial — não mais um dashboard de números. Estamos em beta privado, por isso o teu feedback conta muito.",
    "",
    "Se não foste tu a pedir este relatório, podes ignorar este email — não criámos nenhuma password nem partilhámos os teus dados.",
    "",
    ...signatureText("Até já,"),
  ]);

  const safeReport = escapeHtml(reportUrl);
  const safeAccess = escapeHtml(accessUrl);

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(
      "Obrigado por experimentares o AuditProfiles — o teu relatório já abriu no browser.",
    ),
    renderButtonHtml(
      handleLabel
        ? `Reabrir relatório de ${handleLabel}`
        : "Reabrir o relatório",
      reportUrl,
    ),
    `<div style="height:12px;"></div>`,
    renderUrlFallbackHtml(reportUrl),
    `<div style="height:24px;"></div>`,
    p(
      `Para voltares mais tarde <strong style="color:#0a0e1a;">sem teres de escrever password</strong>, guarda este link de acesso seguro:`,
    ),
    renderButtonHtml("Aceder à minha conta", accessUrl),
    `<div style="height:12px;"></div>`,
    renderUrlFallbackHtml(accessUrl),
    `<div style="height:8px;"></div>`,
    pMuted(
      `O link de acesso fica válido durante <strong style="color:#0a0e1a;">${days} dias</strong>. Não partilhes — é pessoal e intransmissível.`,
    ),
    `<div style="height:8px;"></div>`,
    pMuted(
      `<strong style="color:#0a0e1a;">Sobre o AuditProfiles:</strong> cruzamos dados públicos do Instagram com referências de mercado e devolvemos uma leitura editorial — não mais um <em>dashboard</em> de números. Estamos em beta privado; o teu feedback ajuda-nos a calibrar.`,
    ),
    `<div style="height:8px;"></div>`,
    pMuted(
      `Se não foste tu a pedir este relatório, podes ignorar este email — não criámos password nem partilhámos dados teus.`,
    ),
    signatureHtml("Até já,"),
  ].join("\n");

  // Suprime warning sobre URLs não usadas no rumo HTML (já vão escapadas
  // através de renderButtonHtml / renderUrlFallbackHtml).
  void safeReport;
  void safeAccess;

  return {
    subject,
    preheader: PREHEADER,
    headline: HEADLINE,
    body_html: bodyHtml,
    body_text: text,
  };
}

export function renderReportAccess(input: ReportAccessInput): RenderedEmail {
  const parts = getReportAccessParts(input);
  return {
    subject: parts.subject,
    text: parts.body_text,
    html: wrapHtml({
      title: parts.subject,
      headline: parts.headline,
      bodyHtml: parts.body_html,
      preheader: parts.preheader,
      // Transactional — sem unsubscribe.
      unsubscribeUrl: null,
    }),
  };
}