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
  /** Optional secondary CTA URL ("Dar feedback…"). Omitted when null. */
  feedbackUrl?: string | null;
}

const SUBJECT = "Bem-vindo ao piloto InstaBench";
const HEADLINE = "A tua análise está desbloqueada";
const PREHEADER =
  "Estamos a validar o MVP com utilizadores reais — o teu feedback conta.";

export function renderWelcomeBeta(input: WelcomeBetaInput): RenderedEmail {
  if (!input.reportUrl || !input.reportUrl.trim()) {
    throw new Error("reportUrl is required for welcomeBeta");
  }
  const handle = input.instagramHandle
    ? `@${input.instagramHandle}`
    : "o teu perfil";
  const safeHandle = escapeHtml(handle);
  const url = input.reportUrl.trim();
  const feedbackUrl = input.feedbackUrl?.trim() || null;

  const text = joinLines([
    greetingText(input.firstName),
    "",
    `Acabaste de desbloquear a análise completa de ${handle}. Bem-vindo ao piloto privado do InstaBench.`,
    "",
    "O InstaBench é uma ferramenta de benchmark para perfis de Instagram em pt-PT. Mostra o desempenho do perfil, compara com referências do mercado e dá pistas práticas para melhorar conteúdo.",
    "",
    "Estamos em fase de validação do MVP: queremos perceber se um relatório simples ajuda a tomar melhores decisões no Instagram. O teu uso e o teu feedback ajudam-nos a afinar o produto.",
    "",
    "Abrir o meu relatório:",
    url,
    "",
    "Podes voltar a este relatório a qualquer momento — fica guardado na tua área pessoal.",
    "",
    "Durante a beta, o acesso é gratuito.",
    ...(feedbackUrl
      ? ["", "Dar feedback quando terminares a leitura:", feedbackUrl]
      : []),
    "",
    ...signatureText(),
  ]);

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(
      `Acabaste de desbloquear a análise completa de <strong style="color:#0a0e1a;">${safeHandle}</strong>. Bem-vindo ao piloto privado do InstaBench.`,
    ),
    p(
      `O <strong style="color:#0a0e1a;">InstaBench</strong> é uma ferramenta de benchmark para perfis de Instagram em pt-PT. Mostra o desempenho do perfil, compara com referências do mercado e dá pistas práticas para melhorar conteúdo.`,
    ),
    p(
      `Estamos em fase de <strong style="color:#0a0e1a;">validação do MVP</strong>: queremos perceber se um relatório simples ajuda a tomar melhores decisões no Instagram. O teu uso e o teu feedback ajudam-nos a afinar o produto.`,
    ),
    renderButtonHtml("Abrir o meu relatório", url),
    `<div style="height:20px;"></div>`,
    renderUrlFallbackHtml(url),
    `<div style="height:24px;"></div>`,
    pMuted("Podes voltar a este relatório a qualquer momento — fica guardado na tua área pessoal."),
    pMuted("Durante a beta, o acesso é gratuito."),
    ...(feedbackUrl
      ? [
          pMuted(
            `<a href="${escapeHtml(feedbackUrl)}" style="color:#3772E5;text-decoration:underline;">Dar feedback quando terminares a leitura</a>`,
          ),
        ]
      : []),
    signatureHtml(),
  ].join("\n");

  return {
    subject: SUBJECT,
    text,
    html: wrapHtml({ title: SUBJECT, headline: HEADLINE, bodyHtml, preheader: PREHEADER }),
  };
}

renderWelcomeBeta.subject = SUBJECT;