/**
 * Shared helpers for the pt-PT beta email template module.
 * Pure rendering — no provider calls, no I/O.
 */

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

/**
 * Editable parts of a template. Used both by the admin editor (as the
 * shape of `defaults` and overrides) and by each template module as the
 * intermediate representation between `getXxxParts()` and `renderXxx()`.
 * Keeping these identical guarantees the editor preview matches what is
 * actually sent when no override exists.
 */
export interface EmailTemplateParts {
  subject: string;
  preheader: string;
  headline: string;
  body_html: string;
  body_text: string;
}

export interface BaseTemplateInput {
  firstName?: string | null;
  email?: string | null;
  instagramHandle?: string | null;
  reportUrl?: string | null;
  feedbackUrl?: string | null;
}

export const BRAND = "InstaBench";
export const SIGNATURE_NAME = "equipa InstaBench";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function firstNameOf(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

export function greetingText(name: string | null | undefined): string {
  const fn = firstNameOf(name);
  return fn ? `Olá ${fn},` : "Olá,";
}

export function greetingHtml(name: string | null | undefined): string {
  const fn = firstNameOf(name);
  return fn ? `Olá ${escapeHtml(fn)},` : "Olá,";
}

export function joinLines(lines: string[]): string {
  return lines.join("\n");
}

export function renderButtonHtml(label: string, url: string): string {
  const safeUrl = escapeHtml(url);
  const safeLabel = escapeHtml(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="background-color:#0a0e1a;border-radius:8px;">
      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;letter-spacing:0.02em;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${safeLabel}</a>
    </td>
  </tr>
</table>`;
}

export function renderUrlFallbackHtml(url: string): string {
  const safe = escapeHtml(url);
  return `<p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#78716c;">Em alternativa, copia o seguinte endereço:</p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#0a0e1a;word-break:break-all;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;padding:10px 12px;">${safe}</p>`;
}

export interface WrapHtmlInput {
  /** Used in <title> tag. */
  title: string;
  /** Headline shown at the top of the card (already plain text — escaped here). */
  headline: string;
  /** Body HTML — already escaped/sanitised by the caller. */
  bodyHtml: string;
  /** Hidden preview text shown in inbox lists (Gmail/Outlook/Apple Mail). */
  preheader?: string;
  /**
   * Optional absolute unsubscribe URL. When present, an extra footer row
   * with a one-click marketing unsubscribe link is rendered. Only set on
   * marketing/onboarding emails — never on pure transactional sends.
   */
  unsubscribeUrl?: string | null;
}

export function wrapHtml(input: WrapHtmlInput): string {
  const safeTitle = escapeHtml(input.title);
  const safeHeadline = escapeHtml(input.headline);
  const preheaderHtml = input.preheader
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:transparent;">${escapeHtml(input.preheader)}${"\u200c".repeat(100)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0e1a;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e7e5e4;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 8px 40px;">
              <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.18em;color:#3772E5;text-transform:uppercase;">${BRAND}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 0 40px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:600;color:#0a0e1a;">${safeHeadline}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;">
              ${input.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background-color:#fafaf9;border-top:1px solid #e7e5e4;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#78716c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;"><strong style="color:#0a0e1a;">${BRAND}</strong> · Análise competitiva para Instagram</p>
              ${input.unsubscribeUrl
                ? `<p style="margin:8px 0 0 0;font-size:12px;line-height:1.5;color:#78716c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Se já não queres receber estes emails, <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#3772E5;text-decoration:underline;">anula a subscrição</a>.</p>`
                : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Wrap plain text in a paragraph. */
export function p(text: string): string {
  return `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1c1917;">${text}</p>`;
}

/** Smaller secondary paragraph. */
export function pMuted(text: string): string {
  return `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#57534e;">${text}</p>`;
}

/** Plain-text sign-off block. Optional opening line ("Boa leitura,", "Obrigado pela ajuda,", etc.). */
export function signatureText(opening: string = "Até já,"): string[] {
  return [opening, `— ${SIGNATURE_NAME}`];
}

/** HTML sign-off block (muted paragraph). */
export function signatureHtml(opening: string = "Até já,"): string {
  return `<p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#57534e;">${escapeHtml(opening)}<br/>— ${escapeHtml(SIGNATURE_NAME)}</p>`;
}