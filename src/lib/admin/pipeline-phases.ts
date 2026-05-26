/**
 * Helper puro para o pipeline de Relatórios.
 *
 * Recebe a lista de snapshots da janela e o map de report_request mais
 * recente por snapshot_id, devolve as 4 fases CUMULATIVAS (cada uma
 * é um superset da seguinte) + contagem de falhas e métricas de entrega.
 *
 * Invariante garantida: snapshot ≥ email_submitted ≥ pdf ≥ email (aplicado
 * via Math.min em cascata como defesa).
 */

export interface PipelineSnapshotInput {
  id: string;
  created_at: string;
}

export interface PipelineRequestInput {
  request_status: string;
  pdf_status: string;
  delivery_status: string;
  email_sent_at: string | null;
}

export interface PipelinePhases {
  snapshot: number;
  email_submitted: number;
  pdf: number;
  email: number;
}

export interface PipelineSummary {
  phases: PipelinePhases;
  failures_to_recover: number;
  delivered: number;
  delivery_avg_seconds: number | null;
  total: number;
}

export function buildPipelineSummary(
  snaps: PipelineSnapshotInput[],
  reqBySnap: Map<string, PipelineRequestInput>,
): PipelineSummary {
  let withRequest = 0;
  let withPdf = 0;
  let delivered = 0;
  let failures = 0;
  let deliverySum = 0;
  let deliveryN = 0;

  for (const s of snaps) {
    const req = reqBySnap.get(s.id);
    if (!req) continue;
    const isFailed =
      req.request_status === "failed" ||
      req.pdf_status === "failed" ||
      req.delivery_status === "failed";
    if (isFailed) {
      failures += 1;
      continue;
    }
    withRequest += 1;
    const isDelivered = req.delivery_status === "sent";
    const hasPdf = req.pdf_status === "generated" || isDelivered;
    if (hasPdf) withPdf += 1;
    if (isDelivered) {
      delivered += 1;
      if (req.email_sent_at) {
        const ms =
          new Date(req.email_sent_at).getTime() - new Date(s.created_at).getTime();
        if (Number.isFinite(ms) && ms >= 0) {
          deliverySum += ms;
          deliveryN += 1;
        }
      }
    }
  }

  // Cumulativo + cascata defensiva (snapshot ≥ email_submitted ≥ pdf ≥ email).
  const total = snaps.length;
  const snapshot = total;
  const email_submitted = Math.min(snapshot, withRequest);
  const pdf = Math.min(email_submitted, withPdf);
  const email = Math.min(pdf, delivered);

  return {
    phases: { snapshot, email_submitted, pdf, email },
    failures_to_recover: failures,
    delivered,
    delivery_avg_seconds: deliveryN > 0 ? deliverySum / deliveryN / 1000 : null,
    total,
  };
}