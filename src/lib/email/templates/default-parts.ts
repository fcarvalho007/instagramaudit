/**
 * Adapter: produce a template's editable `EmailTemplateParts` from the
 * production renderer module. This is the single source of truth used by
 * the admin editor when no DB override exists — it calls the same code
 * paths that produce real outgoing emails, so the preview and the
 * actually-sent fallback cannot drift apart.
 */

import type { EmailTemplateParts } from "../shared";
import { getRequestReceivedParts } from "./request-received";
import { getReportReadyParts } from "./report-ready";
import { getFeedbackRequestParts } from "./feedback-request";
import { getPersonalAreaSavedParts } from "./personal-area-saved";
import { getWelcomeBetaParts } from "./welcome-beta";
import { getReportSummaryParts } from "./report-summary";
import { getCommercialFollowupParts } from "./commercial-followup";
import { getPaymentConfirmedParts } from "./payment-confirmed";

export type EmailTemplateKey =
  | "request_received"
  | "report_ready"
  | "feedback_request"
  | "personal_area_saved"
  | "welcome_beta"
  | "report_summary"
  | "commercial_followup"
  | "payment_confirmed";

/**
 * Placeholder values used to render the editor "starting point" when no
 * override has been saved yet. Keeping the values as `{{var}}` strings
 * preserves the existing editor UX (admin sees placeholders, not real
 * sample data) while still routing through the production renderer.
 */
export const PLACEHOLDER_VARS = {
  firstName: "{{firstName}}",
  instagramHandle: "{{instagramHandle}}",
  reportUrl: "{{reportUrl}}",
  feedbackUrl: "{{feedbackUrl}}",
  appUrl: "{{appUrl}}",
  checkoutUrl: "{{checkoutUrl}}",
  productName: "{{productName}}",
  amountLabel: "{{amountLabel}}",
  paymentMethod: "{{paymentMethod}}",
  paymentReference: "{{paymentReference}}",
} as const;

/**
 * `report_summary` interpolates structured KPI numbers (followers,
 * engagement, benchmark delta) — these cannot be expressed as text
 * placeholders. We seed the editor with neutral sample numbers so the
 * admin can see the body shape; overrides remain the authoritative copy.
 */
const REPORT_SUMMARY_SAMPLE = {
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
};

export function getTemplateDefaultParts(
  key: EmailTemplateKey,
): EmailTemplateParts {
  const v = PLACEHOLDER_VARS;
  switch (key) {
    case "request_received":
      return getRequestReceivedParts({
        firstName: v.firstName,
        instagramHandle: v.instagramHandle,
      });
    case "report_ready":
      return getReportReadyParts({
        firstName: v.firstName,
        instagramHandle: v.instagramHandle,
        reportUrl: v.reportUrl,
      });
    case "feedback_request":
      return getFeedbackRequestParts({
        firstName: v.firstName,
        instagramHandle: v.instagramHandle,
        reportUrl: v.reportUrl,
        feedbackUrl: v.feedbackUrl,
        reportViewed: true,
      });
    case "personal_area_saved":
      return getPersonalAreaSavedParts({
        firstName: v.firstName,
        instagramHandle: v.instagramHandle,
        appUrl: v.appUrl,
      });
    case "welcome_beta":
      return getWelcomeBetaParts({
        firstName: v.firstName,
        instagramHandle: v.instagramHandle,
        reportUrl: v.reportUrl,
      });
    case "report_summary":
      return getReportSummaryParts({
        firstName: v.firstName,
        instagramHandle: v.instagramHandle,
        reportUrl: v.reportUrl,
        kpis: REPORT_SUMMARY_SAMPLE.kpis,
        topPost: REPORT_SUMMARY_SAMPLE.topPost,
      });
    case "commercial_followup":
      return getCommercialFollowupParts({
        firstName: v.firstName,
        instagramHandle: v.instagramHandle,
        reportUrl: v.reportUrl,
        checkoutUrl: v.checkoutUrl,
      });
    case "payment_confirmed":
      return getPaymentConfirmedParts({
        firstName: v.firstName,
        instagramHandle: v.instagramHandle,
        productName: v.productName,
        amountLabel: v.amountLabel,
        paymentMethod: v.paymentMethod,
        paymentReference: v.paymentReference,
        reportUrl: v.reportUrl,
      });
  }
}