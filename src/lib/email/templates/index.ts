/**
 * Beta operational email templates (pt-PT).
 * Pure renderers — no provider calls. Each export returns { subject, text, html }.
 */

export type {
  RenderedEmail,
  BaseTemplateInput,
  EmailTemplateParts,
} from "../shared";

export {
  renderRequestReceived,
  getRequestReceivedParts,
  type RequestReceivedInput,
} from "./request-received";
export {
  renderReportReady,
  getReportReadyParts,
  type ReportReadyInput,
} from "./report-ready";
export {
  renderFeedbackRequest,
  getFeedbackRequestParts,
  type FeedbackRequestInput,
} from "./feedback-request";
export {
  renderCommercialFollowup,
  getCommercialFollowupParts,
  type CommercialFollowupInput,
} from "./commercial-followup";
export {
  renderPersonalAreaSaved,
  getPersonalAreaSavedParts,
  type PersonalAreaSavedInput,
} from "./personal-area-saved";
export {
  renderWelcomeBeta,
  getWelcomeBetaParts,
  type WelcomeBetaInput,
} from "./welcome-beta";
export {
  renderReportSummary,
  getReportSummaryParts,
  type ReportSummaryInput,
  type ReportSummaryKpis,
  type ReportSummaryTopPost,
} from "./report-summary";
export {
  renderPaymentConfirmed,
  getPaymentConfirmedParts,
  type PaymentConfirmedInput,
} from "./payment-confirmed";

export {
  getTemplateDefaultParts,
  PLACEHOLDER_VARS,
} from "./default-parts";