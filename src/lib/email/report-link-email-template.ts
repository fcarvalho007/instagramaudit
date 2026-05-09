/**
 * pt-PT email template para envio do link público do relatório beta.
 * Inline styles, sem unsubscribe (transactional, ação manual do admin).
 */

export interface ReportLinkEmailParams {
  recipientName: string | null;
  instagramUsername: string;
  publicUrl: string;
}

const BRAND = "InstaBench";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstName(name: string | null): string | null {
  if (!name) return null;
  const first = name.trim().split(/\s+/)[0];
  return first || null;
}

export function buildReportLinkEmailSubject(): string {
  return "O teu relatório InstaBench já está pronto";
}

export function buildReportLinkEmailText(params: ReportLinkEmailParams): string {
  const fn = firstName(params.recipientName);
  const greeting = fn ? `Olá ${fn},` : "Olá,";
  return [
    greeting,
    "",
    `A análise do perfil @${params.instagramUsername} já está disponível para consultares.`,
    "",
    "Abrir relatório:",
    params.publicUrl,
    "",
    "Este é um relatório beta — pode evoluir nos próximos dias com base no que aprendermos.",
    "",
    "Depois de explorares, agradecíamos imenso o teu feedback. Vamos contactar-te em breve para o pedir.",
    "",
    "—",
    `${BRAND}`,
  ].join("\n");
}

/** Short preview body for the admin confirmation modal. */
export function buildReportLinkPreviewBody(params: ReportLinkEmailParams): string {
  const fn = firstName(params.recipientName);
  const greeting = fn ? `Olá ${fn},` : "Olá,";
  return [
    greeting,
    "",
    `A análise do perfil @${params.instagramUsername} já está disponível.`,
    "",
    "Este é um relatório beta. Vamos pedir-te feedback em breve.",
  ].join("\n");
}

export function buildReportLinkEmailHtml(params: ReportLinkEmailParams): string {
  const username = escapeHtml(params.instagramUsername);
  const url = escapeHtml(params.publicUrl);
  const fn = firstName(params.recipientName);
  const greeting = fn ? `Olá ${escapeHtml(fn)},` : "Olá,";

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(buildReportLinkEmailSubject())}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0e1a;">
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
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:600;color:#0a0e1a;">O teu relatório está pronto</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1c1917;">${greeting}</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1c1917;">A análise do perfil <strong style="color:#0a0e1a;">@${username}</strong> já está disponível para consultares.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#0a0e1a;border-radius:8px;">
                    <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;letter-spacing:0.02em;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Abrir relatório</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 0 40px;">
              <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#78716c;">Em alternativa, copia o seguinte endereço:</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#0a0e1a;word-break:break-all;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;padding:10px 12px;">${url}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#57534e;">Este é um relatório <strong style="color:#0a0e1a;">beta</strong> — pode evoluir nos próximos dias com base no que aprendermos.</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#57534e;">Depois de explorares, agradecíamos imenso o teu feedback. Vamos contactar-te em breve para o pedir.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#78716c;">Obrigado por estares connosco nesta fase inicial.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background-color:#fafaf9;border-top:1px solid #e7e5e4;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#78716c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;"><strong style="color:#0a0e1a;">${BRAND}</strong> · Análise competitiva para Instagram</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}