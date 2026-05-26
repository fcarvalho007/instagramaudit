import {
  type EmailTemplateParts,
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

const HEADLINE = "Pedido recebido";
const PREHEADER = "A análise está a ser preparada — recebes o relatório por email.";
const FALLBACK_SUBJECT = "Recebemos o teu pedido";

function handleLabel(handle: string | null | undefined): string {
  return handle ? `@${handle}` : "o teu perfil de Instagram";
}

function buildSubject(handle: string | null | undefined): string {
  return handle ? `Recebemos o teu pedido para @${handle}` : FALLBACK_SUBJECT;
}

export function getRequestReceivedParts(
  input: RequestReceivedInput,
): EmailTemplateParts {
  const handle = handleLabel(input.instagramHandle);
  const safeHandle = escapeHtml(handle);
  const subject = buildSubject(input.instagramHandle);

  const text = joinLines([
    greetingText(input.firstName),
    "",
    `Recebemos o teu pedido para analisar ${handle}. A preparação do relatório está em curso — vais receber um email assim que estiver pronto, normalmente em poucos minutos.`,
    "",
    "Esta ferramenta está em fase beta. O objetivo é simples: perceber se a análise que entregamos é genuinamente útil para quem decide sobre conteúdo, audiência ou marca no Instagram.",
    "",
    "Por isso, depois de explorares o relatório, vamos pedir-te uma opinião curta. Vale ouro nesta fase.",
    "",
    ...signatureText(),
  ]);

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(
      `Recebemos o teu pedido para analisar <strong style="color:#0a0e1a;">${safeHandle}</strong>. A preparação do relatório está em curso — vais receber um email assim que estiver pronto, normalmente em poucos minutos.`,
    ),
    pMuted(
      "Esta ferramenta está em fase <strong style=\"color:#0a0e1a;\">beta</strong>. O objetivo é simples: perceber se a análise que entregamos é genuinamente útil para quem decide sobre conteúdo, audiência ou marca no Instagram.",
    ),
    pMuted(
      "Por isso, depois de explorares o relatório, vamos pedir-te uma opinião curta. Vale ouro nesta fase.",
    ),
    signatureHtml(),
  ].join("\n");

  return {
    subject,
    preheader: PREHEADER,
    headline: HEADLINE,
    body_html: bodyHtml,
    body_text: text,
  };
}

export function renderRequestReceived(input: RequestReceivedInput): RenderedEmail {
  const parts = getRequestReceivedParts(input);
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

renderRequestReceived.subject = FALLBACK_SUBJECT;