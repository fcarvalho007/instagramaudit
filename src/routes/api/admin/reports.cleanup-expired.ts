/**
 * POST /api/admin/reports/cleanup-expired
 *
 * Apaga apenas `analysis_snapshots` com `created_at < now() - 5 dias`.
 *
 * - Apenas administradores autenticados (Google + allowlist).
 * - NÃO toca em `analysis_events`, `provider_call_logs`, `usage_alerts`,
 *   `social_profiles` nem em qualquer outra tabela analítica.
 * - Devolve a contagem real de linhas removidas.
 * - Acionado manualmente via botão no cockpit; não corre automaticamente.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

const REPORT_RETENTION_DAYS = 5;
const REPORT_RETENTION_MS = REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export interface CleanupResponse {
  success: true;
  retention_days: number;
  cutoff: string;
  deleted: number;
  deleted_ids: string[];
}

export const Route = createFileRoute("/api/admin/reports/cleanup-expired")({
  server: {
    handlers: {
      POST: async () => {
        let admin;
        try {
          admin = await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          return json(
            { success: false, error_code: "UNAUTHENTICATED", message: "Sessão inválida." },
            401,
          );
        }

        const cutoffIso = new Date(Date.now() - REPORT_RETENTION_MS).toISOString();

        // Strict guard: só apaga linhas explicitamente mais antigas que o
        // limite. Nunca filtra por outra coluna, nunca apaga em outra tabela.
        const { data, error } = await supabaseAdmin
          .from("analysis_snapshots")
          .delete()
          .lt("created_at", cutoffIso)
          .select("id");

        if (error) {
          return json(
            { success: false, error_code: "DB_ERROR", message: error.message },
            500,
          );
        }

        const deletedIds = (data ?? []).map((r) => r.id);
        console.info(
          "[admin/reports/cleanup-expired] admin=%s cutoff=%s deleted=%d",
          admin.email,
          cutoffIso,
          deletedIds.length,
        );

        const body: CleanupResponse = {
          success: true,
          retention_days: REPORT_RETENTION_DAYS,
          cutoff: cutoffIso,
          deleted: deletedIds.length,
          deleted_ids: deletedIds,
        };
        return json(body);
      },
    },
  },
});
