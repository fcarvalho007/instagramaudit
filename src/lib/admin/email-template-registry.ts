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
  type EmailTemplateParts,
} from "@/lib/email/templates";

export type { EmailTemplateParts };

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
    shortDescription: "Bem-vindo à beta — o que vais encontrar.",
    wired: true,
    wiredAt: "src/lib/email/send-welcome-beta.server.ts (primeiro unlock)",
    wiredNote:
      "Enviado uma única vez no primeiro unlock do lead via `lead-magnet-sequence`. AUDITORIA: sobrepõe-se ao `report_summary` no mesmo evento — planeado para ser fundido no novo `report_saved` (ver docs/BETA_RUNBOOK.md §0.1).",
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
    shortDescription: "As 3 conclusões principais em 60 segundos.",
    wired: true,
    wiredAt: "src/lib/email/send-report-summary.server.ts (após unlock)",
    wiredNote:
      "Disparado em sequência após cada unlock via `lead-magnet-sequence`. AUDITORIA: não mostra saldo de créditos nem insights reais — planeado para ser fundido no novo `report_saved` (ver docs/BETA_RUNBOOK.md §0.1).",
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
];

export function getTemplateByKey(
  key: string,
): EmailTemplateEntry | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}