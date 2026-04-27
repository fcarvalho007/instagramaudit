/**
 * GET /api/public/analysis-snapshot/:username
 *
 * Devolve o snapshot mais recente em `analysis_snapshots` para o handle
 * indicado, juntamente com o input de benchmark resolvido server-side.
 *
 * Endpoint público (sem auth) usado pelo ecrã `/analyze/$username` para
 * renderizar o relatório completo no layout do `/report/example`. Apenas
 * leitura — NÃO chama Apify, NÃO regenera dados, NÃO escreve na base.
 *
 * `Cache-Control: no-store` para garantir que o cliente vê sempre a versão
 * mais recente do snapshot (o caching útil acontece a montante, no
 * `analysis_snapshots`).
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildReportBenchmarkInput } from "@/lib/report/benchmark-input.server";
import type { SnapshotPayload } from "@/lib/report/snapshot-to-report-data";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/public/analysis-snapshot/$username")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const handle = (params.username ?? "").trim().toLowerCase().replace(/^@/, "");
        if (!handle || !/^[a-z0-9._]{1,30}$/.test(handle)) {
          return json(
            {
              success: false,
              error_code: "INVALID_HANDLE",
              message: "Handle inválido.",
            },
            400,
          );
        }

        const { data, error } = await supabaseAdmin
          .from("analysis_snapshots")
          .select(
            "id, instagram_username, normalized_payload, created_at, updated_at, expires_at",
          )
          .eq("instagram_username", handle)
          .order("created_at", { ascending: false })
          .limit(1)
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
              message: "Snapshot ainda não disponível para este perfil.",
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
