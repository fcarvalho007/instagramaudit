/**
 * GET /api/admin/report-requests/daily — séries diárias 30d.
 *
 * Devolve dois arrays alinhados por dia (DD/MM):
 *   - volume: { day, delivered, failed, queued }
 *   - timing: { day, avgSeconds | null }
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

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const Route = createFileRoute("/api/admin/report-requests/daily")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const days = 30;
        const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
        const since = new Date(sinceMs).toISOString();

        const { data, error } = await supabaseAdmin
          .from("report_requests")
          .select(
            "request_status, pdf_status, delivery_status, created_at, email_sent_at",
          )
          .gte("created_at", since)
          .limit(5000);

        if (error) {
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: error.message },
            500,
          );
        }

        // Inicializa 30 dias
        const volume = new Map<string, { delivered: number; failed: number; queued: number }>();
        const timing = new Map<string, { sum: number; n: number }>();
        const orderedKeys: string[] = [];
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(sinceMs + (days - 1 - i) * 24 * 60 * 60 * 1000);
          // melhor: gerar do mais antigo ao mais recente
        }
        // Reset: gerar do dia (today-29) até hoje
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
          orderedKeys.push(key);
          volume.set(key, { delivered: 0, failed: 0, queued: 0 });
          timing.set(key, { sum: 0, n: 0 });
        }

        for (const r of data ?? []) {
          const key = dayKey(r.created_at);
          const v = volume.get(key);
          if (!v) continue;
          if (r.delivery_status === "sent") {
            v.delivered += 1;
            if (r.email_sent_at) {
              const sec = (new Date(r.email_sent_at).getTime() - new Date(r.created_at).getTime()) / 1000;
              if (Number.isFinite(sec) && sec >= 0) {
                const t = timing.get(key)!;
                t.sum += sec;
                t.n += 1;
              }
            }
          } else if (
            r.request_status === "failed" ||
            r.pdf_status === "failed" ||
            r.delivery_status === "failed"
          ) {
            v.failed += 1;
          } else {
            v.queued += 1;
          }
        }

        const volumeArr = orderedKeys.map((k) => ({ day: k, ...volume.get(k)! }));
        const timingArr = orderedKeys.map((k) => {
          const t = timing.get(k)!;
          return { day: k, avgSeconds: t.n > 0 ? Math.round(t.sum / t.n) : null };
        });

        return jsonResponse({ success: true, volume: volumeArr, timing: timingArr });
      },
    },
  },
});