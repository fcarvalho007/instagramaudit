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
  renderPaymentConfirmed,
  renderReportSaved,
  type RenderedEmail,
  type EmailTemplateParts,
} from "@/lib/email/templates";

export type { EmailTemplateParts };

export const SAMPLE = {
  firstName: "Frederico",
  instagramHandle: "frederico.m.carvalho",
  reportUrl: "https://example.com/analyze/frederico.m.carvalho",
  analyzeAnotherUrl: "https://example.com/",
  feedbackUrl: "https://example.com/feedback/example",
  appUrl: "https://example.com/app/reports",
  checkoutUrl: "https://example.com/checkout/abc123",
  productName: "Relatório completo",
  amountLabel: "9,00\u00A0\u20AC",
  paymentMethod: "MB WAY",
  paymentReference: "AP-2026-0142",
  followersLabel: "10,2 mil",
  dominantFormat: "carrosséis",
  engagementRate: "4,2%",
  benchmarkDelta: "+1,1 pp acima da média",
  topPostFormat: "carrossel",
  topPostEngagement: "0,15%",
  totalFreeCredits: 2,
  usedCredits: 1,
  remainingCredits: 1,
  engagementVerdictSample: "está acima da média no engagement",
  gapAreaSample: "há margem nos comentários e na consistência dos formatos",
} as const;

export type EmailTemplateKey =
  | "request_received"
  | "report_ready"
  | "feedback_request"
  | "personal_area_saved"
  | "welcome_beta"
  | "report_summary"
  | "commercial_followup"
  | "payment_confirmed"
  | "report_saved";

export type EmailTemplateCategory =
  | "operacional"
  | "conta"
  | "comercial"
  | "pagamento";

export const CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
  operacional: "Operacionais",
  conta: "Conta e área pessoal",
  comercial: "Comercial",
  pagamento: "Pagamento",
};

