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

export interface PersonalAreaSavedInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  /** Absolute URL to the user's personal area (e.g. /app/reports). */
  appUrl: string;
}

const SUBJECT = "O relatório foi guardado na tua área pessoal";
const HEADLINE = "Área pessoal guardada";
const PREHEADER = "Acede sempre que precisares.";

export function getPersonalAreaSavedParts(
  input: PersonalAreaSavedInput,
): EmailTemplateParts {
  if (!input.appUrl || !input.appUrl.trim()) {
    throw new Error("appUrl is required for personalAreaSaved");
  }
  const handle = input.instagramHandle
    ? `@${input.instagramHandle}`
    : "o teu perfil";
  const safeHandle = escapeHtml(handle);
  const url = input.appUrl.trim();

  const text = joinLines([
    greetingText(input.firstName),
    "",
    `A análise de ${handle} foi guardada na tua área pessoal.`,
    "",
    "Abrir área pessoal:",
    url,
    "",
    "Durante a beta, o acesso é gratuito e os relatórios ficam disponíveis sem prazo. Se mais tarde houver um plano pago, quem está aqui agora terá condições de utilizador inicial.",
    "",
    ...signatureText(),
  ]);

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(
      `A análise de <strong style="color:#0a0e1a;">${safeHandle}</strong> foi guardada na tua área pessoal.`,
    ),
    renderButtonHtml("Abrir área pessoal", url),
    `<div style="height:20px;"></div>`,
    renderUrlFallbackHtml(url),
    `<div style="height:24px;"></div>`,
    pMuted(
      "Durante a beta, o acesso é gratuito e os relatórios ficam disponíveis sem prazo. Se mais tarde houver um plano pago, quem está aqui agora terá condições de utilizador inicial.",
    ),
    signatureHtml(),
  ].join("\n");

  return {
    subject: SUBJECT,
    preheader: PREHEADER,
    headline: HEADLINE,
    body_html: bodyHtml,
    body_text: text,
  };
}

export function renderPersonalAreaSaved(
  input: PersonalAreaSavedInput,
): RenderedEmail {
  const parts = getPersonalAreaSavedParts(input);
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

renderPersonalAreaSaved.subject = SUBJECT;