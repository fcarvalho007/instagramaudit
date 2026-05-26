/**
 * GET /api/admin/report-requests/daily — séries diárias.
 *
 * Devolve dois arrays alinhados por dia (DD/MM) na janela `?period=`:
 *   - volume: { day, analyses, with_unlock, delivered, failed }
 *   - timing: { day, avgSeconds | null }   (apenas para análises com entrega)
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { resolvePeriod } from "@/lib/admin/period";

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
      GET: async ({ request }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const url = new URL(request.url);
        const { sinceISO, days } = resolvePeriod(url.searchParams.get("period"));

        const { data: snapshots, error: sErr } = await supabaseAdmin
          .from("analysis_snapshots")
          .select("id, created_at")
          .gte("created_at", sinceISO)
          .limit(10000);
        if (sErr) {
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: sErr.message },
            500,
          );
        }
        const snaps = snapshots ?? [];
        const snapshotIds = snaps.map((s) => s.id);

        type Req = {
          analysis_snapshot_id: string | null;
          request_status: string;
          pdf_status: string;
          delivery_status: string;
          created_at: string;
          email_sent_at: string | null;
        };
        let reqs: Req[] = [];
        if (snapshotIds.length > 0) {
          const { data, error: rErr } = await supabaseAdmin
            .from("report_requests")
            .select(
              "analysis_snapshot_id, request_status, pdf_status, delivery_status, created_at, email_sent_at",
            )
            .in("analysis_snapshot_id", snapshotIds);
          if (rErr) {
            return jsonResponse(
              { success: false, error_code: "QUERY_FAILED", message: rErr.message },
              500,
            );
          }
          reqs = (data ?? []) as Req[];
        }
        const reqBySnap = new Map<string, Req>();
        for (const r of reqs) {
          if (!r.analysis_snapshot_id) continue;
          const e = reqBySnap.get(r.analysis_snapshot_id);
          if (!e || r.created_at > e.created_at) {
            reqBySnap.set(r.analysis_snapshot_id, r);
          }
        }

        // Para janelas grandes (>120 dias), agrupamos por semana para não criar
        // um eixo X ilegível — limita visualmente a ~52 pontos máx.
        const useWeekBucket = days > 120;
        const bucketCount = useWeekBucket ? Math.ceil(days / 7) : days;

        type VolBucket = { analyses: number; with_unlock: number; delivered: number; failed: number };
        const volume = new Map<string, VolBucket>();
        const timing = new Map<string, { sum: number; n: number }>();
        const orderedKeys: string[] = [];

        for (let i = bucketCount - 1; i >= 0; i--) {
          const offsetMs = i * (useWeekBucket ? 7 : 1) * 24 * 60 * 60 * 1000;
          const d = new Date(Date.now() - offsetMs);
          const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
          orderedKeys.push(key);
          volume.set(key, { analyses: 0, with_unlock: 0, delivered: 0, failed: 0 });
          timing.set(key, { sum: 0, n: 0 });
        }

        function bucketKey(iso: string): string | null {
          if (!useWeekBucket) return dayKey(iso);
          const created = new Date(iso).getTime();
          const ageDays = Math.floor((Date.now() - created) / (24 * 60 * 60 * 1000));
          const bucketIdx = Math.floor(ageDays / 7);
          if (bucketIdx >= bucketCount) return null;
          return orderedKeys[bucketCount - 1 - bucketIdx] ?? null;
        }

        for (const s of snaps) {
          const key = bucketKey(s.created_at);
          if (!key) continue;
          const v = volume.get(key);
          if (!v) continue;
          v.analyses += 1;
          const r = reqBySnap.get(s.id);
          if (!r) continue;
          v.with_unlock += 1;
          if (r.delivery_status === "sent") {
            v.delivered += 1;
            if (r.email_sent_at) {
              const sec =
                (new Date(r.email_sent_at).getTime() - new Date(s.created_at).getTime()) / 1000;
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
          }
        }

        const volumeArr = orderedKeys.map((k) => ({ day: k, ...volume.get(k)! }));
        const timingArr = orderedKeys.map((k) => {
          const t = timing.get(k)!;
          return { day: k, avgSeconds: t.n > 0 ? Math.round(t.sum / t.n) : null };
        });

        return jsonResponse({
          success: true,
          window_days: days,
          volume: volumeArr,
          timing: timingArr,
        });
      },
    },
  },
});