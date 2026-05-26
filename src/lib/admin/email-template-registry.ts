/**
 * Registry partilhado dos templates de email operacionais beta.
 *
 * Fonte única para `EmailLab` e tab `Templates` em `/admin/automacoes`.
 * Apenas leitura — não envia, não persiste.
 */

import {
  renderRequestReceived,
  renderReportReady,
  renderFeedbackRequest,
  renderCommercialFollowup,
  renderPersonalAreaSaved,
  renderWelcomeBeta,
  renderReportSummary,
  type RenderedEmail,
} from "@/lib/email/templates";

export const SAMPLE = {
  firstName: "Frederico",
  instagramHandle: "frederico.m.carvalho",
  reportUrl: "https://example.com/analyze/frederico.m.carvalho",
  feedbackUrl: "https://example.com/feedback/example",
  appUrl: "https://example.com/app/reports",
  checkoutUrl: "https://example.com/checkout/abc123",
} as const;

export type EmailTemplateKey =
  | "request_received"
  | "report_ready"
  | "feedback_request"
  | "personal_area_saved"
  | "welcome_beta"
  | "report_summary"
  | "commercial_followup";

export type EmailTemplateCategory = "operacional" | "conta" | "comercial";

export const CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
  operacional: "Operacionais",
  conta: "Conta e área pessoal",
  comercial: "Comercial",
};

export const CATEGORY_ORDER: EmailTemplateCategory[] = [
  "operacional",
  "conta",
  "comercial",
];

export interface EmailTemplateEntry {
  key: EmailTemplateKey;
  title: string;
  internalName: string;
  category: EmailTemplateCategory;
  shortDescription: string;
  wired: boolean;
  wiredAt: string | null;
  wiredNote?: string | null;
  variables: Array<{ key: string; value: string }>;
  render: () => RenderedEmail;
  preheader?: string;
  /**
   * Conteúdo editável de fábrica. Usado para pré-popular o editor de
   * templates em `/admin/automacoes/templates/$key` quando ainda não
   * existe um override em DB. Aceita placeholders `{{var}}`.
   */
  defaultParts: EmailTemplateParts;
}

export interface EmailTemplateParts {
  subject: string;
  preheader: string;
  headline: string;
  body_html: string;
  body_text: string;
}

export const TEMPLATE_VARIABLES: Record<EmailTemplateKey, string[]> = {
  request_received: ["firstName", "instagramHandle"],
  report_ready: ["firstName", "instagramHandle", "reportUrl"],
  feedback_request: [
    "firstName",
    "instagramHandle",
    "reportUrl",
    "feedbackUrl",
  ],
  personal_area_saved: ["firstName", "instagramHandle", "appUrl"],
  welcome_beta: ["firstName", "instagramHandle", "reportUrl"],
  report_summary: ["firstName", "instagramHandle", "reportUrl"],
  commercial_followup: [
    "firstName",
    "instagramHandle",
    "reportUrl",
    "checkoutUrl",
  ],
};

/**
 * Default editable parts por template — versão simplificada e em texto
 * legível, com placeholders `{{var}}`. Quando o admin abre o editor pela
 * primeira vez (sem override em DB), estes valores aparecem como ponto de
 * partida. O layout exterior (cartão branco, footer) é sempre aplicado
 * pelo `wrapHtml` partilhado — o admin edita apenas o conteúdo interior.
 */
