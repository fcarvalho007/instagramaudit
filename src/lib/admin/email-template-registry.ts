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
  type RenderedEmail,
} from "@/lib/email/templates";

export const SAMPLE = {
  firstName: "Frederico",
  instagramHandle: "frederico.m.carvalho",
  reportUrl: "https://example.com/analyze/frederico.m.carvalho",
  feedbackUrl: "https://example.com/feedback/example",
  appUrl: "https://example.com/app/reports",
  pricingOption: "monthly",
} as const;

export type EmailTemplateKey =
  | "request_received"
  | "report_ready"
  | "feedback_request"
  | "personal_area_saved"
  | "welcome_beta"
  | "commercial_followup";

export interface EmailTemplateEntry {
  key: EmailTemplateKey;
  title: string;
  internalName: string;
  wired: boolean;
  wiredAt: string | null;
  variables: Array<{ key: string; value: string }>;
  render: () => RenderedEmail;
  preheader?: string;
}

export const EMAIL_TEMPLATES: EmailTemplateEntry[] = [
  {
    key: "request_received",
    title: "Pedido recebido",
    internalName: "request_received",
    wired: true,
    wiredAt: "src/lib/beta.functions.ts (submissão de pedido beta)",
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
    wired: true,
    wiredAt: "src/routes/api/admin/send-report-link.ts",
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
    wired: true,
    wiredAt: "src/routes/api/admin/send-feedback-request.ts",
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
    wired: true,
    wiredAt: "src/lib/email/templates/send-personal-area-saved.server.ts",
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
    wired: true,
    wiredAt: "src/lib/email/send-welcome-beta.server.ts (primeiro unlock)",
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
    key: "commercial_followup",
    title: "Follow-up comercial",
    internalName: "commercial_followup",
    wired: false,
    wiredAt: null,
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
      { key: "pricingOption", value: SAMPLE.pricingOption },
      { key: "reportUrl", value: SAMPLE.reportUrl },
    ],
    render: () =>
      renderCommercialFollowup({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
        pricingOption: SAMPLE.pricingOption,
        reportUrl: SAMPLE.reportUrl,
      }),
    preheader: "Sem pressão. Respondemos quando fizer sentido para ti.",
  },
];

export function getTemplateByKey(
  key: string,
): EmailTemplateEntry | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}