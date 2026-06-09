/**
 * Template `report_saved` — Step 3 da consolidação do ciclo de email.
 *
 * Substitui o par `welcome_beta` + `report_summary` enviado pelo
 * `lead-magnet-sequence`. Mensagem central:
 *   - o relatório ficou guardado;
 *   - contexto de créditos grátis (2 totais / 1 usado / 1 restante);
 *   - até 3 insights personalizados do relatório;
 *   - CTA primário "Analisar outro perfil";
 *   - link secundário "Abrir relatório de @handle".
 *
 * Todos os blocos opcionais degradam graciosamente quando os dados não
 * estão disponíveis (créditos escondidos, insights parciais ou linha
 * neutra). Nunca renderiza placeholders partidos.
 */

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

export interface ReportSavedCredits {
  totalFree: number;
  used: number;
  remaining: number;
}

export interface ReportSavedInsights {
  followersLabel?: string | null;
  dominantFormat?: string | null;
  engagementRate?: string | null;
  benchmarkDelta?: string | null;
  topPostFormat?: string | null;
  topPostEngagement?: string | null;
}

export interface ReportSavedInput {
  firstName?: string | null;
  instagramHandle: string;
  /** Absolute URL para o relatório (preferencialmente /reports/{snapshot_id}). */
  reportUrl: string;
  /** Absolute URL para iniciar nova análise (homepage por defeito). */
  analyzeAnotherUrl: string;
  /** "welcome" no primeiro unlock; "returning" em unlocks subsequentes. */
  variant?: "welcome" | "returning";
  /** Bloco de créditos. Quando ausente, é simplesmente omitido. */
  credits?: ReportSavedCredits | null;
  /** Insights individuais. Cada um omitido se faltar dado. */
  insights?: ReportSavedInsights | null;
  /** Opcional: link one-click unsubscribe (footer marketing). */
  unsubscribeUrl?: string | null;
  /** Opcional: URL para o fluxo de redefinição de palavra-passe. Quando
   *  presente, o template (variante `welcome`) inclui uma nota de segurança
   *  a explicar que nunca enviamos a palavra-passe por email e oferece o
   *  link de reset. NUNCA incluir a palavra-passe ou um valor mascarado. */
  resetPasswordUrl?: string | null;
}

const PREHEADER_DEFAULT =
  "Usaste 1 análise grátis. Ainda tens 1 crédito para comparar outro perfil.";
const PREHEADER_NEUTRAL =
  "O teu relatório ficou guardado. Podes consultá-lo abaixo.";

function subjectFor(handle: string): string {
  return `O relatório de @${handle} ficou guardado`;
}

function headlineFor(handle: string): string {
  return `O relatório de @${handle} ficou guardado`;
}

interface InsightLine {
  number: number;
  text: string;
}

function buildInsightLines(
  insights: ReportSavedInsights | null | undefined,
): InsightLine[] {
  if (!insights) return [];
  const out: InsightLine[] = [];
  let n = 1;

  if (insights.followersLabel && insights.dominantFormat) {
    out.push({
      number: n++,
      text: `${insights.followersLabel} seguidores, com ${insights.dominantFormat} como formato dominante.`,
    });
  }

  if (insights.engagementRate) {
    const delta = insights.benchmarkDelta
      ? ` — ${insights.benchmarkDelta} face à referência do escalão`
      : "";
    out.push({
      number: n++,
      text: `Engagement médio de ${insights.engagementRate}${delta}.`,
    });
  }

  if (insights.topPostFormat && insights.topPostEngagement) {
    out.push({
      number: n++,
      text: `O post de topo foi um ${insights.topPostFormat} com ${insights.topPostEngagement} de envolvimento.`,
    });
  }

  return out;
}

function renderCreditCardHtml(c: ReportSavedCredits, handle: string): string {
  const safeHandle = escapeHtml(`@${handle}`);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;">
  <tr>
    <td style="padding:16px 20px;">
      <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;letter-spacing:0.14em;color:#3772E5;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">As tuas análises grátis</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#1c1917;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        Começaste com <strong style="color:#0a0e1a;">${c.totalFree}</strong> análises.<br/>
        <strong style="color:#0a0e1a;">${c.used}</strong> usada em ${safeHandle}.<br/>
        <strong style="color:#0a0e1a;">${c.remaining}</strong> ainda disponível para analisar outro perfil.
      </p>
    </td>
  </tr>
</table>`;
}

function renderInsightsHtml(lines: InsightLine[]): string {
  if (lines.length === 0) {
    return p("O teu relatório está guardado e podes consultá-lo abaixo.");
  }
  const items = lines
    .map(
      (l) =>
        `<li style="margin:0 0 10px 0;font-size:15px;line-height:1.6;color:#1c1917;"><strong style="color:#0a0e1a;">${l.number}.</strong> ${escapeHtml(l.text)}</li>`,
    )
    .join("\n");
  return [
    p("As três coisas que mais saltam à vista:"),
    `<ol style="margin:0 0 20px 0;padding:0 0 0 4px;list-style:none;">${items}</ol>`,
  ].join("\n");
}

function renderSecondaryLinkHtml(handle: string, url: string): string {
  const safeUrl = escapeHtml(url);
  const safeHandle = escapeHtml(`@${handle}`);
  return `<p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;color:#57534e;"><a href="${safeUrl}" style="color:#3772E5;text-decoration:underline;">Abrir relatório de ${safeHandle}</a></p>`;
}

