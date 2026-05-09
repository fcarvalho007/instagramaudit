import {
  type RenderedEmail,
  escapeHtml,
  greetingHtml,
  greetingText,
  joinLines,
  p,
  pMuted,
  signatureHtml,
  signatureText,
  wrapHtml,
} from "../shared";

export interface RequestReceivedInput {
  firstName?: string | null;
  instagramHandle?: string | null;
}

const SUBJECT = "Recebemos o teu pedido beta do InstaBench";
const HEADLINE = "Pedido recebido";
const PREHEADER = "Vamos rever manualmente e enviamos assim que estiver pronto.";

function handleLabel(handle: string | null | undefined): string {
  return handle ? `@${handle}` : "o teu perfil de Instagram";
}

export function renderRequestReceived(input: RequestReceivedInput): RenderedEmail {
  const handle = handleLabel(input.instagramHandle);
  const safeHandle = escapeHtml(handle);

  const text = joinLines([
    greetingText(input.firstName),
    "",
    `Recebemos o teu pedido para analisar ${handle}.`,
    "",
    "Durante a fase beta, cada relatório é revisto manualmente antes de ser enviado.",
    "Vais receber um email assim que estiver pronto — normalmente entre algumas horas e um dia útil.",
    "",
    "Obrigado pela paciência. Esta validação manual permite-nos garantir qualidade enquanto refinamos o produto.",
    "",
    ...signatureText(),
  ]);

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(`Recebemos o teu pedido para analisar <strong style="color:#0a0e1a;">${safeHandle}</strong>.`),
    pMuted(
      "Durante a fase beta, cada relatório é revisto manualmente antes de ser enviado. Vais receber um email assim que estiver pronto — normalmente entre algumas horas e um dia útil.",
    ),
    pMuted(
      "Obrigado pela paciência. Esta validação manual permite-nos garantir qualidade enquanto refinamos o produto.",
    ),
    signatureHtml(),
  ].join("\n");

  return {
    subject: SUBJECT,
    text,
    html: wrapHtml({ title: SUBJECT, headline: HEADLINE, bodyHtml, preheader: PREHEADER }),
  };
}

renderRequestReceived.subject = SUBJECT;