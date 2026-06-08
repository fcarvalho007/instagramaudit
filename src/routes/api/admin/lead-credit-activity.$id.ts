/**
 * GET /api/admin/lead-credit-activity/$id — saldo + ledger + análises do lead.
 *
 * Sem schema change: usa `credit_ledger.cache_key` para inferir window.
 * Cruza com `analysis_events` pelos handles distintos do ledger.
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

export const Route = createFileRoute("/api/admin/lead-credit-activity/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const leadId = params.id;

        // Saldo via RPC.
        const { data: balanceRaw, error: balErr } = await supabaseAdmin.rpc(
          "credit_balance",
          { p_lead_id: leadId },
        );
        if (balErr) {
          console.error("[lead-credit-activity] balance failed", balErr);
        }
        const balance =
          typeof balanceRaw === "number" ? balanceRaw : Number(balanceRaw ?? 0);

        // Ledger.
        const { data: ledger, error: ledgerErr } = await supabaseAdmin
          .from("credit_ledger")
          .select(
            "id, delta, reason, handle, cache_key, analysis_snapshot_id, reservation_id, metadata, created_at",
          )
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (ledgerErr) {
          console.error("[lead-credit-activity] ledger failed", ledgerErr);
          return jsonResponse(
            { success: false, error: ledgerErr.message },
            500,
          );
        }

        // Agregados (granted/spent).
        let granted = 0;
        let confirmed = 0;
        let reserved = 0;
        let released = 0;
        for (const row of ledger ?? []) {
          const d = row.delta ?? 0;
          if (row.reason === "initial_grant" && d > 0) granted += d;
          if (row.reason === "reserve") reserved += -d; // delta negativo
          if (row.reason === "confirm") confirmed += 1;
          if (row.reason === "release") released += d; // delta positivo
        }

        // Handles distintos para cruzar com analysis_events.
        const handles = Array.from(
          new Set(
            (ledger ?? [])
              .map((l) => l.handle?.toLowerCase())
              .filter((h): h is string => !!h),
          ),
        );

        let events: Array<{
          id: string;
          handle: string;
          analysis_window: string | null;
          cache_key: string | null;
          data_source: string | null;
          outcome: string | null;
          analysis_snapshot_id: string | null;
          estimated_cost_usd: number | null;
          competitor_handles: string[];
          created_at: string;
        }> = [];

        if (handles.length > 0) {
          const { data: evRaw, error: evErr } = await supabaseAdmin
            .from("analysis_events")
            .select(
              "id, handle, analysis_window, cache_key, data_source, outcome, analysis_snapshot_id, estimated_cost_usd, competitor_handles, created_at",
            )
            .in("handle", handles)
            .order("created_at", { ascending: false })
            .limit(50);
          if (evErr) {
            console.error("[lead-credit-activity] events failed", evErr);
          } else {
            events = (evRaw ?? []).map((e) => ({
              id: e.id,
              handle: e.handle,
              analysis_window: e.analysis_window,
              cache_key: e.cache_key,
              data_source: e.data_source,
              outcome: e.outcome,
              analysis_snapshot_id: e.analysis_snapshot_id,
              estimated_cost_usd:
                typeof e.estimated_cost_usd === "number"
                  ? e.estimated_cost_usd
                  : null,
              competitor_handles: Array.isArray(e.competitor_handles)
                ? (e.competitor_handles as unknown[]).filter(
                    (x): x is string => typeof x === "string",
                  )
                : [],
              created_at: e.created_at,
            }));
          }
        }

        return jsonResponse({
          success: true,
          balance,
          summary: { granted, confirmed, reserved, released },
          ledger: ledger ?? [],
          events,
        });
      },
    },
  },
});