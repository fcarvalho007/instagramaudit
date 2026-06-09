/**
 * Template "verify-email" — confirmação amigável e simples.
 *
 * Tom: PT-PT, simpático, explica em 2 linhas o que é o AuditProfiles e
 * deixa claro que a confirmação serve apenas para garantir que o email
 * pertence a quem está a pedir o relatório. Não pede password.
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

export interface VerifyEmailInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  /** Absolute URL with the signed token (`/api/public/verify-email?token=…`). */
  magicLinkUrl: string;
  /** TTL para mostrar ao utilizador, em minutos. */
  expiresInMinutes: number;
}

const HEADLINE = "Confirma o teu email";
const PREHEADER =
  "Um clique para abrir o teu relatório. Validamos só por segurança.";

export function getVerifyEmailParts(
  input: VerifyEmailInput,
): EmailTemplateParts {
  if (!input.magicLinkUrl || !input.magicLinkUrl.trim()) {
    throw new Error("magicLinkUrl is required for verify-email");
  }
  const url = input.magicLinkUrl.trim();
  const minutes = Math.max(1, Math.round(input.expiresInMinutes));
  const handleLabel = input.instagramHandle
    ? `@${input.instagramHandle}`
    : null;
  const subject = handleLabel
    ? `Confirma o teu email para abrir o relatório de ${handleLabel}`
    : "Confirma o teu email para abrir o relatório";

  const text = joinLines([
    greetingText(input.firstName),
    "",
    "Obrigado por experimentares o AuditProfiles.",
    "",
    "Para abrir o relatório precisamos só de confirmar que este email é mesmo teu — é uma verificação rápida, por segurança, para garantir que ninguém pede análises em teu nome.",
    "",
    handleLabel
      ? `Confirma e abrimos o relatório de ${handleLabel}:`
      : "Confirma e abrimos o teu relatório:",
    url,
    "",
    `O link é válido durante ${minutes} minutos. Se não foste tu a pedir, podes ignorar este email sem qualquer problema.`,
    "",
    "Sobre o AuditProfiles: cruzamos os dados públicos de um perfil de Instagram com referências de mercado e devolvemos uma leitura editorial — em vez de mais um dashboard de números.",
    "",
    ...signatureText("Até já,"),
  ]);

  const safeUrl = escapeHtml(url);
  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p("Obrigado por experimentares o AuditProfiles."),
    p(
      `Para abrir o relatório precisamos só de confirmar que este email é mesmo teu — é uma verificação rápida, <strong style="color:#0a0e1a;">por segurança</strong>, para garantir que ninguém pede análises em teu nome.`,
    ),
    renderButtonHtml(
      handleLabel
        ? `Confirmar e abrir relatório de ${handleLabel}`
        : "Confirmar email e abrir relatório",
      url,
    ),
    `<div style="height:20px;"></div>`,
    renderUrlFallbackHtml(url),
    `<div style="height:8px;"></div>`,
    pMuted(
      `O link é válido durante <strong style="color:#0a0e1a;">${minutes} minutos</strong>. Se não foste tu a pedir, podes ignorar este email sem qualquer problema.`,
    ),
    `<div style="height:8px;"></div>`,
    pMuted(
      `<strong style="color:#0a0e1a;">Sobre o AuditProfiles:</strong> cruzamos os dados públicos de um perfil de Instagram com referências de mercado e devolvemos uma leitura editorial — em vez de mais um <em>dashboard</em> de números.`,
    ),
    signatureHtml("Até já,"),
  ].join("\n");

  return {
    subject,
    preheader: PREHEADER,
    headline: HEADLINE,
    body_html: bodyHtml,
    body_text: text,
  };
}

export function renderVerifyEmail(input: VerifyEmailInput): RenderedEmail {
  const parts = getVerifyEmailParts(input);
  return {
    subject: parts.subject,
    text: parts.body_text,
    html: wrapHtml({
      title: parts.subject,
      headline: parts.headline,
      bodyHtml: parts.body_html,
      preheader: parts.preheader,
      // Verificação = transactional, nunca incluir unsubscribe.
      unsubscribeUrl: null,
    }),
  };
}