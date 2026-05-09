/**
 * Beta operational email templates (pt-PT).
 * Pure renderers — no provider calls. Each export returns { subject, text, html }.
 */

export type { RenderedEmail, BaseTemplateInput } from "../shared";

export {
  renderRequestReceived,
  type RequestReceivedInput,
} from "./request-received";
export {
  renderReportReady,
  type ReportReadyInput,
} from "./report-ready";
export {
  renderFeedbackRequest,
  type FeedbackRequestInput,
} from "./feedback-request";
export {
  renderCommercialFollowup,
  type CommercialFollowupInput,
} from "./commercial-followup";