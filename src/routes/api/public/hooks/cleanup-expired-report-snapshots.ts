/**
 * POST /api/public/hooks/cleanup-expired-report-snapshots
 *
 * Chamado pelo `pg_cron` diariamente. Protegido por `authorizeCronHook`.
 * Liberta `report_payload_jsonb` de snapshots fora da janela de retenção
 * (15 dias) e marca `expired_at`. Não toca em providers, emails ou
 * `analysis_snapshots`.
 */

import { createFileRoute } from "@tanstack/react-router";
import { authorizeCronHook } from "@/lib/admin/cron-auth.server";
import { cleanupExpiredReportSnapshots } from "@/lib/report-snapshots/cleanup-expired.server";

export const Route = createFileRoute(
  "/api/public/hooks/cleanup-expired-report-snapshots",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = authorizeCronHook(request);
        if (denied) return denied;
        const summary = await cleanupExpiredReportSnapshots();
        return new Response(JSON.stringify(summary), {
          status: summary.ok ? 200 : 500,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});