export const CATEGORY_ORDER: EmailTemplateCategory[] = [
  "operacional",
  "conta",
  "comercial",
  "pagamento",
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
  payment_confirmed: [
    "firstName",
    "instagramHandle",
    "productName",
    "amountLabel",
    "paymentMethod",
    "paymentReference",
    "reportUrl",
  ],
  report_saved: [
    "firstName",
    "instagramHandle",
    "reportUrl",
    "analyzeAnotherUrl",
  ],
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
  },
  {
    key: "welcome_beta",
    title: "Boas-vindas à beta",
    internalName: "welcome_beta",
    category: "conta",
    shortDescription: "LEGACY — substituído por report_saved.",
    wired: false,
    wiredAt: null,
    wiredNote:
      "LEGACY — substituído por `report_saved` no lead-magnet-sequence (Step 3). Renderer e sender mantidos em disco para histórico de overrides e auditoria.",
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
  },
  {
    key: "report_summary",
    title: "Resumo do relatório",
    internalName: "report_summary",
    category: "comercial",
    shortDescription: "LEGACY — substituído por report_saved.",
    wired: false,
    wiredAt: null,
    wiredNote:
      "LEGACY — substituído por `report_saved` no lead-magnet-sequence (Step 3). Renderer mantido para histórico de overrides e auditoria; sender deixou de ser chamado.",
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
    preheader: "Os principais sinais do teu relatório AuditProfiles.",
  },
  {
    key: "commercial_followup",
    title: "Follow-up comercial",
    internalName: "commercial_followup",
    category: "comercial",
    shortDescription: "Continuação narrativa do relatório gratuito.",
    wired: true,
    wiredAt: "src/routes/api/admin/send-commercial-followup.ts",
    wiredNote:
      "Hoje só dispara via acção manual no admin (detalhe da lead). AUDITORIA: copy actual é genérica — planeada reescrita para continuar a narrativa do relatório, sem alterar preços nem CTAs. Auto-trigger fica para fase futura.",
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
  },
  {
    key: "payment_confirmed",
    title: "Pagamento confirmado",
    internalName: "payment_confirmed",
    category: "pagamento",
    shortDescription:
      "Confirma o pagamento e recapitula o relatório desbloqueado.",
    wired: true,
    wiredAt: "src/routes/api/public/eupago-webhook.ts (branch paid)",
    wiredNote:
      "Disparado fire-and-forget pelo webhook EuPago após o pagamento ser marcado como pago e o entitlement granted. Atrás do kill-switch PAYMENT_CONFIRMATION_EMAIL_ENABLED (default OFF). Idempotente por payment_id via product_events.payment_confirmation_email_sent.",
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
      { key: "productName", value: SAMPLE.productName },
      { key: "amountLabel", value: SAMPLE.amountLabel },
      { key: "paymentMethod (opcional)", value: SAMPLE.paymentMethod },
      { key: "paymentReference (opcional)", value: SAMPLE.paymentReference },
      { key: "reportUrl", value: SAMPLE.reportUrl },
    ],
    render: () =>
      renderPaymentConfirmed({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
        productName: SAMPLE.productName,
        amountLabel: SAMPLE.amountLabel,
        paymentMethod: SAMPLE.paymentMethod,
        paymentReference: SAMPLE.paymentReference,
        reportUrl: SAMPLE.reportUrl,
      }),
    preheader:
      "O relatório completo de @frederico.m.carvalho já está disponível na tua conta.",
  },
  {
    key: "report_saved",
    title: "Relatório guardado",
    internalName: "report_saved",
    category: "conta",
    shortDescription:
      "Confirma que o relatório foi guardado, mostra saldo de créditos e 3 insights.",
    wired: true,
    wiredAt: "src/lib/email/lead-magnet-sequence.server.ts (após unlock)",
    wiredNote:
      "Disparado uma vez por unlock via `lead-magnet-sequence`. SUBSTITUI o par anterior `welcome_beta` + `report_summary`. Idempotente por (lead_id, report_request_id) — dedup honra também os eventos legacy. Kill-switch: LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED.",
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
      { key: "reportUrl", value: SAMPLE.reportUrl },
      { key: "analyzeAnotherUrl", value: SAMPLE.analyzeAnotherUrl },
      { key: "followersLabel", value: SAMPLE.followersLabel },
      { key: "dominantFormat", value: SAMPLE.dominantFormat },
      { key: "engagementRate", value: SAMPLE.engagementRate },
      { key: "benchmarkDelta", value: SAMPLE.benchmarkDelta },
      { key: "topPostFormat", value: SAMPLE.topPostFormat },
      { key: "topPostEngagement", value: SAMPLE.topPostEngagement },
      { key: "totalFreeCredits", value: String(SAMPLE.totalFreeCredits) },
      { key: "usedCredits", value: String(SAMPLE.usedCredits) },
      { key: "remainingCredits", value: String(SAMPLE.remainingCredits) },
    ],
    render: () =>
      renderReportSaved({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
        reportUrl: SAMPLE.reportUrl,
        analyzeAnotherUrl: SAMPLE.analyzeAnotherUrl,
        variant: "welcome",
        credits: {
          totalFree: SAMPLE.totalFreeCredits,
          used: SAMPLE.usedCredits,
          remaining: SAMPLE.remainingCredits,
        },
        insights: {
          followersLabel: SAMPLE.followersLabel,
          dominantFormat: SAMPLE.dominantFormat,
          engagementRate: SAMPLE.engagementRate,
          benchmarkDelta: SAMPLE.benchmarkDelta,
          topPostFormat: SAMPLE.topPostFormat,
          topPostEngagement: SAMPLE.topPostEngagement,
        },
      }),
    preheader:
      "Usaste 1 análise grátis. Ainda tens 1 crédito para comparar outro perfil.",
  },
];

export function getTemplateByKey(
  key: string,
): EmailTemplateEntry | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}