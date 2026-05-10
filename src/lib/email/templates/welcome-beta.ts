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

export interface WelcomeBetaInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  /** Absolute URL to the public report (e.g. /analyze/{handle}). */
  reportUrl: string;
}

const SUBJECT = "Bem-vindo à beta do InstaBench";
const HEADLINE = "A tua análise está desbloqueada";
const PREHEADER = "Estamos a validar o produto e o teu feedback conta.";

export function renderWelcomeBeta(input: WelcomeBetaInput): RenderedEmail {
  if (!input.reportUrl || !input.reportUrl.trim()) {
    throw new Error("reportUrl is required for welcomeBeta");
  }
  const handle = input.instagramHandle
    ? `@${input.instagramHandle}`
    : "o teu perfil";
  const safeHandle = escapeHtml(handle);
  const url = input.reportUrl.trim();

  const text = joinLines([
    greetingText(input.firstName),
    "",
    `Acabaste de desbloquear a análise completa de ${handle}. Bem-vindo à beta privada do InstaBench.`,
    "",
    "O InstaBench é uma ferramenta de benchmark para perfis de Instagram em pt-PT. Mostra o desempenho do perfil, compara com referências do mercado e dá pistas práticas para melhorar conteúdo.",
    "",
    "Estamos em fase de validação do MVP. Daqui a uns dias vamos pedir-te 2 minutos de feedback. Se já tiveres ideias ou dúvidas, basta responder a este email.",
    "",
    "Abrir o meu relatório:",
    url,
    "",
    "Podes voltar a este relatório a qualquer momento — fica guardado na tua área pessoal.",
    "",
    ...signatureText(),
  ]);

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(
      `Acabaste de desbloquear a análise completa de <strong style="color:#0a0e1a;">${safeHandle}</strong>. Bem-vindo à beta privada do InstaBench.`,
    ),
    p(
      `O <strong style="color:#0a0e1a;">InstaBench</strong> é uma ferramenta de benchmark para perfis de Instagram em pt-PT. Mostra o desempenho do perfil, compara com referências do mercado e dá pistas práticas para melhorar conteúdo.`,
    ),
    p(
      `Estamos em fase de validação do MVP. Daqui a uns dias vamos pedir-te <strong style="color:#0a0e1a;">2 minutos de feedback</strong>. Se já tiveres ideias ou dúvidas, basta responder a este email.`,
    ),
    renderButtonHtml("Abrir o meu relatório", url),
    `<div style="height:20px;"></div>`,
    renderUrlFallbackHtml(url),
    `<div style="height:24px;"></div>`,
    pMuted("Podes voltar a este relatório a qualquer momento — fica guardado na tua área pessoal."),
    signatureHtml(),
  ].join("\n");

  return {
    subject: SUBJECT,
    text,
    html: wrapHtml({ title: SUBJECT, headline: HEADLINE, bodyHtml, preheader: PREHEADER }),
  };
}

renderWelcomeBeta.subject = SUBJECT;