export function getReportSavedParts(input: ReportSavedInput): EmailTemplateParts {
  if (!input.reportUrl?.trim()) {
    throw new Error("reportUrl is required for report_saved");
  }
  if (!input.analyzeAnotherUrl?.trim()) {
    throw new Error("analyzeAnotherUrl is required for report_saved");
  }
  if (!input.instagramHandle?.trim()) {
    throw new Error("instagramHandle is required for report_saved");
  }

  const handle = input.instagramHandle.replace(/^@/, "");
  const subject = subjectFor(handle);
  const headline = headlineFor(handle);
  const variant = input.variant ?? "welcome";
  const reportUrl = input.reportUrl.trim();
  const analyzeUrl = input.analyzeAnotherUrl.trim();
  const credits = input.credits ?? null;
  const insightLines = buildInsightLines(input.insights);
  const preheader = credits ? PREHEADER_DEFAULT : PREHEADER_NEUTRAL;

  // ----- plain-text -----
  const textLines: string[] = [
    greetingText(input.firstName),
    "",
    ...(variant === "welcome" ? ["Bem-vindo à beta."] : []),
    `O relatório de @${handle} ficou guardado na tua área AuditProfiles.`,
    "",
  ];

  if (variant === "welcome") {
    textLines.push(
      "A AuditProfiles é uma ferramenta de auditoria e benchmark de perfis de Instagram — comparas-te com concorrentes em segundos, sem folhas de cálculo.",
      "O relatório fica guardado na tua conta e podes analisar outros perfis sempre que quiseres.",
      "",
    );
  }

  if (credits) {
    textLines.push(
      `Começaste com ${credits.totalFree} análises gratuitas:`,
      `· ${credits.used} usada em @${handle}`,
      `· ${credits.remaining} ainda disponível para analisar outro perfil.`,
      "",
    );
  }

  if (insightLines.length > 0) {
    textLines.push("As três coisas que mais saltam à vista:");
    for (const l of insightLines) {
      textLines.push(`${l.number}. ${l.text}`);
    }
    textLines.push("");
  } else {
    textLines.push("O teu relatório está guardado e podes consultá-lo abaixo.", "");
  }

  textLines.push(
    "Comparar é onde isto fica mais interessante. Podes usar o crédito que sobra para analisar um concorrente, uma marca que admiras ou outro perfil teu.",
    "",
    "Analisar outro perfil:",
    analyzeUrl,
    "",
    `Abrir relatório de @${handle}:`,
    reportUrl,
    "",
    ...signatureText("Boa leitura,"),
  );

  if (variant === "welcome" && input.resetPasswordUrl) {
    textLines.push(
      "",
      "Por segurança, nunca enviamos a tua palavra-passe por email. Se te esqueceres dela, podes redefini-la aqui:",
      input.resetPasswordUrl,
    );
  }

  if (input.unsubscribeUrl) {
    textLines.push(
      "",
      "Se já não queres receber estes emails, anula a subscrição:",
      input.unsubscribeUrl,
    );
  }

  const text = joinLines(textLines);

  // ----- HTML -----
  const htmlParts: string[] = [p(greetingHtml(input.firstName))];

  if (variant === "welcome") {
    htmlParts.push(p("Bem-vindo à beta."));
  }

  htmlParts.push(
    p(
      `O relatório de <strong style="color:#0a0e1a;">@${escapeHtml(handle)}</strong> ficou guardado na tua área <strong style="color:#0a0e1a;">AuditProfiles</strong>.`,
    ),
  );

  if (variant === "welcome") {
    htmlParts.push(
      p(
        "A <strong style=\"color:#0a0e1a;\">AuditProfiles</strong> é uma ferramenta de auditoria e benchmark de perfis de Instagram — comparas-te com concorrentes em segundos, sem folhas de cálculo.",
      ),
      pMuted(
        "O relatório fica guardado na tua conta e podes analisar outros perfis sempre que quiseres.",
      ),
    );
  }

  if (credits) {
    htmlParts.push(renderCreditCardHtml(credits, handle));
  }

  htmlParts.push(renderInsightsHtml(insightLines));

  htmlParts.push(
    pMuted(
      "Comparar é onde isto fica mais interessante. Podes usar o crédito que sobra para analisar um concorrente, uma marca que admiras ou outro perfil teu.",
    ),
    renderButtonHtml("Analisar outro perfil", analyzeUrl),
    `<div style="height:16px;"></div>`,
    renderSecondaryLinkHtml(handle, reportUrl),
    `<div style="height:20px;"></div>`,
    renderUrlFallbackHtml(analyzeUrl),
    signatureHtml("Boa leitura,"),
  );

  if (variant === "welcome" && input.resetPasswordUrl) {
    const safeReset = escapeHtml(input.resetPasswordUrl);
    htmlParts.push(
      `<div style="margin-top:24px;padding:12px 16px;border:1px solid #e7e5e4;border-radius:8px;background-color:#fafaf9;">
  <p style="margin:0;font-size:13px;line-height:1.55;color:#57534e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    🔒 Por segurança, nunca enviamos a tua palavra-passe por email. Se te esqueceres dela, podes <a href="${safeReset}" style="color:#3772E5;text-decoration:underline;">redefini-la aqui</a>.
  </p>
</div>`,
    );
  }

  return {
    subject,
    preheader,
    headline,
    body_html: htmlParts.join("\n"),
    body_text: text,
  };
}

export function renderReportSaved(input: ReportSavedInput): RenderedEmail {
  const parts = getReportSavedParts(input);
  const unsubscribeUrl = input.unsubscribeUrl?.trim() || null;
  return {
    subject: parts.subject,
    text: parts.body_text,
    html: wrapHtml({
      title: parts.subject,
      headline: parts.headline,
      bodyHtml: parts.body_html,
      preheader: parts.preheader,
      unsubscribeUrl,
    }),
  };
}