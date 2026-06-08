/**
 * GET /api/admin/report-detail/$id — detalhe agregado de um report_request
 * para o ReportDrawer. Retorna a forma esperada por `MockReportDetail`
 * (drop-in), preenchida com dados reais de `report_requests`, `leads`,
 * `analysis_snapshots` e `provider_call_logs`.
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

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function durationLabel(fromIso: string, toIso: string | null): string | null {
  if (!toIso) return null;
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function mapStatus(r: {
  delivery_status: string;
  pdf_status: string;
  request_status: string;
}): "delivered" | "processing" | "queued" | "failed" {
  if (r.delivery_status === "sent") return "delivered";
  if (
    r.request_status === "failed" ||
    r.pdf_status === "failed" ||
    r.delivery_status === "failed"
  )
    return "failed";
  if (r.request_status === "processing" || r.pdf_status === "generating")
    return "processing";
  return "queued";
}

export const Route = createFileRoute("/api/admin/report-detail/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const id = params.id;

        const { data: req, error } = await supabaseAdmin
          .from("report_requests")
          .select(
            `id, instagram_username, request_status, pdf_status, delivery_status,
             pdf_storage_path, pdf_generated_at, email_sent_at, email_message_id,
             email_error_message, pdf_error_message, is_free_request, request_source,
             analysis_snapshot_id, created_at, updated_at,
             lead:lead_id ( id, name, email )`,
          )
          .eq("id", id)
          .single();

        if (error || !req) {
          return jsonResponse(
            { success: false, error_code: "NOT_FOUND", message: "Pedido não encontrado." },
            404,
          );
        }

        type LeadJoin = { id: string; name: string | null; email: string | null };
        const r = req as unknown as typeof req & { lead: LeadJoin | LeadJoin[] | null };
        const lead = Array.isArray(r.lead) ? r.lead[0] ?? null : r.lead;

        const status = mapStatus(r);
        const origin = r.is_free_request ? "single" : "subscription";

        // Provider call logs associados (best-effort por handle/criação próxima)
        const sinceCreated = new Date(
          new Date(r.created_at).getTime() - 60 * 60 * 1000,
        ).toISOString();
        const { data: calls } = await supabaseAdmin
          .from("provider_call_logs")
          .select("provider, status, duration_ms, estimated_cost_usd, actual_cost_usd, created_at")
          .eq("handle", r.instagram_username)
          .gte("created_at", sinceCreated)
          .order("created_at", { ascending: true })
          .limit(20);

        const apifyCost = (calls ?? [])
          .filter((c) => c.provider === "apify")
          .reduce(
            (acc, c) =>
              acc + Number(c.actual_cost_usd ?? c.estimated_cost_usd ?? 0),
            0,
          );
        const openaiCost = (calls ?? [])
          .filter((c) => c.provider === "openai")
          .reduce(
            (acc, c) =>
              acc + Number(c.actual_cost_usd ?? c.estimated_cost_usd ?? 0),
            0,
          );

        // Pull the analysis_events row for this snapshot (prefer success),
        // then join to its provider_call_logs row. Read-only — no schema.
        type ProviderCall = {
          provider: string;
          status: string;
          estimated_cost_usd: number | null;
          actual_cost_usd: number | null;
          apify_run_id: string | null;
        };
        let analysisEvent: {
          id: string;
          handle: string;
          analysis_window: string | null;
          cache_key: string | null;
          data_source: string | null;
          outcome: string | null;
          estimated_cost_usd: number | null;
          posts_returned: number | null;
          duration_ms: number | null;
          competitor_handles: string[];
          snapshot_id: string | null;
          provider_call: ProviderCall | null;
        } | null = null;

        if (r.analysis_snapshot_id) {
          const { data: evRows } = await supabaseAdmin
            .from("analysis_events")
            .select(
              "id, handle, analysis_window, cache_key, data_source, outcome, estimated_cost_usd, posts_returned, duration_ms, competitor_handles, analysis_snapshot_id, provider_call_log_id, created_at",
            )
            .eq("analysis_snapshot_id", r.analysis_snapshot_id)
            .order("created_at", { ascending: false })
            .limit(10);

          const rows = evRows ?? [];
          const ev = rows.find((e) => e.outcome === "success") ?? rows[0] ?? null;

          if (ev) {
            let providerCall: ProviderCall | null = null;
            if (ev.provider_call_log_id) {
              const { data: pcl } = await supabaseAdmin
                .from("provider_call_logs")
                .select(
                  "provider, status, estimated_cost_usd, actual_cost_usd, apify_run_id",
                )
                .eq("id", ev.provider_call_log_id)
                .maybeSingle();
              if (pcl) {
                providerCall = {
                  provider: pcl.provider,
                  status: pcl.status,
                  estimated_cost_usd:
                    pcl.estimated_cost_usd == null
                      ? null
                      : Number(pcl.estimated_cost_usd),
                  actual_cost_usd:
                    pcl.actual_cost_usd == null
                      ? null
                      : Number(pcl.actual_cost_usd),
                  apify_run_id: pcl.apify_run_id ?? null,
                };
              }
            }
            analysisEvent = {
              id: ev.id,
              handle: ev.handle,
              analysis_window: ev.analysis_window ?? null,
              cache_key: ev.cache_key ?? null,
              data_source: ev.data_source ?? null,
              outcome: ev.outcome ?? null,
              estimated_cost_usd:
                ev.estimated_cost_usd == null
                  ? null
                  : Number(ev.estimated_cost_usd),
              posts_returned: ev.posts_returned ?? null,
              duration_ms: ev.duration_ms ?? null,
              competitor_handles: Array.isArray(ev.competitor_handles)
                ? (ev.competitor_handles as unknown[]).filter(
                    (x): x is string => typeof x === "string",
                  )
                : [],
              snapshot_id: ev.analysis_snapshot_id ?? null,
              provider_call: providerCall,
            };
          }
        }

        const phases = [
          {
            name: "Pedido",
            status: "done" as const,
            timestamp: fmtTime(r.created_at),
            durationMs: 0,
          },
          {
            name: "Análise Apify",
            status: r.analysis_snapshot_id
              ? ("done" as const)
              : status === "failed"
                ? ("failed" as const)
                : status === "queued"
                  ? ("queued" as const)
                  : ("running" as const),
            timestamp: r.analysis_snapshot_id ? fmtTime(r.updated_at) : null,
            durationMs: null,
          },
          {
            name: "PDF",
            status:
              r.pdf_status === "generated"
                ? ("done" as const)
                : r.pdf_status === "generating"
                  ? ("running" as const)
                  : r.pdf_status === "failed"
                    ? ("failed" as const)
                    : ("queued" as const),
            timestamp: r.pdf_generated_at ? fmtTime(r.pdf_generated_at) : null,
            durationMs: null,
          },
          {
            name: "Email",
            status:
              r.delivery_status === "sent"
                ? ("done" as const)
                : r.delivery_status === "failed"
                  ? ("failed" as const)
                  : ("queued" as const),
            timestamp: r.email_sent_at ? fmtTime(r.email_sent_at) : null,
            durationMs: null,
          },
        ];

        const events: Array<{ timestamp: string; message: string; tone: string }> = [
          { timestamp: fmtTime(r.created_at), message: `Pedido recebido (${r.request_source})`, tone: "info" },
        ];
        if (r.analysis_snapshot_id) {
          events.push({ timestamp: fmtTime(r.updated_at), message: "Análise concluída", tone: "success" });
        }
        if (r.pdf_generated_at) {
          events.push({ timestamp: fmtTime(r.pdf_generated_at), message: "PDF gerado", tone: "success" });
        }
        if (r.pdf_error_message) {
          events.push({ timestamp: fmtTime(r.updated_at), message: `PDF falhou: ${r.pdf_error_message}`, tone: "danger" });
        }
        if (r.email_sent_at) {
          events.push({ timestamp: fmtTime(r.email_sent_at), message: `Email enviado (${r.email_message_id ?? "ok"})`, tone: "success" });
        }
        if (r.email_error_message) {
          events.push({ timestamp: fmtTime(r.updated_at), message: `Email falhou: ${r.email_error_message}`, tone: "danger" });
        }

        const totalCost = apifyCost + openaiCost;

        const detail = {
          id: r.id,
          status,
          origin,
          customer: {
            name: lead?.name ?? "—",
            email: lead?.email ?? "—",
          },
          handle: `@${r.instagram_username}`,
          startedAtIso: r.created_at,
          startedAtLabel: fmtTime(r.created_at),
          deliveredAtLabel: r.email_sent_at ? fmtTime(r.email_sent_at) : null,
          totalDurationLabel: durationLabel(r.created_at, r.email_sent_at ?? r.pdf_generated_at ?? null),
          totalCost: totalCost > 0 ? `$${totalCost.toFixed(3)}` : null,
          phases,
          costs: {
            apify: Number(apifyCost.toFixed(4)),
            openai: Number(openaiCost.toFixed(4)),
            other: 0,
          },
          events,
          errorCode: r.pdf_error_message || r.email_error_message ? "PIPELINE_ERROR" : undefined,
          errorMessage: r.pdf_error_message ?? r.email_error_message ?? undefined,
          snapshotPreview: {
            request_id: r.id,
            instagram_username: r.instagram_username,
            analysis_snapshot_id: r.analysis_snapshot_id,
            pdf_storage_path: r.pdf_storage_path,
            request_source: r.request_source,
            is_free_request: r.is_free_request,
          },
          analysisEvent,
        };

        return jsonResponse({ success: true, detail });
      },
    },
  },
});