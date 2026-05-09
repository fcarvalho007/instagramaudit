/**
 * GET /api/admin/beta-funnel — funil operacional do beta.
 *
 * Devolve 6 etapas do ciclo de vida beta (pedido → interesse comercial)
 * combinando `leads.commercial_status` com sinais reais em
 * `report_requests`, `product_events` e `beta_feedback`.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import {
  LIFECYCLE_STATUSES,
  type LifecycleStatus,
} from "@/lib/admin/lead-lifecycle";
import { interpretFeedback } from "@/lib/admin/feedback-intent";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const STATUS_INDEX: Record<string, number> = Object.fromEntries(
  LIFECYCLE_STATUSES.map((s, i) => [s, i]),
);

function statusAtLeast(
  current: string | null | undefined,
  target: LifecycleStatus,
): boolean {
  if (!current) return false;
  const ci = STATUS_INDEX[current];
  const ti = STATUS_INDEX[target];
  if (ci === undefined || ti === undefined) return false;
  // `arquivado` sai da ordem normal — só conta se já tiver passado pelo
  // estado alvo antes (não temos histórico, por isso ignoramos).
  if (current === "arquivado") return false;
  return ci >= ti;
}

export const Route = createFileRoute("/api/admin/beta-funnel")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const { data: leads, error: leadsErr } = await supabaseAdmin
          .from("leads")
          .select("id, commercial_status");

        if (leadsErr) {
          console.error("[beta-funnel] leads query failed", leadsErr);
          return jsonResponse(
            { success: false, error: leadsErr.message },
            500,
          );
        }

        const allLeadIds = new Set((leads ?? []).map((l) => l.id));
        const total = allLeadIds.size;

        // Map status by lead_id
        const statusByLead = new Map<string, string>();
        for (const l of leads ?? []) {
          statusByLead.set(l.id, l.commercial_status ?? "novo_pedido");
        }

        // report_requests → conjunto de leads com relatório gerado e handle map
        const reportGenerated = new Set<string>();
        const handleByLead = new Map<string, string>();
        if (allLeadIds.size > 0) {
          const { data: requests } = await supabaseAdmin
            .from("report_requests")
            .select(
              "lead_id, instagram_username, request_status, analysis_snapshot_id",
            )
            .in("lead_id", [...allLeadIds]);

          const READY = new Set(["ready", "completed", "generated"]);
          for (const r of requests ?? []) {
            if (!r.lead_id) continue;
            if (
              r.analysis_snapshot_id ||
              (r.request_status && READY.has(r.request_status))
            ) {
              reportGenerated.add(r.lead_id);
            }
            const h = r.instagram_username?.toLowerCase();
            if (h && !handleByLead.has(r.lead_id)) {
              handleByLead.set(r.lead_id, h);
            }
          }
        }

        // product_events
        const linkSentLeads = new Set<string>();
        const viewedLeads = new Set<string>();
        const handleToLeads = new Map<string, string[]>();
        for (const [leadId, h] of handleByLead) {
          const arr = handleToLeads.get(h) ?? [];
          arr.push(leadId);
          handleToLeads.set(h, arr);
        }

        if (allLeadIds.size > 0) {
          const { data: events } = await supabaseAdmin
            .from("product_events")
            .select("lead_id, handle, event_type")
            .in("event_type", ["report_link_sent", "report_viewed"]);

          for (const ev of events ?? []) {
            const target =
              ev.event_type === "report_link_sent" ? linkSentLeads : viewedLeads;
            if (ev.lead_id && allLeadIds.has(ev.lead_id)) {
              target.add(ev.lead_id);
            } else if (ev.handle) {
              const matched = handleToLeads.get(ev.handle.toLowerCase());
              if (matched) {
                for (const id of matched) target.add(id);
              }
            }
          }
        }

        // beta_feedback (latest per lead)
        type FeedbackRow = {
          lead_id: string;
          usefulness_score: number;
          purchase_intent: string;
          pricing_preference: string | null;
          contact_consent: boolean;
          clarity_text: string | null;
          missing_text: string | null;
          created_at: string;
        };
        const feedbackByLead = new Map<string, FeedbackRow>();
        if (allLeadIds.size > 0) {
          const { data: feedback } = await supabaseAdmin
            .from("beta_feedback")
            .select(
              "lead_id, usefulness_score, purchase_intent, pricing_preference, contact_consent, clarity_text, missing_text, created_at",
            )
            .in("lead_id", [...allLeadIds])
            .order("created_at", { ascending: false });

          for (const f of feedback ?? []) {
            if (!f.lead_id) continue;
            if (!feedbackByLead.has(f.lead_id)) {
              feedbackByLead.set(f.lead_id, f as FeedbackRow);
            }
          }
        }

        // Build the 6 stage sets
        const s1 = new Set(allLeadIds);

        const s2 = new Set<string>();
        for (const id of allLeadIds) {
          if (
            reportGenerated.has(id) ||
            statusAtLeast(statusByLead.get(id), "relatorio_gerado")
          ) {
            s2.add(id);
          }
        }

        const s3 = new Set<string>();
        for (const id of allLeadIds) {
          if (
            linkSentLeads.has(id) ||
            statusAtLeast(statusByLead.get(id), "link_enviado")
          ) {
            s3.add(id);
          }
        }

        const s4 = new Set<string>();
        for (const id of allLeadIds) {
          if (
            viewedLeads.has(id) ||
            statusAtLeast(statusByLead.get(id), "relatorio_visto")
          ) {
            s4.add(id);
          }
        }

        const s5 = new Set<string>();
        for (const id of allLeadIds) {
          if (
            feedbackByLead.has(id) ||
            statusAtLeast(statusByLead.get(id), "feedback_recebido")
          ) {
            s5.add(id);
          }
        }

        const COMMERCIAL = new Set([
          "interessado",
          "potencial_cliente",
          "convertido",
        ]);
        const s6 = new Set<string>();
        for (const id of allLeadIds) {
          const st = statusByLead.get(id);
          if (st && COMMERCIAL.has(st)) {
            s6.add(id);
            continue;
          }
          const fb = feedbackByLead.get(id);
          if (fb) {
            const r = interpretFeedback({
              id: "",
              usefulness_score: fb.usefulness_score,
              purchase_intent: fb.purchase_intent as
                | "sim"
                | "talvez"
                | "nao",
              pricing_preference: fb.pricing_preference,
              contact_consent: fb.contact_consent,
              clarity_text: fb.clarity_text,
              missing_text: fb.missing_text,
              created_at: fb.created_at,
            });
            if (r.intent === "alto" || r.intent === "medio") {
              s6.add(id);
            }
          }
        }

        const s7 = new Set<string>();
        for (const id of allLeadIds) {
          if (statusByLead.get(id) === "convertido") s7.add(id);
        }

        const counts = [s1, s2, s3, s4, s5, s6, s7].map((s) => s.size);
        const stagesMeta = [
          {
            key: "pedidos",
            label: "Pedidos beta",
            description: "Leads que submeteram o formulário de pedido beta.",
          },
          {
            key: "relatorios",
            label: "Relatórios gerados",
            description: "Pedidos com snapshot de análise pronto.",
          },
          {
            key: "links",
            label: "Links enviados",
            description: "Lead recebeu o email com o link público do relatório.",
          },
          {
            key: "vistos",
            label: "Relatórios vistos",
            description: "Existe pelo menos um evento de visualização do relatório.",
          },
          {
            key: "feedback",
            label: "Feedback recebido",
            description: "Lead submeteu o formulário de feedback beta.",
          },
          {
            key: "interesse",
            label: "Interesse comercial",
            description: "Sinal comercial alto/médio ou estado interessado/potencial/convertido.",
          },
          {
            key: "convertidos",
            label: "Convertidos",
            description: "Leads explicitamente marcados como convertido.",
          },
        ];

        const stages = stagesMeta.map((m, i) => {
          const count = counts[i];
          const prev = i > 0 ? counts[i - 1] : count;
          const pctOfTotal = total > 0 ? count / total : 0;
          const pctVsPrev = prev > 0 ? count / prev : 0;
          const dropFromPrev = i > 0 ? Math.max(prev - count, 0) : 0;
          return {
            ...m,
            count,
            pctOfTotal,
            pctVsPrev,
            dropFromPrev,
          };
        });

        return jsonResponse({ success: true, total, stages });
      },
    },
  },
});