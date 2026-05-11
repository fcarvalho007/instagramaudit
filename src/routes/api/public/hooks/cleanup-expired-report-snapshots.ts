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
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";

function parseDryRun(value: unknown): boolean {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  return false;
}

async function isCleanupEnabled(): Promise<boolean> {
  try {
    const { data } = await (supabaseAdmin as any)
      .from("app_config")
      .select("value")
      .eq("key", "cleanup_enabled")
      .maybeSingle();
    return data?.value === "true";
  } catch {
    return false;
  }
}

export const Route = createFileRoute(
  "/api/public/hooks/cleanup-expired-report-snapshots",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = authorizeCronHook(request);
        if (denied) return denied;

        let body: any = null;
        try {
          const text = await request.text();
          body = text ? JSON.parse(text) : null;
        } catch {
          body = null;
        }
        const dryRun = parseDryRun(body?.dry_run);

        if (!dryRun) {
          const enabled = await isCleanupEnabled();
          if (!enabled) {
            await recordProductEvent({
              eventType: "report_snapshots_cleanup_skipped",
              metadata: { reason: "cleanup_disabled", source: "kill_switch" },
            });
            return new Response(
              JSON.stringify({
                ok: true,
                skipped: true,
                reason: "cleanup_disabled",
                dryRun: false,
              }),
              {
                status: 200,
                headers: {
                  "Content-Type": "application/json",
                  "Cache-Control": "no-store",
                },
              },
            );
          }
        }

        const summary = await cleanupExpiredReportSnapshots({ dryRun });
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