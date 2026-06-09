/**
 * GET /api/admin/leads-kanban — enriched leads for kanban view.
 *
 * Returns all leads joined with latest report_request and product_events stats.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { resolveCallCost } from "@/lib/admin/cost-resolution";
import type {
  LeadPaymentSummary,
  PaymentProduct,
} from "@/lib/admin/kanban-columns";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/leads-kanban")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        // 1. All leads
        const { data: leads, error: leadsErr } = await supabaseAdmin
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false });

        if (leadsErr) {
          console.error("[leads-kanban] leads query failed", leadsErr);
          return jsonResponse({ success: false, error: leadsErr.message }, 500);
        }

        if (!leads || leads.length === 0) {
          return jsonResponse({ success: true, leads: [] });
        }

        const leadIds = leads.map((l) => l.id);

        // 1b. Resumo de pagamentos por lead (vindo de `lead_payments`).
        const paymentByLead = new Map<string, LeadPaymentSummary>();
        {
          const { data: payments } = await supabaseAdmin
            .from("lead_payments")
            .select(
              "lead_id, product, amount_cents, status, paid_at, checkout_started_at, created_at, updated_at",
            )
            .in("lead_id", leadIds)
            .order("created_at", { ascending: false });

          if (payments) {
            for (const p of payments) {
              const lid = p.lead_id as string;
              const summary = paymentByLead.get(lid) ?? {
                has_pending: false,
                paid_products: [] as PaymentProduct[],
                last_payment_at: null as string | null,
                pending_checkout_started_at: null as string | null,
                total_paid_cents: 0,
              };
              const product = p.product as PaymentProduct;
              const ts =
                (p.paid_at as string | null) ??
                (p.checkout_started_at as string | null) ??
                (p.updated_at as string | null) ??
                (p.created_at as string | null);
              if (
                ts &&
                (!summary.last_payment_at ||
                  new Date(ts).getTime() >
                    new Date(summary.last_payment_at).getTime())
              ) {
                summary.last_payment_at = ts;
              }
              if (p.status === "paid") {
                if (!summary.paid_products.includes(product)) {
                  summary.paid_products.push(product);
                }
                summary.total_paid_cents += Number(p.amount_cents ?? 0);
              } else if (p.status === "pending") {
                summary.has_pending = true;
                const started =
                  (p.checkout_started_at as string | null) ??
                  (p.created_at as string | null);
                if (
                  started &&
                  (!summary.pending_checkout_started_at ||
                    new Date(started).getTime() <
                      new Date(summary.pending_checkout_started_at).getTime())
                ) {
                  // mantemos o mais antigo (= "abandonado há mais tempo")
                  summary.pending_checkout_started_at = started;
                }
              }
              paymentByLead.set(lid, summary);
            }
          }
        }

        // 2. Latest report_request per lead
        const { data: requests } = await supabaseAdmin
          .from("report_requests")
          .select(
            "id, lead_id, instagram_username, request_status, pdf_status, analysis_snapshot_id, created_at, updated_at"
          )
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false });

        // Build map: lead_id → latest request
        type ReqRow = NonNullable<typeof requests>[number];
        const requestByLead = new Map<string, ReqRow>();
        const reportCountByLead = new Map<string, number>();
        if (requests) {
          for (const r of requests) {
            if (!requestByLead.has(r.lead_id)) {
              requestByLead.set(r.lead_id, r);
            }
            reportCountByLead.set(
              r.lead_id,
              (reportCountByLead.get(r.lead_id) ?? 0) + 1,
            );
          }
        }

        // 3. Report view counts from product_events
        const handles = [
          ...new Set(
            (requests ?? [])
              .map((r) => r.instagram_username?.toLowerCase())
              .filter(Boolean)
          ),
        ];

        let viewsByHandle = new Map<string, number>();
        if (handles.length > 0) {
          const { data: viewEvents } = await supabaseAdmin
            .from("product_events")
            .select("handle")
            .eq("event_type", "report_viewed")
            .in("handle", handles);

          if (viewEvents) {
            for (const ev of viewEvents) {
              if (ev.handle) {
                viewsByHandle.set(
                  ev.handle,
                  (viewsByHandle.get(ev.handle) ?? 0) + 1
                );
              }
            }
          }
        }

        // 4. Custo real por snapshot — agregar provider_call_logs via analysis_events,
        //    aplicando regra actual>0 ? actual : estimated (resolveCallCost).
        const snapshotIds = [
          ...new Set(
            (requests ?? [])
              .map((r) => r.analysis_snapshot_id)
              .filter(Boolean)
          ),
        ] as string[];

        const costBySnapshot = new Map<string, number>();
        if (snapshotIds.length > 0) {
          const { data: events } = await supabaseAdmin
            .from("analysis_events")
            .select("id, analysis_snapshot_id")
            .in("analysis_snapshot_id", snapshotIds);

          const eventToSnapshot = new Map<string, string>();
          for (const ev of events ?? []) {
            if (ev.analysis_snapshot_id) {
              eventToSnapshot.set(ev.id, ev.analysis_snapshot_id);
            }
          }

          const eventIds = [...eventToSnapshot.keys()];
          if (eventIds.length > 0) {
            const { data: calls } = await supabaseAdmin
              .from("provider_call_logs")
              .select("analysis_event_id, actual_cost_usd, estimated_cost_usd")
              .in("analysis_event_id", eventIds);

            for (const c of calls ?? []) {
              const snapId = eventToSnapshot.get(c.analysis_event_id ?? "");
              if (!snapId) continue;
              const cost = resolveCallCost(c);
              costBySnapshot.set(snapId, (costBySnapshot.get(snapId) ?? 0) + cost);
            }
          }
        }

        // 5. Last product_event per lead
        let lastEventByLead = new Map<string, string>();
        if (leadIds.length > 0) {
          const { data: lastEvents } = await supabaseAdmin
            .from("product_events")
            .select("lead_id, created_at")
            .in("lead_id", leadIds)
            .order("created_at", { ascending: false });

          if (lastEvents) {
            for (const ev of lastEvents) {
              if (ev.lead_id && !lastEventByLead.has(ev.lead_id)) {
                lastEventByLead.set(ev.lead_id, ev.created_at);
              }
            }
          }
        }

        // 5b. Beta feedback per lead (via report_request_id)
        const reqIds = (requests ?? []).map((r) => r.id);
        const feedbackByLead = new Map<string, {
          id: string;
          usefulness_score: number;
          clarity_text: string | null;
          missing_text: string | null;
          purchase_intent: "sim" | "talvez" | "nao";
          pricing_preference: string | null;
          contact_consent: boolean;
          created_at: string;
        }>();
        if (reqIds.length > 0) {
          const { data: feedbackRows } = await supabaseAdmin
            .from("beta_feedback")
            .select(
              "id, lead_id, report_request_id, usefulness_score, clarity_text, missing_text, purchase_intent, pricing_preference, contact_consent, created_at"
            )
            .in("report_request_id", reqIds)
            .order("created_at", { ascending: false });

          if (feedbackRows) {
            for (const f of feedbackRows) {
              if (f.lead_id && !feedbackByLead.has(f.lead_id)) {
                feedbackByLead.set(f.lead_id, {
                  id: f.id,
                  usefulness_score: f.usefulness_score,
                  clarity_text: f.clarity_text,
                  missing_text: f.missing_text,
                  purchase_intent: f.purchase_intent as "sim" | "talvez" | "nao",
                  pricing_preference: f.pricing_preference,
                  contact_consent: !!f.contact_consent,
                  created_at: f.created_at,
                });
              }
            }
          }
        }

        // 5d. Créditos por lead — agregação do `credit_ledger`.
        const creditsByLead = new Map<
          string,
          { granted: number; used: number; remaining: number }
        >();
        {
          const { data: ledger } = await supabaseAdmin
            .from("credit_ledger")
            .select("lead_id, delta")
            .in("lead_id", leadIds);

          if (ledger) {
            for (const row of ledger) {
              const lid = row.lead_id as string;
              const delta = Number(row.delta ?? 0);
              const agg = creditsByLead.get(lid) ?? {
                granted: 0,
                used: 0,
                remaining: 0,
              };
              if (delta > 0) agg.granted += delta;
              else if (delta < 0) agg.used += -delta;
              agg.remaining += delta;
              creditsByLead.set(lid, agg);
            }
          }
        }

        // 5c. Lead-magnet sequence status per lead, agregado a partir de
        //     `product_events` (sem schema novo).
        const LM_EVENT_TYPES = [
          "beta_welcome_email_sent",
          "report_summary_email_sent",
          "lead_magnet_sequence_skipped",
          "report_summary_skipped_no_data",
          "beta_welcome_email_failed",
          "report_summary_email_failed",
        ] as const;
        type LmRow = {
          lead_id: string;
          event_type: string;
          created_at: string;
        };
        const lmByLead = new Map<
          string,
          {
            status: "active" | "completed" | "skipped" | "none";
            last_event_at: string | null;
            last_event_type: string | null;
            sent_count: number;
          }
        >();
        if (leadIds.length > 0) {
          const { data: lmEvents } = await supabaseAdmin
            .from("product_events")
            .select("lead_id, event_type, created_at")
            .in("lead_id", leadIds)
            .in("event_type", LM_EVENT_TYPES as unknown as string[])
            .order("created_at", { ascending: false });

          if (lmEvents) {
            const grouped = new Map<string, LmRow[]>();
            for (const ev of lmEvents as LmRow[]) {
              if (!ev.lead_id) continue;
              const arr = grouped.get(ev.lead_id) ?? [];
              arr.push(ev);
              grouped.set(ev.lead_id, arr);
            }
            for (const [leadId, rows] of grouped) {
              const types = new Set(rows.map((r) => r.event_type));
              const sent_count = rows.filter(
                (r) =>
                  r.event_type === "beta_welcome_email_sent" ||
                  r.event_type === "report_summary_email_sent",
              ).length;
              const last = rows[0];
              let status: "active" | "completed" | "skipped" | "none" = "none";
              if (types.has("report_summary_email_sent")) status = "completed";
              else if (types.has("beta_welcome_email_sent")) status = "active";
              else if (
                types.has("lead_magnet_sequence_skipped") ||
                types.has("report_summary_skipped_no_data")
              )
                status = "skipped";
              lmByLead.set(leadId, {
                status,
                last_event_at: last?.created_at ?? null,
                last_event_type: last?.event_type ?? null,
                sent_count,
              });
            }
          }
        }

        // 6. Assemble enriched leads
        const enriched = leads.map((lead) => {
          const req = requestByLead.get(lead.id);
          const handle = req?.instagram_username?.toLowerCase() ?? null;
          const snapshotId = req?.analysis_snapshot_id ?? null;
          const lastEvent = lastEventByLead.get(lead.id);
          const lm = lmByLead.get(lead.id) ?? {
            status: "none" as const,
            last_event_at: null,
            last_event_type: null,
            sent_count: 0,
          };
          const isLmSubscriber =
            lm.status === "active" ||
            lm.status === "completed" ||
            !!lead.marketing_consent;
          const paymentSummary =
            paymentByLead.get(lead.id) ?? {
              has_pending: false,
              paid_products: [] as PaymentProduct[],
              last_payment_at: null,
              pending_checkout_started_at: null,
              total_paid_cents: 0,
            };
          const credits = creditsByLead.get(lead.id) ?? {
            granted: 0,
            used: 0,
            remaining: 0,
          };

          return {
            id: lead.id,
            email: lead.email,
            name: lead.name,
            handle,
            phone: (lead.phone as string | null) ?? null,
            user_type: lead.user_type,
            purpose: lead.purpose,
            company: lead.company,
            profile_ownership: lead.profile_ownership,
            source: lead.source,
            beta_consent: lead.beta_consent,
            beta_consent_at: lead.beta_consent_at,
            commercial_status: lead.commercial_status ?? "novo_pedido",
            internal_notes: lead.internal_notes,
            contacted_at: lead.contacted_at,
            archived_at: lead.archived_at,
            report_status: req?.request_status ?? null,
            pdf_status: req?.pdf_status ?? null,
            report_cost_usd: snapshotId
              ? (costBySnapshot.get(snapshotId) ?? null)
              : null,
            report_views: handle ? (viewsByHandle.get(handle) ?? 0) : 0,
            last_interaction: lastEvent ?? lead.updated_at,
            created_at: lead.created_at,
            report_request_id: req?.id ?? null,
            feedback: feedbackByLead.get(lead.id) ?? null,
            lead_magnet: lm,
            marketing_consent: !!lead.marketing_consent,
            is_lead_magnet_subscriber: isLmSubscriber,
            payment_summary: paymentSummary,
            credits_granted: credits.granted,
            credits_used: credits.used,
            credits_remaining: credits.remaining,
          };
        });

        return jsonResponse({ success: true, leads: enriched });
      },
    },
  },
});