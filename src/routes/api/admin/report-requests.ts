/**
 * GET /api/admin/report-requests — lista paginada de RELATÓRIOS reais.
 *
 * A unidade de produto é `analysis_snapshots` (uma análise = um relatório).
 * Quando essa análise foi também desbloqueada por email (unlock), juntamos a
 * linha de `report_requests` + lead. Caso contrário a linha mostra estado
 * "análise pública (sem email)".
 *
 * Query params:
 *   status    — filtro de estado derivado (delivered | processing | failed | snapshot_only)
 *   source    — request_source (apenas filtra unlocks; "snapshot" para snapshots sem request)
 *   lead_id   — só relatórios desse lead
 *   q         — pesquisa por username ou email do lead
 *   period    — janela temporal (7d | 30d | 90d | ytd; default 30d)
 *   page      — 1-indexed (default 1)
 *   pageSize  — default 25, max 100
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { resolvePeriod } from "@/lib/admin/period";

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

interface LeadJoin {
  id: string;
  name: string | null;
  email: string | null;
  user_type: string | null;
  purpose: string | null;
  profile_ownership: string | null;
  source: string | null;
  company: string | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/report-requests")({
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
        const statusFilter = url.searchParams.get("status") ?? undefined;
        const source = url.searchParams.get("source") ?? undefined;
        const leadId = url.searchParams.get("lead_id")?.trim() || undefined;
        const q = url.searchParams.get("q")?.trim() ?? "";
        const { sinceISO } = resolvePeriod(url.searchParams.get("period"));

        const pageRaw = Number(url.searchParams.get("page") ?? "1");
        const pageSizeRaw = Number(url.searchParams.get("pageSize") ?? PAGE_SIZE_DEFAULT);
        const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
        const pageSize = Math.min(
          PAGE_SIZE_MAX,
          Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.floor(pageSizeRaw) : PAGE_SIZE_DEFAULT,
        );

        // 1) Carrega TODAS as análises na janela (1 linha = 1 relatório real).
        //    7d≈poucas dezenas, 90d≈centenas, ytd≈milhares — limit 5000 chega.
        const { data: snapshotsRaw, error: snapErr } = await supabaseAdmin
          .from("analysis_snapshots")
          .select("id, instagram_username, analysis_status, created_at, updated_at")
          .gte("created_at", sinceISO)
          .order("created_at", { ascending: false })
          .limit(5000);

        if (snapErr) {
          console.error("[admin/report-requests] snapshots query failed", snapErr);
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: snapErr.message },
            500,
          );
        }

        type Snap = {
          id: string;
          instagram_username: string;
          analysis_status: string;
          created_at: string;
          updated_at: string;
        };
        const snapshots = (snapshotsRaw ?? []) as Snap[];
        const snapshotIds = snapshots.map((s) => s.id);

        // 2) Para essas análises, carrega report_requests que apontam para elas.
        type ReqRow = {
          id: string;
          instagram_username: string;
          request_status: string;
          pdf_status: string;
          delivery_status: string;
          pdf_storage_path: string | null;
          email_sent_at: string | null;
          pdf_generated_at: string | null;
          is_free_request: boolean;
          analysis_snapshot_id: string | null;
          request_source: string;
          created_at: string;
          updated_at: string;
          lead_id: string | null;
          lead: LeadJoin | LeadJoin[] | null;
        };
        let requestsRaw: ReqRow[] = [];

        if (snapshotIds.length > 0) {
          const { data, error: reqErr } = await supabaseAdmin
            .from("report_requests")
            .select(
              `id, instagram_username, request_status, pdf_status, delivery_status,
               pdf_storage_path, email_sent_at, pdf_generated_at, is_free_request,
               analysis_snapshot_id, request_source, created_at, updated_at, lead_id,
               lead:lead_id ( id, name, email, user_type, purpose, profile_ownership, source, company )`,
            )
            .in("analysis_snapshot_id", snapshotIds);
          if (reqErr) {
            console.error("[admin/report-requests] requests query failed", reqErr);
            return jsonResponse(
              { success: false, error_code: "QUERY_FAILED", message: reqErr.message },
              500,
            );
          }
          requestsRaw = (data ?? []) as unknown as ReqRow[];
        }

        // Indexa requests por snapshot id (preferindo o mais recente caso haja >1).
        const requestBySnapshot = new Map<string, ReqRow>();
        for (const r of requestsRaw) {
          if (!r.analysis_snapshot_id) continue;
          const existing = requestBySnapshot.get(r.analysis_snapshot_id);
          if (!existing || r.created_at > existing.created_at) {
            requestBySnapshot.set(r.analysis_snapshot_id, r);
          }
        }

        // 3) Carrega analysis_events ligados a estes snapshots (window/data_source/cost).
        type EventRow = {
          analysis_snapshot_id: string | null;
          analysis_window: string | null;
          cache_key: string | null;
          data_source: string | null;
          outcome: string | null;
          competitor_handles: unknown;
          estimated_cost_usd: number | null;
          provider_call_log_id: string | null;
          created_at: string;
        };
        const eventBySnapshot = new Map<string, EventRow>();
        if (snapshotIds.length > 0) {
          const { data: evRaw, error: evErr } = await supabaseAdmin
            .from("analysis_events")
            .select(
              "analysis_snapshot_id, analysis_window, cache_key, data_source, outcome, competitor_handles, estimated_cost_usd, provider_call_log_id, created_at",
            )
            .in("analysis_snapshot_id", snapshotIds)
            .order("created_at", { ascending: false });
          if (evErr) {
            console.error("[admin/report-requests] events query failed", evErr);
          } else {
            for (const e of (evRaw ?? []) as EventRow[]) {
              if (!e.analysis_snapshot_id) continue;
              const cur = eventBySnapshot.get(e.analysis_snapshot_id);
              // Preferir success mais recente; caso contrário o mais recente.
              if (!cur) {
                eventBySnapshot.set(e.analysis_snapshot_id, e);
              } else if (
                cur.outcome !== "success" &&
                e.outcome === "success"
              ) {
                eventBySnapshot.set(e.analysis_snapshot_id, e);
              }
            }
          }
        }

        type Kind = "snapshot" | "request";
        type Row = {
          id: string;
          kind: Kind;
          snapshot_id: string;
          request_id: string | null;
          instagram_username: string;
          request_status: string;
          pdf_status: string;
          delivery_status: string;
          request_source: string;
          is_free_request: boolean;
          created_at: string;
          updated_at: string;
          email_sent_at: string | null;
          pdf_generated_at: string | null;
          analysis_snapshot_id: string | null;
          lead: LeadJoin | null;
          analysis_window: string | null;
          cache_key: string | null;
          data_source: string | null;
          competitor_count: number;
          competitor_handles: string[];
          snapshot_short: string;
          estimated_cost_usd: number | null;
        };

        const merged: Row[] = snapshots.map((s) => {
          const req = requestBySnapshot.get(s.id);
          const ev = eventBySnapshot.get(s.id) ?? null;
          const competitorHandlesArr = Array.isArray(ev?.competitor_handles)
            ? (ev!.competitor_handles as unknown[]).filter(
                (x): x is string => typeof x === "string",
              )
            : [];
          const eventExtras = {
            analysis_window: ev?.analysis_window ?? null,
            cache_key: ev?.cache_key ?? null,
            data_source: ev?.data_source ?? null,
            competitor_count: competitorHandlesArr.length,
            competitor_handles: competitorHandlesArr,
            snapshot_short: s.id.slice(0, 8),
            estimated_cost_usd:
              typeof ev?.estimated_cost_usd === "number"
                ? ev!.estimated_cost_usd
                : null,
          };
          if (req) {
            const leadValue = Array.isArray(req.lead) ? req.lead[0] ?? null : req.lead;
            return {
              id: req.id,
              kind: "request",
              snapshot_id: s.id,
              request_id: req.id,
              instagram_username: req.instagram_username,
              request_status: req.request_status,
              pdf_status: req.pdf_status,
              delivery_status: req.delivery_status,
              request_source: req.request_source,
              is_free_request: req.is_free_request,
              created_at: req.created_at,
              updated_at: req.updated_at,
              email_sent_at: req.email_sent_at,
              pdf_generated_at: req.pdf_generated_at,
              analysis_snapshot_id: req.analysis_snapshot_id,
              lead: leadValue
                ? {
                    id: leadValue.id,
                    name: leadValue.name,
                    email: leadValue.email,
                    user_type: leadValue.user_type,
                    purpose: leadValue.purpose,
                    profile_ownership: leadValue.profile_ownership,
                    source: leadValue.source,
                    company: leadValue.company,
                  }
                : null,
              ...eventExtras,
            };
          }
          // Análise sem unlock (sem email).
          return {
            id: s.id,
            kind: "snapshot",
            snapshot_id: s.id,
            request_id: null,
            instagram_username: s.instagram_username,
            request_status: s.analysis_status === "ready" ? "completed" : s.analysis_status,
            pdf_status: "not_generated",
            delivery_status: "not_sent",
            request_source: "public_analysis",
            is_free_request: true,
            created_at: s.created_at,
            updated_at: s.updated_at,
            email_sent_at: null,
            pdf_generated_at: null,
            analysis_snapshot_id: s.id,
            lead: null,
            ...eventExtras,
          };
        });

        // Filtros aplicados após o merge.
        let filtered = merged;
        if (statusFilter) {
          filtered = filtered.filter((r) => deriveStatus(r) === statusFilter);
        }
        if (source) {
          filtered = filtered.filter((r) => r.request_source === source);
        }
        if (leadId) {
          filtered = filtered.filter((r) => r.lead?.id === leadId);
        }
        if (q) {
          const qLow = q.toLowerCase();
          if (q.includes("@")) {
            filtered = filtered.filter((r) =>
              (r.lead?.email ?? "").toLowerCase().includes(qLow),
            );
          } else {
            filtered = filtered.filter((r) =>
              r.instagram_username.toLowerCase().includes(qLow),
            );
          }
        }

        const total = filtered.length;
        const from = (page - 1) * pageSize;
        const rows = filtered.slice(from, from + pageSize);

        return jsonResponse({
          success: true,
          rows,
          total,
          page,
          pageSize,
        });
      },
    },
  },
});

function deriveStatus(r: {
  kind: "snapshot" | "request";
  request_status: string;
  pdf_status: string;
  delivery_status: string;
}): "snapshot_only" | "delivered" | "processing" | "failed" {
  if (r.kind === "snapshot") return "snapshot_only";
  if (r.delivery_status === "sent") return "delivered";
  if (
    r.request_status === "failed" ||
    r.pdf_status === "failed" ||
    r.delivery_status === "failed"
  ) {
    return "failed";
  }
  return "processing";
}
