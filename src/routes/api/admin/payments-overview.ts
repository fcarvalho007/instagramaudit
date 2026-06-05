/**
 * GET /api/admin/payments-overview
 *
 * Admin-only payments visibility. Aggregates over `lead_payments` filtered
 * to the two active products (`report_full_9`, `authority_diagnosis_97`),
 * plus entitlement counts and upsell performance derived from
 * `lead_payments.metadata`.
 *
 * Read-only; no provider calls. Excludes legacy product codes by design.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

const ACTIVE_PRODUCTS = ["report_full_9", "authority_diagnosis_97"] as const;

export interface PaymentRow {
  id: string;
  created_at: string;
  lead_id: string;
  lead_email: string | null;
  product: string;
  amount_cents: number;
  currency: string;
  status: string;
  source_component: string | null;
  report_priority: string | null;
  upsell_accepted: boolean | null;
  upsell_presented: boolean | null;
  source_product: string | null;
  final_product: string | null;
  provider_checkout_url: string | null;
  failure_reason: string | null;
}

export interface PaymentsOverview {
  by_product_status: Array<{
    product: string;
    status: string;
    count: number;
    amount_eur: number;
  }>;
  totals: {
    checkouts_started: number;
    pending: number;
    paid: number;
    failed: number;
    paid_amount_eur: number;
  };
  pending_stale: PaymentRow[];
  recent_failed: PaymentRow[];
  recent_paid: PaymentRow[];
  recent_all: PaymentRow[];
  upsell: {
    report_full_9_checkouts: number;
    upsell_presented: number;
    upsell_accepted: number;
    upsell_declined: number;
    conversion_pct: number | null;
  };
  entitlements_by_product: Record<string, number>;
}

type RawRow = {
  id: string;
  created_at: string;
  lead_id: string;
  product: string;
  amount_cents: number;
  currency: string;
  status: string;
  provider_checkout_url: string | null;
  metadata: Record<string, unknown> | null;
};

function asBoolOrNull(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function toRow(r: RawRow, emails: Map<string, string>): PaymentRow {
  const meta = (r.metadata ?? {}) as Record<string, unknown>;
  const upsellPresented = asBoolOrNull(meta.upsell_presented);
  const upsellAccepted = asBoolOrNull(meta.upsell_accepted);
  const failure =
    asStringOrNull(meta.failure_reason) ??
    asStringOrNull(meta.error) ??
    asStringOrNull(meta.error_message);
  return {
    id: r.id,
    created_at: r.created_at,
    lead_id: r.lead_id,
    lead_email: emails.get(r.lead_id) ?? null,
    product: r.product,
    amount_cents: Number(r.amount_cents ?? 0),
    currency: r.currency ?? "EUR",
    status: r.status,
    source_component: asStringOrNull(meta.source_component),
    report_priority: asStringOrNull(meta.report_priority),
    upsell_presented: upsellPresented,
    upsell_accepted: upsellAccepted,
    source_product: asStringOrNull(meta.source_product),
    final_product: asStringOrNull(meta.final_product),
    provider_checkout_url: r.provider_checkout_url,
    failure_reason: failure,
  };
}

export const Route = createFileRoute("/api/admin/payments-overview")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const products = [...ACTIVE_PRODUCTS];

        const [allRes, recentRes, entRes] = await Promise.all([
          // Full aggregation set (active products only). Volume is low; safe.
          supabaseAdmin
            .from("lead_payments")
            .select(
              "id, created_at, lead_id, product, amount_cents, currency, status, provider_checkout_url, metadata",
            )
            .in("product", products)
            .order("created_at", { ascending: false })
            .limit(2000),
          // Recent 20 for the main table (already covered by the 2000 above
          // but keep cheap and explicit for safety).
          supabaseAdmin
            .from("lead_payments")
            .select(
              "id, created_at, lead_id, product, amount_cents, currency, status, provider_checkout_url, metadata",
            )
            .in("product", products)
            .order("created_at", { ascending: false })
            .limit(20),
          supabaseAdmin
            .from("lead_entitlements")
            .select("product_code")
            .in("product_code", products),
        ]);

        const all = (allRes.data ?? []) as RawRow[];
        const recent = (recentRes.data ?? []) as RawRow[];
        const ents = (entRes.data ?? []) as Array<{ product_code: string }>;

        // Lead email map for any row we surface.
        const leadIds = new Set<string>();
        for (const r of all) if (r.lead_id) leadIds.add(r.lead_id);
        for (const r of recent) if (r.lead_id) leadIds.add(r.lead_id);

        const emails = new Map<string, string>();
        if (leadIds.size > 0) {
          const { data: leadRows } = await supabaseAdmin
            .from("leads")
            .select("id, email")
            .in("id", Array.from(leadIds));
          for (const l of leadRows ?? []) {
            if (l.email) emails.set(l.id, l.email);
          }
        }

        // by_product_status + totals
        const byKey = new Map<string, { product: string; status: string; count: number; amount_eur: number }>();
        const totals = { checkouts_started: 0, pending: 0, paid: 0, failed: 0, paid_amount_eur: 0 };
        for (const r of all) {
          totals.checkouts_started += 1;
          if (r.status === "pending") totals.pending += 1;
          else if (r.status === "paid") {
            totals.paid += 1;
            totals.paid_amount_eur += Number(r.amount_cents ?? 0) / 100;
          } else if (r.status === "failed") totals.failed += 1;
          const key = `${r.product}::${r.status}`;
          const cur = byKey.get(key) ?? {
            product: r.product,
            status: r.status,
            count: 0,
            amount_eur: 0,
          };
          cur.count += 1;
          cur.amount_eur += Number(r.amount_cents ?? 0) / 100;
          byKey.set(key, cur);
        }

        // Upsell — over rows whose checkout started on report_full_9
        let presented = 0;
        let accepted = 0;
        let r9Checkouts = 0;
        for (const r of all) {
          const meta = (r.metadata ?? {}) as Record<string, unknown>;
          const source = asStringOrNull(meta.source_product) ?? r.product;
          if (source !== "report_full_9") continue;
          r9Checkouts += 1;
          if (asBoolOrNull(meta.upsell_presented) === true) presented += 1;
          if (asBoolOrNull(meta.upsell_accepted) === true) accepted += 1;
        }
        const declined = Math.max(0, presented - accepted);
        const conversion_pct = presented > 0 ? (accepted / presented) * 100 : null;

        // Pending stale (>1h)
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const pendingStaleRaw = all.filter(
          (r) =>
            r.status === "pending" &&
            new Date(r.created_at).getTime() < oneHourAgo,
        );

        // Recent buckets
        const recentAll = recent.map((r) => toRow(r, emails));
        const recentPaid = all
          .filter((r) => r.status === "paid")
          .slice(0, 20)
          .map((r) => toRow(r, emails));
        const recentFailed = all
          .filter((r) => r.status === "failed")
          .slice(0, 20)
          .map((r) => toRow(r, emails));
        const pendingStale = pendingStaleRaw.slice(0, 50).map((r) => toRow(r, emails));

        // Entitlements grouped in JS
        const entCounts: Record<string, number> = {};
        for (const e of ents) {
          entCounts[e.product_code] = (entCounts[e.product_code] ?? 0) + 1;
        }

        const body: PaymentsOverview = {
          by_product_status: Array.from(byKey.values()).sort((a, b) =>
            a.product === b.product
              ? a.status.localeCompare(b.status)
              : a.product.localeCompare(b.product),
          ),
          totals,
          pending_stale: pendingStale,
          recent_failed: recentFailed,
          recent_paid: recentPaid,
          recent_all: recentAll,
          upsell: {
            report_full_9_checkouts: r9Checkouts,
            upsell_presented: presented,
            upsell_accepted: accepted,
            upsell_declined: declined,
            conversion_pct,
          },
          entitlements_by_product: entCounts,
        };

        return Response.json(body, {
          headers: { "cache-control": "private, max-age=15" },
        });
      },
    },
  },
});