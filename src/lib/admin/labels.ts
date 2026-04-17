/**
 * Presentation mappings for report request statuses.
 *
 * Keeps DB values intact and produces calm pt-PT labels + badge variants.
 */

export type RequestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed_pdf"
  | "failed_email"
  | (string & {});

export type PdfStatus =
  | "not_generated"
  | "generating"
  | "ready"
  | "failed"
  | (string & {});

export type DeliveryStatus =
  | "not_sent"
  | "sending"
  | "sent"
  | "failed"
  | (string & {});

export type BadgeTone = "muted" | "accent" | "success" | "danger";

export const REQUEST_STATUS_OPTIONS: RequestStatus[] = [
  "pending",
  "processing",
  "completed",
  "failed_pdf",
  "failed_email",
];

export const PDF_STATUS_OPTIONS: PdfStatus[] = [
  "not_generated",
  "generating",
  "ready",
  "failed",
];

export const DELIVERY_STATUS_OPTIONS: DeliveryStatus[] = [
  "not_sent",
  "sending",
  "sent",
  "failed",
];

export function requestStatusLabel(value: RequestStatus): string {
  switch (value) {
    case "pending":
      return "Pendente";
    case "processing":
      return "Em processamento";
    case "completed":
      return "Concluído";
    case "failed_pdf":
      return "Falhou (PDF)";
    case "failed_email":
      return "Falhou (email)";
    default:
      return value;
  }
}

export function pdfStatusLabel(value: PdfStatus): string {
  switch (value) {
    case "not_generated":
      return "Por gerar";
    case "generating":
      return "A gerar";
    case "ready":
      return "Pronto";
    case "failed":
      return "Falhou";
    default:
      return value;
  }
}

export function deliveryStatusLabel(value: DeliveryStatus): string {
  switch (value) {
    case "not_sent":
      return "Por enviar";
    case "sending":
      return "A enviar";
    case "sent":
      return "Enviado";
    case "failed":
      return "Falhou";
    default:
      return value;
  }
}

export function requestStatusTone(value: RequestStatus): BadgeTone {
  switch (value) {
    case "completed":
      return "success";
    case "processing":
      return "accent";
    case "failed_pdf":
    case "failed_email":
      return "danger";
    case "pending":
    default:
      return "muted";
  }
}

export function pdfStatusTone(value: PdfStatus): BadgeTone {
  switch (value) {
    case "ready":
      return "success";
    case "generating":
      return "accent";
    case "failed":
      return "danger";
    case "not_generated":
    default:
      return "muted";
  }
}

export function deliveryStatusTone(value: DeliveryStatus): BadgeTone {
  switch (value) {
    case "sent":
      return "success";
    case "sending":
      return "accent";
    case "failed":
      return "danger";
    case "not_sent":
    default:
      return "muted";
  }
}
