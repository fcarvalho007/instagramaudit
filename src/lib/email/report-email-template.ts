/**
 * Premium pt-PT transactional email template for the report delivery.
 * Inline styles only — broad email client compatibility. Light background
 * for editorial print-ready feel. No unsubscribe link (purely transactional,
 * triggered by an explicit user action).
 */

interface ReportEmailParams {
  recipientName: string | null;
  instagramUsername: string;
  signedUrl: string;
}

const BRAND = "InstaBench";
const SIGNED_URL_TTL_DAYS = 7;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildReportEmailSubject(instagramUsername: string): string {
  return `O relatório do perfil @${instagramUsername} está pronto`;
}

export function buildReportEmailHtml(params: ReportEmailParams): string {
  const username = escapeHtml(params.instagramUsername);
  const url = escapeHtml(params.signedUrl);
  const greeting = params.recipientName
    ? `Olá ${escapeHtml(params.recipientName.split(" ")[0])},`
    : "Olá,";

  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(buildReportEmailSubject(params.instagramUsername))}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0e1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e7e5e4;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 8px 40px;">
              <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.18em;color:#06b6d4;text-transform:uppercase;">${BRAND}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 0 40px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:600;color:#0a0e1a;">O relatório está pronto</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1c1917;">${greeting}</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1c1917;">A análise completa de <strong style="color:#0a0e1a;">@${username}</strong> já está disponível.</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#57534e;">Inclui benchmark por tier, leitura de métricas-chave e comparação com concorrentes.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#0a0e1a;border-radius:8px;">
                    <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;letter-spacing:0.02em;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Aceder ao relatório</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#78716c;">Em alternativa, copiar o seguinte endereço:</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#0a0e1a;word-break:break-all;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;padding:10px 12px;">${url}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#78716c;">O acesso ao ficheiro expira dentro de ${SIGNED_URL_TTL_DAYS} dias.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background-color:#fafaf9;border-top:1px solid #e7e5e4;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#78716c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;"><strong style="color:#0a0e1a;">${BRAND}</strong> · Relatórios premium para Instagram</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildReportEmailText(params: ReportEmailParams): string {
  const greeting = params.recipientName
    ? `Olá ${params.recipientName.split(" ")[0]},`
    : "Olá,";

  return [
    `${BRAND}`,
    "",
    "O relatório está pronto.",
    "",
    greeting,
    "",
    `A análise completa de @${params.instagramUsername} já está disponível.`,
    "Inclui benchmark por tier, leitura de métricas-chave e comparação com concorrentes.",
    "",
    "Aceder ao relatório:",
    params.signedUrl,
    "",
    `O acesso ao ficheiro expira dentro de ${SIGNED_URL_TTL_DAYS} dias.`,
    "",
    "—",
    `${BRAND} · Relatórios premium para Instagram`,
  ].join("\n");
}
