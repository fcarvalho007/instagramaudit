/**
 * GET /api/admin/beta-funnel — funil de conversão pública.
 *
 * Devolve 7 etapas do percurso público (report visto → unlock → guardado →
 * feedback → intenção → convertido) combinando `product_events`,
 * `beta_feedback` e `leads.commercial_status`.
 *
 * Notas:
 * - Etapas 1-2 medem actores anónimos (`actor_hash`); 3-7 medem leads
 *   identificados (`lead_id`). Há quebra estrutural na transição 2→3.
 * - `total` corresponde à etapa 1 (views públicos únicos).
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { interpretFeedback } from "@/lib/admin/feedback-intent";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

        // 1) Carregar product_events relevantes para o funil público.
        const FUNNEL_EVENTS = [
          "report_viewed",
          "unlock_clicked",
          "unlock_email_submitted",
          "unlock_completed",
          "report_saved_to_account",
          "feedback_submitted",
        ];
        const { data: events, error: evErr } = await supabaseAdmin
          .from("product_events")
          .select("lead_id, handle, actor_hash, event_type")
          .in("event_type", FUNNEL_EVENTS);

        if (evErr) {
          console.error("[beta-funnel] product_events query failed", evErr);
          return jsonResponse({ success: false, error: evErr.message }, 500);
        }

        // s1: views públicos únicos por (handle, actor_hash). Se faltar
        // actor_hash, usamos lead_id como fallback de identificação.
        const viewKeys = new Set<string>();
        // s2: actor_hash distintos com unlock iniciado (anónimo).
        const unlockStartedKeys = new Set<string>();
        // s3..s5: lead_id distintos por evento.
        const unlockCompletedLeads = new Set<string>();
        const reportSavedLeads = new Set<string>();
        const feedbackEventLeads = new Set<string>();

        for (const ev of events ?? []) {
          const id = ev.actor_hash ?? ev.lead_id ?? null;
          switch (ev.event_type) {
            case "report_viewed": {
              const key = `${(ev.handle ?? "").toLowerCase()}|${id ?? "?"}`;
              if (id) viewKeys.add(key);
              break;
            }
            case "unlock_clicked":
            case "unlock_email_submitted": {
              if (id) unlockStartedKeys.add(id);
              break;
            }
            case "unlock_completed": {
              if (ev.lead_id) unlockCompletedLeads.add(ev.lead_id);
              break;
            }
            case "report_saved_to_account": {
              if (ev.lead_id) reportSavedLeads.add(ev.lead_id);
              break;
            }
            case "feedback_submitted": {
              if (ev.lead_id) feedbackEventLeads.add(ev.lead_id);
              break;
            }
          }
        }

        // 2) beta_feedback (último por lead) — base para s5 e s6.
        const { data: feedback, error: fbErr } = await supabaseAdmin
          .from("beta_feedback")
          .select(
            "lead_id, usefulness_score, purchase_intent, pricing_preference, contact_consent, clarity_text, missing_text, created_at",
          )
          .order("created_at", { ascending: false });

        if (fbErr) {
          console.error("[beta-funnel] beta_feedback query failed", fbErr);
          return jsonResponse({ success: false, error: fbErr.message }, 500);
        }

        type FeedbackRow = NonNullable<typeof feedback>[number];
        const feedbackByLead = new Map<string, FeedbackRow>();
        for (const f of feedback ?? []) {
          if (!f.lead_id) continue;
          if (!feedbackByLead.has(f.lead_id)) {
            feedbackByLead.set(f.lead_id, f);
          }
        }

        const feedbackLeads = new Set<string>([
          ...feedbackEventLeads,
          ...feedbackByLead.keys(),
        ]);

        // 3) leads.commercial_status — base para s6 (alargamento) e s7.
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

        const statusByLead = new Map<string, string>();
        const convertedLeads = new Set<string>();
        const COMMERCIAL = new Set([
          "interessado",
          "potencial_cliente",
          "convertido",
        ]);
        for (const l of leads ?? []) {
          const st = l.commercial_status ?? "novo_pedido";
          statusByLead.set(l.id, st);
          if (st === "convertido") convertedLeads.add(l.id);
        }

        // s6: intenção média/alta — feedback explícito OU status comercial.
        const intentLeads = new Set<string>();
        for (const [leadId, fb] of feedbackByLead) {
          const r = interpretFeedback({
            id: "",
            usefulness_score: fb.usefulness_score,
            purchase_intent: fb.purchase_intent as "sim" | "talvez" | "nao",
            pricing_preference: fb.pricing_preference,
            contact_consent: fb.contact_consent,
            clarity_text: fb.clarity_text,
            missing_text: fb.missing_text,
            created_at: fb.created_at,
          });
          if (r.intent === "alto" || r.intent === "medio") {
            intentLeads.add(leadId);
          }
        }
        for (const [leadId, st] of statusByLead) {
          if (COMMERCIAL.has(st)) intentLeads.add(leadId);
        }

        const counts = [
          viewKeys.size,
          unlockStartedKeys.size,
          unlockCompletedLeads.size,
          reportSavedLeads.size,
          feedbackLeads.size,
          intentLeads.size,
          convertedLeads.size,
        ];
        const total = counts[0];

        const stagesMeta = [
          {
            key: "report_visto",
            label: "Report público visto",
            description: "Visualizações únicas do relatório público (anónimo).",
          },
          {
            key: "unlock_iniciado",
            label: "Unlock iniciado",
            description: "Clique no CTA ou submissão de email para desbloquear.",
          },
          {
            key: "unlock_concluido",
            label: "Unlock concluído",
            description: "Email confirmado e relatório desbloqueado (lead criada).",
          },
          {
            key: "report_guardado",
            label: "Report guardado",
            description: "Lead guardou o relatório na conta.",
          },
          {
            key: "feedback_recebido",
            label: "Feedback recebido",
            description: "Lead submeteu o formulário de feedback beta.",
          },
          {
            key: "intencao",
            label: "Intenção média/alta",
            description:
              "Feedback com intenção alto/médio ou estado comercial interessado/potencial.",
          },
          {
            key: "convertido",
            label: "Convertido",
            description: "Lead marcada como convertida no CRM.",
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