const DEFAULTS: Record<EmailTemplateKey, EmailTemplateParts> = {
  request_received: {
    subject: "Recebemos o teu pedido para @{{instagramHandle}}",
    preheader: "A análise está a ser preparada — recebes o relatório por email.",
    headline: "Pedido recebido",
    body_html:
      `<p>Olá {{firstName}},</p>\n` +
      `<p>Recebemos o teu pedido para analisar <strong>@{{instagramHandle}}</strong>. A preparação do relatório está em curso — vais receber um email assim que estiver pronto, normalmente em poucos minutos.</p>\n` +
      `<p>Esta ferramenta está em fase <strong>beta</strong>. Depois de explorares o relatório, vamos pedir-te uma opinião curta. Vale ouro nesta fase.</p>\n` +
      `<p>Até já,<br/>— equipa InstaBench</p>`,
    body_text:
      `Olá {{firstName}},\n\n` +
      `Recebemos o teu pedido para analisar @{{instagramHandle}}. A preparação do relatório está em curso — vais receber um email assim que estiver pronto, normalmente em poucos minutos.\n\n` +
      `Esta ferramenta está em fase beta. Depois de explorares o relatório, vamos pedir-te uma opinião curta.\n\n` +
      `Até já,\n— equipa InstaBench`,
  },
  report_ready: {
    subject: "O teu relatório de @{{instagramHandle}} está disponível",
    preheader: "Análise completa disponível para consultares.",
    headline: "Relatório pronto",
    body_html:
      `<p>Olá {{firstName}},</p>\n` +
      `<p>A análise de <strong>@{{instagramHandle}}</strong> já está disponível para consultares.</p>\n` +
      `<p><a href="{{reportUrl}}" style="color:#3772E5;text-decoration:underline;">Abrir relatório →</a></p>\n` +
      `<p>Em alternativa copia o endereço:<br/><code>{{reportUrl}}</code></p>\n` +
      `<p>Até já,<br/>— equipa InstaBench</p>`,
    body_text:
      `Olá {{firstName}},\n\n` +
      `A análise de @{{instagramHandle}} já está disponível.\n\n` +
      `Abrir relatório: {{reportUrl}}\n\n` +
      `Até já,\n— equipa InstaBench`,
  },
  feedback_request: {
    subject: "O relatório de @{{instagramHandle}} foi útil?",
    preheader: "Duas ou três frases chegam — ajuda-nos a melhorar.",
    headline: "Pedido de feedback",
    body_html:
      `<p>Olá {{firstName}},</p>\n` +
      `<p>Já viste o relatório de <strong>@{{instagramHandle}}</strong>? Duas ou três frases sobre o que foi útil (e o que faltou) ajudam-nos imenso.</p>\n` +
      `<p><a href="{{feedbackUrl}}" style="color:#3772E5;text-decoration:underline;">Dar feedback (60 segundos) →</a></p>\n` +
      `<p>Se ainda não viste: <a href="{{reportUrl}}" style="color:#3772E5;text-decoration:underline;">abrir relatório</a>.</p>\n` +
      `<p>Obrigado,<br/>— equipa InstaBench</p>`,
    body_text:
      `Olá {{firstName}},\n\n` +
      `Já viste o relatório de @{{instagramHandle}}? Duas ou três frases sobre o que foi útil ajudam-nos imenso.\n\n` +
      `Dar feedback: {{feedbackUrl}}\nAbrir relatório: {{reportUrl}}\n\n` +
      `Obrigado,\n— equipa InstaBench`,
  },
  personal_area_saved: {
    subject: "O relatório foi guardado na tua área pessoal",
    preheader: "Podes voltar a consultá-lo sempre que precisares.",
    headline: "Área pessoal guardada",
    body_html:
      `<p>Olá {{firstName}},</p>\n` +
      `<p>A análise de <strong>@{{instagramHandle}}</strong> ficou guardada na tua área pessoal. Podes voltar a abri-la sempre que precisares.</p>\n` +
      `<p><a href="{{appUrl}}" style="color:#3772E5;text-decoration:underline;">Abrir área pessoal →</a></p>\n` +
      `<p>Até já,<br/>— equipa InstaBench</p>`,
    body_text:
      `Olá {{firstName}},\n\n` +
      `A análise de @{{instagramHandle}} ficou guardada na tua área pessoal.\n\n` +
      `Abrir: {{appUrl}}\n\n` +
      `Até já,\n— equipa InstaBench`,
  },
  welcome_beta: {
    subject: "Bem-vindo à beta — o que esperar daqui",
    preheader: "O que está aberto, o que é premium e como ajudar a melhorar.",
    headline: "Bem-vindo à beta",
    body_html:
      `<p>Olá {{firstName}},</p>\n` +
      `<p>Obrigado por entrares na beta. O InstaBench é uma ferramenta editorial de análise de Instagram, pensada para quem decide sobre conteúdo, audiência ou marca.</p>\n` +
      `<p>O que esperar nesta fase:<br/>· 3 secções gratuitas (Visão geral · Diagnóstico · Desempenho parcial)<br/>· 3 secções premium (Conteúdo · Procura · Comparação)<br/>· Apenas Instagram, por agora</p>\n` +
      `<p><a href="{{reportUrl}}" style="color:#3772E5;text-decoration:underline;">Abrir relatório de @{{instagramHandle}} →</a></p>\n` +
      `<p>Se algo correr mal ou tiveres uma ideia, responde a este email.</p>\n` +
      `<p>Bom trabalho,<br/>— equipa InstaBench</p>`,
    body_text:
      `Olá {{firstName}},\n\n` +
      `Obrigado por entrares na beta do InstaBench.\n\n` +
      `Abrir relatório de @{{instagramHandle}}: {{reportUrl}}\n\n` +
      `Se algo correr mal ou tiveres uma ideia, responde a este email.\n\n` +
      `Bom trabalho,\n— equipa InstaBench`,
  },
  report_summary: {
    subject: "Resumo da análise de @{{instagramHandle}}",
    preheader: "Os principais sinais do teu relatório InstaBench.",
    headline: "Resumo do relatório",
    body_html:
      `<p>Olá {{firstName}},</p>\n` +
      `<p>Aqui ficam as principais leituras do relatório de <strong>@{{instagramHandle}}</strong> em 60 segundos.</p>\n` +
      `<p>Os números completos, comparações com o mercado e recomendações estão no relatório:</p>\n` +
      `<p><a href="{{reportUrl}}" style="color:#3772E5;text-decoration:underline;">Abrir relatório completo →</a></p>\n` +
      `<p>Até já,<br/>— equipa InstaBench</p>`,
    body_text:
      `Olá {{firstName}},\n\n` +
      `Aqui ficam as principais leituras do relatório de @{{instagramHandle}} em 60 segundos.\n\n` +
      `Relatório completo: {{reportUrl}}\n\n` +
      `Até já,\n— equipa InstaBench`,
  },
  commercial_followup: {
    subject: "Próximos passos para o relatório completo",
    preheader: "Sem pressão. Respondemos quando fizer sentido para ti.",
    headline: "Follow-up",
    body_html:
      `<p>Olá {{firstName}},</p>\n` +
      `<p>Voltamos a este tópico para o caso de o relatório de <strong>@{{instagramHandle}}</strong> te ter ficado por explorar.</p>\n` +
      `<p><a href="{{reportUrl}}" style="color:#3772E5;text-decoration:underline;">Abrir relatório →</a></p>\n` +
      `<p>Se faz sentido avançares: <a href="{{checkoutUrl}}" style="color:#3772E5;text-decoration:underline;">finalizar pedido</a>.</p>\n` +
      `<p>Sem pressão. Respondemos quando fizer sentido para ti.<br/>— equipa InstaBench</p>`,
    body_text:
      `Olá {{firstName}},\n\n` +
      `Voltamos a este tópico para o caso de o relatório de @{{instagramHandle}} te ter ficado por explorar.\n\n` +
      `Abrir relatório: {{reportUrl}}\nFinalizar pedido: {{checkoutUrl}}\n\n` +
      `Sem pressão. Respondemos quando fizer sentido para ti.\n— equipa InstaBench`,
  },
};

