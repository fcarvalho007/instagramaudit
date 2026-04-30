/**
 * GET /api/public/analysis-snapshot/by-id/:snapshotId
 *
 * Devolve o snapshot identificado por UUID — não a versão mais recente do
 * handle. Usado pela rota `/report/print/$snapshotId` que serve de target
 * ao renderer print-to-PDF externo (PDFShift).
 *
 * Apenas leitura. NÃO chama Apify, NÃO regenera, NÃO escreve. Espelha o
 * shape de resposta do endpoint por handle para reutilização directa do
 * adaptador `snapshotToReportData` no cliente.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildReportBenchmarkInput } from "@/lib/report/benchmark-input.server";
import type { SnapshotPayload } from "@/lib/report/snapshot-to-report-data";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const Route = createFileRoute(
  "/api/public/analysis-snapshot/by-id/$snapshotId",
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const snapshotId = (params.snapshotId ?? "").trim();
        if (!UUID_RE.test(snapshotId)) {
          return json(
            {
              success: false,
              error_code: "INVALID_SNAPSHOT_ID",
              message: "Snapshot ID inválido.",
            },
            400,
          );
        }

        const { data, error } = await supabaseAdmin
          .from("analysis_snapshots")
          .select(
            "id, instagram_username, normalized_payload, created_at, updated_at, expires_at",
          )
          .eq("id", snapshotId)
          .maybeSingle();

        if (error) {
          return json(
            {
              success: false,
              error_code: "DB_ERROR",
              message: error.message,
            },
            500,
          );
        }

        if (!data) {
          return json(
            {
              success: false,
              error_code: "SNAPSHOT_NOT_FOUND",
              message: "Snapshot não encontrado.",
            },
            404,
          );
        }

        const payload = (data.normalized_payload ?? {}) as SnapshotPayload;
        const benchmark = await buildReportBenchmarkInput(payload);

        return json({
          success: true,
          snapshot: {
            id: data.id,
            instagram_username: data.instagram_username,
            payload,
            meta: {
              generated_at: data.created_at,
              instagram_username: data.instagram_username,
            },
            created_at: data.created_at,
            updated_at: data.updated_at,
            expires_at: data.expires_at,
            benchmark,
          },
        });
      },
    },
  },
});