# Payments visibility block for /admin/receita

Add a single new "Pagamentos" section to the existing admin Receita page, backed by a new admin-gated endpoint. No checkout/webhook/pricing changes.

## 1. New endpoint — `src/routes/api/admin/payments-overview.ts`

Admin-gated (`requireAdminSession`), follows the same pattern as `pre-revenue-signals.ts`. Single GET that returns:

```ts
export interface PaymentsOverview {
  by_product_status: Array<{
    product: "report_full_9" | "authority_diagnosis_97" | string;
    status: "pending" | "paid" | "failed" | "expired" | string;
    count: number;
    amount_eur: number; // sum of amount_cents/100 (intent value, not just paid)
  }>;
  totals: {
    checkouts_started: number;       // all rows
    pending: number;
    paid: number;
    failed: number;
    paid_amount_eur: number;         // sum where status=paid
  };
  pending_stale: Array<{             // pending older than 1h
    id: string; created_at: string; product: string;
    amount_cents: number; lead_email: string | null;
    provider_checkout_url: string | null;
  }>;
  recent_failed: PaymentRow[];       // limit 20
  recent_paid: PaymentRow[];         // limit 20
  recent_all: PaymentRow[];          // limit 20 — table source
  upsell: {
    report_full_9_checkouts: number;      // payments where source_product = report_full_9
    upsell_presented: number;
    upsell_accepted: number;              // metadata.upsell_accepted = true
    upsell_declined: number;              // presented & not accepted
    conversion_pct: number | null;        // accepted / presented * 100
  };
  entitlements_by_product: Record<string, number>;
}

interface PaymentRow {
  id: string;
  created_at: string;
  lead_id: string;
  lead_email: string | null;
  product: string;
  amount_cents: number;
  currency: string;
  status: string;
  source_component: string | null;       // metadata.source_component
  report_priority: string | null;        // metadata.report_priority
  upsell_accepted: boolean | null;       // metadata.upsell_accepted
  provider_checkout_url: string | null;
  failure_reason: string | null;         // metadata.failure_reason ?? metadata.error
}
```

Implementation notes:
- Use `supabaseAdmin` (server-only client). Restrict to the two active products via `.in("product", ["report_full_9","authority_diagnosis_97"])` so legacy `report_single` / `pack_5` rows are excluded.
- For the rolled-up by_product_status, fetch `product, status, amount_cents` for active products and reduce in JS (no SQL grouping needed; volume is low).
- Lead email: one `leads` select keyed by the union of `lead_id`s from all returned rows, build a `Map<lead_id, email>`.
- Upsell metrics: count over the same fetched superset where `metadata->>'source_product' = 'report_full_9'` (or product=`report_full_9` as fallback for older rows), `metadata->>'upsell_presented' = 'true'`, `metadata->>'upsell_accepted'`.
- Entitlement counts: `lead_entitlements` grouped by `product_code` in JS, filtered to active products.
- `cache-control: private, max-age=15`.

## 2. New UI section — `src/components/admin/v2/receita/payments-section.tsx`

Same shape as `PreRevenueSignalsSection` (uses `AdminSectionHeader`, `AdminCard`, `KPICard`, `SectionSkeleton/Error`, `adminFetch`, `useQuery` with 60s refetch).

KPI cards row:
- **Checkouts iniciados** — totals.checkouts_started
- **Pendentes** — totals.pending  (sub: "X com mais de 1h" if `pending_stale.length>0`)
- **Pagos** — totals.paid
- **Falhados** — totals.failed
- **Receita paga** — totals.paid_amount_eur formatted EUR
- **Upsell 9€ → 97€** — `upsell.upsell_accepted / upsell.upsell_presented` with `conversion_pct` as sub

Secondary grid: small "Por produto" table showing rows of (product label, status, count, EUR amount) — uses `PRODUCT_LABELS`.

Main table — "Últimos 20 pagamentos" from `recent_all`:
| created_at | lead email | produto | valor | status | source | prioridade | upsell | checkout | falha |

- Date: `pt-PT` short.
- Produto: `PRODUCT_LABELS[row.product] ?? row.product`.
- Valor: EUR from `amount_cents/100`.
- Status: existing `StatusBadge` style (or inline pill — pending=amber, paid=success, failed=error).
- Upsell: ✓ / — / (presented but declined: ·).
- Checkout: external-link icon → `provider_checkout_url` (target=_blank, rel=noreferrer), only when present.
- Falha: `failure_reason` truncated with `title`.

## 3. Labels

Add to the new section file (module-level const, not exported globally):
```ts
const PRODUCT_LABELS: Record<string, string> = {
  report_full_9: "Relatório completo 9€",
  authority_diagnosis_97: "Diagnóstico 97€",
};
```
Legacy `report_single` / `pack_5` are filtered out in the endpoint, so they never reach the UI.

## 4. Wire into the page

`src/routes/admin.receita.tsx` — add `<PaymentsSection />` to the column, placed **between** `<PreRevenueSignalsSection />` and `<FutureRecurringRevenueCard />`. No other changes to the page.

## 5. Validation

- `bunx tsc --noEmit`
- Hit the endpoint via `stack_modern--invoke-server-function GET /api/admin/payments-overview` while logged in as admin (preview) and show the JSON in the output.
- Visual: load `/admin/receita`, screenshot the new block.

## Files touched

- `src/routes/api/admin/payments-overview.ts` (new)
- `src/components/admin/v2/receita/payments-section.tsx` (new)
- `src/routes/admin.receita.tsx` (1 import + 1 JSX line)

## Out of scope (explicit)

No edits to checkout routes, EuPago server/functions, webhook, pricing tables, report generation, onboarding, credits, or any provider integrations. Read-only against `lead_payments`, `lead_entitlements`, `leads`.
