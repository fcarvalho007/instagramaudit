## Scope

Refine only `/checkout/report-full` and its components. EuPago provider, webhook, pricing, products, lead-session resolution, report generation, onboarding, providers, and admin remain untouched. The 97€ flow at `/checkout/authority-diagnosis` is not modified.

## Files changed

1. `src/routes/checkout.report-full.tsx` — rebuild composition, add qualification step, wire `report_priority` into payment metadata.
2. `src/components/checkout/checkout-shell.tsx` — switch to a wider 2-column shell (`max-w-5xl`) so report-full can render a sticky summary on the right; authority-diagnosis still fits within its own inner `max-w-2xl` wrapper, so no visual regression there.
3. `src/components/checkout/confirm-unlock-card.tsx` — tighten visuals (eyebrow, price hierarchy, trust line "Pagamento seguro. Acesso associado à tua conta.").
4. `src/components/checkout/order-summary.tsx` — add a `sticky` desktop variant via prop (`sticky?: boolean`) showing "Relatório completo · 9€ · Pagamento único · Sem subscrição · Total 9€"; default behavior unchanged for the 97€ route.
5. `src/components/checkout/report-priority-form.tsx` — **new** lightweight single-question component (5 chip-style radio options).
6. `src/lib/payments/eupago.functions.ts` — extend `inputSchema` with optional `report_priority` enum, persist into `metadata.report_priority`. No pricing/provider/webhook logic touched.

## UX changes

- **Layout**: shell becomes a centered `max-w-5xl` grid. Desktop: 2 columns (`lg:grid-cols-[1fr_320px]`) with sticky `OrderSummary` on the right from step 1 onward. Mobile: single column, summary collapses to a compact card above the CTA on step 3 only.
- **Compact header** (already minimal): keep AuditProfiles wordmark + "Pagamento seguro" lock chip, no nav/footer changes beyond width.
- **Step progress**: same component, but shown above the left column only.
- **Step 1 — Confirmar desbloqueio**: H1 "Obter relatório completo" (Fraunces, `text-2xl sm:text-3xl`, never bigger). Subtitle as specced. Refined `ConfirmUnlockCard` (price right-aligned, eyebrow "Relatório completo", 6 bullets in 2-col grid, trust microcopy line at the bottom).
- **Step 2 — Prioridade**: new screen with question "O que queres perceber primeiro no relatório completo?" and 5 chip options (Conteúdo, Frequência, Formatos, Comparação, Recomendações). Selection required to advance; stored in component state as `reportPriority`. Tracked via `checkout_step_complete` with `{ report_priority }`.
- **Step 3 — Dados de facturação**: billing fields rendered inside a card titled "Dados de facturação". Desktop widths capped (form column `max-w-xl`); NIF stays optional (current legal/payment posture allows it). Email for invoice clearly labeled.
- **Confirm/pay**: bottom CTA "Confirmar e pagar" (full width on mobile, right-aligned on desktop) with the order summary already visible in the sticky column; on mobile, an inline mini-summary appears above the CTA.
- **Errors**: keep current `safeCheckoutPrepareError` flow — display friendly `submitError` inline, no SQL/FK strings leak, user stays on the same step, retry enabled.

```text
Desktop (≥lg)                            Mobile
┌──────────── max-w-5xl ────────────┐    ┌────────────┐
│ Steps progress                    │    │ Steps      │
│ ┌──────────┐  ┌──────────────┐    │    │ Step body  │
│ │ Step body│  │ Sticky order │    │    │ Summary    │
│ │          │  │ summary (9€) │    │    │ CTA        │
│ └──────────┘  └──────────────┘    │    └────────────┘
└───────────────────────────────────┘
```

## Steps count

Three steps as specced: `Confirmar desbloqueio` → `Prioridade` → `Faturação e pagamento` (billing card + summary + CTA combined to keep the flow faster than the 97€ checkout, which has more steps). `STEP_LABELS` updated accordingly.

## Qualification field

Add `report_priority` of type `"content" | "frequency" | "formats" | "comparison" | "recommendations"` to:
- the route component state,
- the `createEupagoCheckout` input schema (optional enum),
- the metadata persisted in `lead_payments.metadata.report_priority`.

The existing `qualification` shape for the 97€ flow is left untouched.

## Tracking events

Reuse existing events: `checkout_started`, `checkout_step_view`, `checkout_step_complete` (with `{ report_priority }` on step 2), `checkout_payment_started`, `checkout_payment_failed`. Server already emits `payment_checkout_created`.

## Validation

- `bunx tsc --noEmit`
- Manual viewport check at 360/390/768/1440: no horizontal overflow, sticky summary collapses below `lg`, CTA always reachable, no oversized headings.
- Confirm 97€ checkout still renders unchanged (same `CheckoutShell`).

## Risks

- Wider shell could subtly shift the 97€ route layout; mitigation: it already wraps its own content in `max-w-2xl`, so visually it remains identical.
- Adding `report_priority` to the server schema is metadata-only (no pricing or webhook change).
