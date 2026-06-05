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

export interface PaymentConfirmedInput {
  firstName?: string | null;
  instagramHandle?: string | null;
  /** Display name of the purchased product (e.g. "Relatório completo"). */
  productName: string;
  /** Pre-formatted amount label (e.g. "9,00 €"). Caller MUST format. */
  amountLabel: string;
  /** Optional. Hidden gracefully when null/empty. */
  paymentMethod?: string | null;
  /** Optional. Hidden gracefully when null/empty. */
  paymentReference?: string | null;
  /** Public report URL — required. */
  reportUrl: string;
}

const SUBJECT = "Pagamento confirmado — relatório completo desbloqueado";
const HEADLINE = "Pagamento confirmado.";

function preheaderFor(handle: string | null | undefined): string {
  return handle
    ? `O relatório completo de @${handle} já está disponível na tua conta.`
    : "O teu relatório completo já está disponível na tua conta.";
}

function nonEmpty(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function receiptRowHtml(label: string, value: string): string {
  return `<tr>
  <td style="padding:10px 0;font-size:13px;line-height:1.5;color:#78716c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;width:42%;vertical-align:top;">${escapeHtml(label)}</td>
  <td style="padding:10px 0;font-size:14px;line-height:1.5;color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;text-align:right;vertical-align:top;">${escapeHtml(value)}</td>
</tr>`;
}

function receiptTotalRowHtml(label: string, value: string): string {
  return `<tr>
  <td style="padding:14px 0 0 0;border-top:1px solid #e7e5e4;font-size:13px;line-height:1.5;color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;width:42%;vertical-align:top;">${escapeHtml(label)}</td>
  <td style="padding:14px 0 0 0;border-top:1px solid #e7e5e4;font-size:16px;line-height:1.5;color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:700;text-align:right;vertical-align:top;">${escapeHtml(value)}</td>
</tr>`;
}

export function getPaymentConfirmedParts(
  input: PaymentConfirmedInput,
): EmailTemplateParts {
  if (!input.reportUrl || !input.reportUrl.trim()) {
    throw new Error("reportUrl is required for paymentConfirmed");
  }
  if (!input.productName || !input.productName.trim()) {
    throw new Error("productName is required for paymentConfirmed");
  }
  if (!input.amountLabel || !input.amountLabel.trim()) {
    throw new Error("amountLabel is required for paymentConfirmed");
  }

  const handle = nonEmpty(input.instagramHandle);
  const method = nonEmpty(input.paymentMethod);
  const reference = nonEmpty(input.paymentReference);
  const reportUrl = input.reportUrl.trim();
  const productName = input.productName.trim();
  const amountLabel = input.amountLabel.trim();
  const handleLabel = handle ? `@${handle}` : "o teu relatório";
  const preheader = preheaderFor(handle);

  // ---- HTML body ----
  const receiptRows: string[] = [];
  receiptRows.push(receiptRowHtml("Produto", productName));
  receiptRows.push(receiptRowHtml("Valor pago", amountLabel));
  if (method) receiptRows.push(receiptRowHtml("Método de pagamento", method));
  if (reference) receiptRows.push(receiptRowHtml("Referência", reference));
  receiptRows.push(receiptTotalRowHtml("Total", amountLabel));

  const receiptCardHtml = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:10px;margin:0 0 20px 0;">
  <tr>
    <td style="padding:18px 20px;">
      <p style="margin:0 0 12px 0;font-size:11px;line-height:1.4;letter-spacing:0.14em;color:#78716c;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;">Recibo</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${receiptRows.join("\n        ")}
      </table>
    </td>
  </tr>
</table>`;

  const greetingComma = input.firstName && input.firstName.trim()
    ? `, ${escapeHtml(input.firstName.trim().split(/\s+/)[0] ?? "")}`
    : "";

  const bodyHtml = [
    p(greetingHtml(input.firstName)),
    p(
      `Obrigado${greetingComma}. O relatório completo de <strong style="color:#0a0e1a;">${escapeHtml(handleLabel)}</strong> está desbloqueado e fica guardado na tua conta.`,
    ),
    receiptCardHtml,
    renderButtonHtml("Abrir relatório completo", reportUrl),
    `<div style="height:20px;"></div>`,
    renderUrlFallbackHtml(reportUrl),
    `<div style="height:20px;"></div>`,
    pMuted("Pagamento único, sem subscrição nem renovação automática."),
    pMuted(
      "Qualquer questão sobre o pagamento ou o relatório, responde a este email.",
    ),
    signatureHtml("Até já,"),
  ].join("\n");

  // ---- Plain text body ----
  const textReceiptLines: string[] = [];
  textReceiptLines.push(`Produto: ${productName}`);
  textReceiptLines.push(`Valor pago: ${amountLabel}`);
  if (method) textReceiptLines.push(`Método de pagamento: ${method}`);
  if (reference) textReceiptLines.push(`Referência: ${reference}`);
  textReceiptLines.push(`Total: ${amountLabel}`);

  const textGreetingComma = input.firstName && input.firstName.trim()
    ? `, ${input.firstName.trim().split(/\s+/)[0] ?? ""}`
    : "";

  const text = joinLines([
    greetingText(input.firstName),
    "",
    `Obrigado${textGreetingComma}.`,
    `O relatório completo de ${handleLabel} está desbloqueado e fica guardado na tua conta.`,
    "",
    "— Recibo —",
    ...textReceiptLines,
    "",
    "Abrir relatório completo:",
    reportUrl,
    "",
    "Pagamento único, sem subscrição nem renovação automática.",
    "",
    "Qualquer questão sobre o pagamento ou o relatório, responde a este email.",
    "",
    ...signatureText("Até já,"),
  ]);

  return {
    subject: SUBJECT,
    preheader,
    headline: HEADLINE,
    body_html: bodyHtml,
    body_text: text,
  };
}

export function renderPaymentConfirmed(
  input: PaymentConfirmedInput,
): RenderedEmail {
  const parts = getPaymentConfirmedParts(input);
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

renderPaymentConfirmed.subject = SUBJECT;