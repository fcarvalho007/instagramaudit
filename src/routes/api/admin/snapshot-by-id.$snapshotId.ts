/**
 * GET /api/admin/snapshot-by-id/:snapshotId
 *
 * Devolve um `analysis_snapshots` específico pelo `id` (UUID). Usado pela
 * rota admin `/admin/report-preview/snapshot/:snapshotId` para garantir
 * que se pré-visualiza exactamente a linha listada no painel "Relatórios"
 * (e não a "última do username", que pode divergir após upsert).
 *
 * Acesso: apenas administradores autenticados.
 * NÃO chama Apify. Apenas leitura à BD.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { buildReportBenchmarkInput } from "@/lib/report/benchmark-input.server";
import type { SnapshotPayload } from "@/lib/report/snapshot-to-report-data";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  "/api/admin/snapshot-by-id/$snapshotId",
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          return json(
            { success: false, error_code: "UNAUTHENTICATED", message: "Sessão inválida." },
            401,
          );
        }

        const snapshotId = (params.snapshotId ?? "").trim();
        if (!UUID_RE.test(snapshotId)) {
          return json(
            {
              success: false,
              error_code: "INVALID_ID",
              message: "Identificador de snapshot inválido.",
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
            { success: false, error_code: "DB_ERROR", message: error.message },
            500,
          );
        }

        if (!data) {
          return json({ success: true, snapshot: null });
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