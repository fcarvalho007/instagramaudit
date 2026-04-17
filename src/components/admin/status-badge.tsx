import { Badge } from "@/components/ui/badge";
import {
  type BadgeTone,
  type DeliveryStatus,
  type PdfStatus,
  type RequestStatus,
  deliveryStatusLabel,
  deliveryStatusTone,
  pdfStatusLabel,
  pdfStatusTone,
  requestStatusLabel,
  requestStatusTone,
} from "@/lib/admin/labels";

function variantOf(tone: BadgeTone): "default" | "success" | "warning" | "danger" | "accent" {
  switch (tone) {
    case "success":
      return "success";
    case "accent":
      return "accent";
    case "danger":
      return "danger";
    case "muted":
    default:
      return "default";
  }
}

export function RequestStatusBadge({ value }: { value: RequestStatus }) {
  return (
    <Badge variant={variantOf(requestStatusTone(value))} dot>
      {requestStatusLabel(value)}
    </Badge>
  );
}

export function PdfStatusBadge({ value }: { value: PdfStatus }) {
  return (
    <Badge variant={variantOf(pdfStatusTone(value))} dot>
      {pdfStatusLabel(value)}
    </Badge>
  );
}

export function DeliveryStatusBadge({ value }: { value: DeliveryStatus }) {
  return (
    <Badge variant={variantOf(deliveryStatusTone(value))} dot>
      {deliveryStatusLabel(value)}
    </Badge>
  );
}
