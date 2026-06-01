/**
 * GET /api/admin/onboarding-funnel
 *
 * Diagnóstico do funil de onboarding (3-step):
 *   - agregado dos últimos 7 dias por event_type / step
 *   - últimas 20 events (mais recentes primeiro)
 *
 * Eventos vivem em `product_events` (event_type LIKE 'onboarding_%')
 * inseridos por POST /api/public/onboarding-event.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface RecentEvent {
  id: string;
  created_at: string;
  event_type: string;
  handle: string | null;
  lead_id: string | null;
  step: number | null;
  error_code: string | null;
}

interface WindowRow {
  event_type: string;
  metadata: Record<string, unknown> | null;
}

export const Route = createFileRoute("/api/admin/onboarding-funnel")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const sinceISO = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();

        const [windowRes, recentRes] = await Promise.all([
          supabaseAdmin
            .from("product_events")
            .select("event_type, metadata")
            .like("event_type", "onboarding_%")
            .gte("created_at", sinceISO),
          supabaseAdmin
            .from("product_events")
            .select("id, created_at, event_type, handle, lead_id, metadata")
            .like("event_type", "onboarding_%")
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        if (windowRes.error || recentRes.error) {
          return jsonResponse(
            {
              success: false,
              error_code: "QUERY_FAILED",
              message: (windowRes.error ?? recentRes.error)?.message,
            },
            500,
          );
        }

        const rows = (windowRes.data ?? []) as WindowRow[];

        const agg = {
          total_events: rows.length,
          modal_started: 0,
          step1_viewed: 0,
          step2_viewed: 0,
          step3_viewed: 0,
          successful: 0,
          abandon: 0,
          errors: 0,
        };

        for (const r of rows) {
          const step = Number(
            (r.metadata as { step?: unknown } | null)?.step,
          );
          switch (r.event_type) {
            case "onboarding_step_view":
              if (step === 0) agg.modal_started += 1;
              else if (step === 1) agg.step1_viewed += 1;
              else if (step === 2) agg.step2_viewed += 1;
              else if (step === 3) agg.step3_viewed += 1;
              break;
            case "onboarding_success":
              agg.successful += 1;
              break;
            case "onboarding_abandon":
              agg.abandon += 1;
              break;
            case "onboarding_error":
              agg.errors += 1;
              break;
            default:
              break;
          }
        }

        const completion_rate_pct =
          agg.modal_started > 0
            ? Number(((agg.successful / agg.modal_started) * 100).toFixed(1))
            : null;

        const recent: RecentEvent[] = (recentRes.data ?? []).map((r) => {
          const meta = (r.metadata ?? {}) as {
            step?: unknown;
            error_code?: unknown;
          };
          const stepNum = Number(meta.step);
          return {
            id: r.id as string,
            created_at: r.created_at as string,
            event_type: r.event_type as string,
            handle: (r.handle as string | null) ?? null,
            lead_id: (r.lead_id as string | null) ?? null,
            step: Number.isFinite(stepNum) ? stepNum : null,
            error_code:
              typeof meta.error_code === "string" ? meta.error_code : null,
          };
        });

        return jsonResponse({
          success: true,
          window_days: 7,
          aggregate: { ...agg, completion_rate_pct },
          recent,
        });
      },
    },
  },
});