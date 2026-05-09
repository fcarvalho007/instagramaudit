/**
 * GET /api/admin/follow-ups — leads que precisam de ação humana agora.
 *
 * Aplica 5 regras heurísticas sobre `leads`, `report_requests`,
 * `product_events` (últimos 30d) e `beta_feedback`. Devolve a lista
 * ordenada por idade do gatilho (descendente), top 30.
 *
 * Read-only. Não envia emails, não muda estado, não chama providers.
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

type FollowUpRule =
  | "link_nao_visto"
  | "feedback_nao_pedido"
  | "feedback_nao_respondido"
  | "intencao_sem_followup"
  | "email_falhou";

interface FollowUpItem {
  leadId: string;
  name: string;
  email: string;
  handle: string | null;
  commercialStatus: string;
  rule: FollowUpRule;
  reason: string;
  suggestion: string;
  triggerAt: string;
  ageHours: number;
}

const COMMERCIAL_STATUSES = new Set([
  "interessado",
  "potencial_cliente",
  "convertido",
]);

const RULE_SUGGESTION: Record<FollowUpRule, string> = {
  link_nao_visto: "Reenviar link público ou contactar por outro canal.",
  feedback_nao_pedido: "Enviar pedido de feedback agora.",
  feedback_nao_respondido: "Lembrete amigável ou contacto direto.",
  intencao_sem_followup: "Marcar como interessado e iniciar conversa comercial.",
  email_falhou: "Verificar email do lead e reenviar.",
};

const RULE_REASON: Record<FollowUpRule, (h: number) => string> = {
  link_nao_visto: (h) => `Link enviado há ${Math.floor(h)}h sem visualização.`,
  feedback_nao_pedido: (h) => `Relatório visto há ${Math.floor(h)}h sem pedido de feedback.`,
  feedback_nao_respondido: (h) => `Feedback pedido há ${Math.floor(h)}h sem resposta.`,
  intencao_sem_followup: () => "Intenção alta/média no feedback sem estado comercial.",
  email_falhou: () => "Último envio de email falhou ou foi rejeitado.",
};

function hoursBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / 3_600_000);
}

export const Route = createFileRoute("/api/admin/follow-ups")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();

        const { data: leads, error: leadsErr } = await supabaseAdmin
          .from("leads")
          .select("id, name, email, commercial_status, archived_at")
          .is("archived_at", null);

        if (leadsErr) {
          return jsonResponse({ success: false, error: leadsErr.message }, 500);
        }

        const activeLeads = (leads ?? []).filter(
          (l) => l.commercial_status !== "arquivado",
        );
        const leadIds = activeLeads.map((l) => l.id);
        if (leadIds.length === 0) {
          return jsonResponse({
            success: true,
            generatedAt: now.toISOString(),
            total: 0,
            items: [],
          });
        }

        const { data: requests } = await supabaseAdmin
          .from("report_requests")
          .select(
            "lead_id, instagram_username, delivery_status, email_error_message",
          )
          .in("lead_id", leadIds);

        const handleByLead = new Map<string, string>();
        const failedEmailLeads = new Set<string>();
        for (const r of requests ?? []) {
          if (!r.lead_id) continue;
          const h = r.instagram_username?.toLowerCase();
          if (h && !handleByLead.has(r.lead_id)) handleByLead.set(r.lead_id, h);
          if (r.delivery_status === "failed" || r.email_error_message) {
            failedEmailLeads.add(r.lead_id);
          }
        }

        const { data: events } = await supabaseAdmin
          .from("product_events")
          .select("lead_id, handle, event_type, created_at")
          .in("event_type", [
            "report_link_sent",
            "feedback_requested",
            "report_viewed",
          ])
          .gte("created_at", thirtyDaysAgo);

        const handleToLeads = new Map<string, string[]>();
        for (const [leadId, h] of handleByLead) {
          const arr = handleToLeads.get(h) ?? [];
          arr.push(leadId);
          handleToLeads.set(h, arr);
        }

        const linkSentAt = new Map<string, string>();
        const feedbackRequestedAt = new Map<string, string>();
        const viewedAt = new Map<string, string>();

        function recordEvent(
          leadId: string,
          ts: string,
          target: Map<string, string>,
        ) {
          const prev = target.get(leadId);
          if (!prev || prev < ts) target.set(leadId, ts);
        }

        for (const ev of events ?? []) {
          const targets =
            ev.event_type === "report_link_sent"
              ? linkSentAt
              : ev.event_type === "feedback_requested"
                ? feedbackRequestedAt
                : viewedAt;

          if (ev.lead_id) {
            recordEvent(ev.lead_id, ev.created_at, targets);
          } else if (ev.handle) {
            const matched = handleToLeads.get(ev.handle.toLowerCase());
            if (matched) {
              for (const id of matched) recordEvent(id, ev.created_at, targets);
            }
          }
        }

        const { data: feedback } = await supabaseAdmin
          .from("beta_feedback")
          .select(
            "lead_id, usefulness_score, purchase_intent, pricing_preference, contact_consent, clarity_text, missing_text, created_at",
          )
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false });

        const feedbackByLead = new Map<string, (typeof feedback)[number]>();
        for (const f of feedback ?? []) {
          if (!f.lead_id) continue;
          if (!feedbackByLead.has(f.lead_id)) feedbackByLead.set(f.lead_id, f);
        }

        const items: FollowUpItem[] = [];

        function push(
          lead: (typeof activeLeads)[number],
          rule: FollowUpRule,
          triggerAt: string,
        ) {
          const ageHours = hoursBetween(new Date(triggerAt), now);
          items.push({
            leadId: lead.id,
            name: lead.name,
            email: lead.email,
            handle: handleByLead.get(lead.id) ?? null,
            commercialStatus: lead.commercial_status ?? "novo_pedido",
            rule,
            reason: RULE_REASON[rule](ageHours),
            suggestion: RULE_SUGGESTION[rule],
            triggerAt,
            ageHours,
          });
        }

        for (const lead of activeLeads) {
          // Rule 5: email failed (highest urgency, evaluate first)
          if (failedEmailLeads.has(lead.id)) {
            push(lead, "email_falhou", now.toISOString());
            continue;
          }

          const linkAt = linkSentAt.get(lead.id);
          const viewAt = viewedAt.get(lead.id);
          const feedbackReqAt = feedbackRequestedAt.get(lead.id);
          const fb = feedbackByLead.get(lead.id);

          // Rule 1: link_nao_visto — link sent >48h ago, no view recorded
          if (linkAt && !viewAt) {
            const h = hoursBetween(new Date(linkAt), now);
            if (h > 48) {
              push(lead, "link_nao_visto", linkAt);
              continue;
            }
          }

          // Rule 4: intencao_sem_followup
          if (fb && !COMMERCIAL_STATUSES.has(lead.commercial_status ?? "")) {
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
              push(lead, "intencao_sem_followup", fb.created_at);
              continue;
            }
          }

          // Rule 3: feedback_nao_respondido — feedback requested >72h ago, no feedback received
          if (feedbackReqAt && !fb) {
            const h = hoursBetween(new Date(feedbackReqAt), now);
            if (h > 72) {
              push(lead, "feedback_nao_respondido", feedbackReqAt);
              continue;
            }
          }

          // Rule 2: feedback_nao_pedido — report viewed >24h ago, no feedback request, no feedback
          if (viewAt && !feedbackReqAt && !fb) {
            const h = hoursBetween(new Date(viewAt), now);
            if (h > 24) {
              push(lead, "feedback_nao_pedido", viewAt);
              continue;
            }
          }
        }

        items.sort((a, b) => b.ageHours - a.ageHours);
        const top = items.slice(0, 30);

        return jsonResponse({
          success: true,
          generatedAt: now.toISOString(),
          total: items.length,
          items: top,
        });
      },
    },
  },
});