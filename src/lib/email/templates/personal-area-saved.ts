import {
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

const SUBJECT = "O teu relatório InstaBench foi guardado";
const HEADLINE = "Relatório guardado";
const PREHEADER = "Podes voltar a consultá-lo sempre que precisares.";

export function renderPersonalAreaSaved(
  input: PersonalAreaSavedInput,
): RenderedEmail {
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
    `Guardámos a análise de ${handle} na tua área pessoal.`,
    "",
    "Abrir a minha área:",
    url,
    "",
    "Durante a beta, este acesso é gratuito.",
    "",
    ...signatureText(),
  ]);

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(
      `Guardámos a análise de <strong style="color:#0a0e1a;">${safeHandle}</strong> na tua área pessoal.`,
    ),
    renderButtonHtml("Abrir a minha área", url),
    `<div style="height:20px;"></div>`,
    renderUrlFallbackHtml(url),
    `<div style="height:24px;"></div>`,
    pMuted("Durante a beta, este acesso é gratuito."),
    signatureHtml(),
  ].join("\n");

  return {
    subject: SUBJECT,
    text,
    html: wrapHtml({ title: SUBJECT, headline: HEADLINE, bodyHtml, preheader: PREHEADER }),
  };
}

renderPersonalAreaSaved.subject = SUBJECT;