export const EMAIL_TEMPLATES: EmailTemplateEntry[] = [
  {
    key: "request_received",
    title: "Pedido recebido",
    internalName: "request_received",
    category: "operacional",
    shortDescription: "Recebemos o teu pedido para analisar @{handle}.",
    wired: true,
    wiredAt: "src/lib/beta.functions.ts (submissão de pedido beta)",
    wiredNote: "Disparado quando o lead submete um pedido beta no site público.",
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
    ],
    render: () =>
      renderRequestReceived({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
      }),
    preheader: "Vamos rever manualmente e enviamos assim que estiver pronto.",
    defaultParts: DEFAULTS.request_received,
  },
  {
    key: "report_ready",
    title: "Relatório pronto",
    internalName: "report_ready",
    category: "operacional",
    shortDescription: "A análise do perfil já está disponível para consultares.",
    wired: true,
    wiredAt: "src/routes/api/admin/send-report-link.ts",
    wiredNote: "Enviado pelo admin a partir do detalhe da lead (acção \"Enviar relatório\").",
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
      { key: "reportUrl", value: SAMPLE.reportUrl },
    ],
    render: () =>
      renderReportReady({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
        reportUrl: SAMPLE.reportUrl,
      }),
    preheader: "Análise completa disponível para consultares.",
    defaultParts: DEFAULTS.report_ready,
  },
  {
    key: "feedback_request",
    title: "Pedido de feedback",
    internalName: "feedback_request",
    category: "operacional",
    shortDescription: "Pedes feedback rápido sobre o relatório?",
    wired: true,
    wiredAt: "src/routes/api/admin/send-feedback-request.ts",
    wiredNote: "Disparado pelo admin após o lead consultar o relatório.",
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
      { key: "reportUrl", value: SAMPLE.reportUrl },
      { key: "feedbackUrl", value: SAMPLE.feedbackUrl },
      { key: "reportViewed", value: "true" },
    ],
    render: () =>
      renderFeedbackRequest({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
        reportUrl: SAMPLE.reportUrl,
        feedbackUrl: SAMPLE.feedbackUrl,
        reportViewed: true,
      }),
    preheader: "Duas ou três frases chegam — ajuda-nos a melhorar.",
    defaultParts: DEFAULTS.feedback_request,
  },
  {
    key: "personal_area_saved",
    title: "Área pessoal guardada",
    internalName: "personal_area_saved",
    category: "conta",
    shortDescription: "Guardámos a análise na tua área pessoal.",
    wired: false,
    wiredAt: null,
    wiredNote:
      "Função `sendPersonalAreaSavedEmail` existe mas sem trigger automático. Reservado para o fluxo de criação de conta (a ligar em handle_new_user / link_user_to_existing_reports).",
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
      { key: "appUrl", value: SAMPLE.appUrl },
    ],
    render: () =>
      renderPersonalAreaSaved({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
        appUrl: SAMPLE.appUrl,
      }),
    preheader: "Podes voltar a consultá-lo sempre que precisares.",
    defaultParts: DEFAULTS.personal_area_saved,
  },
  {
    key: "welcome_beta",
    title: "Boas-vindas à beta",
    internalName: "welcome_beta",
    category: "conta",
    shortDescription: "Bem-vindo à beta — o que vais encontrar.",
    wired: true,
    wiredAt: "src/lib/email/send-welcome-beta.server.ts (primeiro unlock)",
    wiredNote: "Enviado uma única vez no primeiro unlock do lead, com consentimento explícito.",
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
      { key: "reportUrl", value: SAMPLE.reportUrl },
    ],
    render: () =>
      renderWelcomeBeta({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
        reportUrl: SAMPLE.reportUrl,
      }),
    preheader: "Estamos a validar o produto e o teu feedback conta.",
    defaultParts: DEFAULTS.welcome_beta,
  },
  {
    key: "report_summary",
    title: "Resumo do relatório",
    internalName: "report_summary",
    category: "comercial",
    shortDescription: "As 3 conclusões principais em 60 segundos.",
    wired: true,
    wiredAt: "src/lib/email/send-report-summary.server.ts (após unlock)",
    wiredNote: "Disparado em sequência após unlock, com consentimento de marketing.",
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
      { key: "reportUrl", value: SAMPLE.reportUrl },
    ],
    render: () =>
      renderReportSummary({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
        reportUrl: SAMPLE.reportUrl,
        kpis: {
          followers: 12480,
          engagementPct: 3.42,
          dominantFormat: "Carrosséis",
          benchmarkDeltaPp: 1.2,
        },
        topPost: {
          format: "Reel",
          engagementPct: 7.85,
          thumbnailUrl: null,
          permalink: null,
        },
      }),
    preheader: "Os principais sinais do teu relatório InstaBench.",
    defaultParts: DEFAULTS.report_summary,
  },
  {
    key: "commercial_followup",
    title: "Follow-up comercial",
    internalName: "commercial_followup",
    category: "comercial",
    shortDescription: "Falta ligar trigger ao stripe webhook.",
    wired: false,
    wiredAt: null,
    wiredNote: "Sem trigger automático. Reserva-se para conversão paga (futuro).",
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
      { key: "reportUrl", value: SAMPLE.reportUrl },
      { key: "checkoutUrl (opcional)", value: SAMPLE.checkoutUrl },
    ],
    render: () =>
      renderCommercialFollowup({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
        reportUrl: SAMPLE.reportUrl,
        checkoutUrl: SAMPLE.checkoutUrl,
      }),
    preheader: "Sem pressão. Respondemos quando fizer sentido para ti.",
    defaultParts: DEFAULTS.commercial_followup,
  },
];

export function getTemplateByKey(
  key: string,
): EmailTemplateEntry | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}