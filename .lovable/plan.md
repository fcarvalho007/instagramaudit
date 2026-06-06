## Goal

For free/public users, every locked action in the report sidebar (main CTA, locked premium sections, locked period chips 30d/90d, locked "Adicionar concorrente") opens the existing `PremiumInterestDialog` via the existing `PremiumCtaProvider` / `usePremiumCta` flow, with contextual copy that reflects what was clicked. No payment, pricing, checkout, credit, entitlement, scraping, or report-generation logic is touched.

## Current state (free user)

- Main CTA `UnlockPromoCard` → `handlePremiumAccessClick("sidebar")` — opens modal ✅ but source is generic.
- Locked period chips 30d/90d → `handlePremiumAccessClick("sidebar_period", { selected_window })` — opens modal ✅.
- Locked "Add competitor" → `handlePremiumAccessClick("sidebar_add_competitor")` — opens modal ✅.
- Mobile compact period button → `handlePremiumAccessClick("sidebar_period")` — opens modal ✅.
- **Locked premium section rows (`LockedItemRow`)** → call `onAccessibleClick(item.block.id)` → `scrollToBlock(id)`. **Bug: silently scrolls instead of opening the modal.** ❌
- Modal copy is identical for every source — no contextual sentence.

The `PremiumCtaSource` union already includes `sidebar_section`, `sidebar_period`, `sidebar_add_competitor`. A new `sidebar_main_cta` value is required to satisfy the requested taxonomy.

## Changes

### 1. `src/components/report-redesign/v2/premium-cta-context.tsx`

- Extend the `PremiumCtaSource` union with `"sidebar_main_cta"`. Keep `"sidebar"` as a deprecated alias (still typed) for backwards compatibility with any legacy callers — no removal, no behaviour change elsewhere.

### 2. `src/components/report-redesign/v2/report-block-nav.tsx`

- `UnlockPromoCard` `openDialog` handler: change source from `"sidebar"` to `"sidebar_main_cta"`.
- In `SidebarList`, when rendering the free-state `premium` list, replace the current `onAccessibleClick(item.block.id)` callback on `LockedItemRow` with a handler that calls `handlePremiumAccessClick("sidebar_section", { block_id: item.block.id })`. This stops the silent scroll and opens the modal. Premium "accessible" state (`premiumUnlocked`) remains unaffected — paid users still use `onAccessibleClick`.
- Mobile `ReportBlockTopTabs` shows only accessible items in the bottom rail; the locked premium list lives inside the same `SidebarList` rendered in the sheet, so the fix above also covers mobile.
- No changes to period chip logic, "Add competitor", credit balance display, `ConsumeCreditDialog`, `focusLeadMagnet`, lab variant, or scroll-spy.

### 3. `src/components/report-redesign/v2/premium-interest-dialog.tsx`

- Accept the existing `sourceComponent` prop and pick a contextual subtitle from i18n based on it:
  - `sidebar_section` → "Esta secção faz parte do relatório completo."
  - `sidebar_period` → "Para analisar períodos maiores, desbloqueia o relatório completo."
  - `sidebar_add_competitor` → "A comparação com concorrentes faz parte do relatório completo."
  - `sidebar_main_cta` and everything else → keep the current default `premium.dialog.subtitle`.
- Render the contextual sentence as a small eyebrow-style line above (or replacing) the default subtitle so the rest of the dialog (cards, prices, hero, coupon, footer) is untouched. The post-purchase beta-credits bonus is NOT mentioned anywhere in this dialog.
- Keep the 9€ card CTA copy and behaviour exactly as today (it already navigates to `/checkout/report-full` with `source: sourceComponent`). The "Desbloquear por 9€" label requirement is already satisfied implicitly by the dynamic price from `PUBLIC_PRODUCTS.report_full_9.priceLabel` shown on the card; we only need to confirm the existing `premium.dialog.single.cta` string reads "Desbloquear por 9€" and adjust the i18n string if it does not. No hardcoded price is added.

### 4. `src/i18n/locales/{pt,en}/report.json`

- Under `premium.dialog`, add a `contextual` map:
  ```
  contextual: {
    sidebar_section, sidebar_period, sidebar_add_competitor
  }
  ```
- Update `premium.dialog.single.cta` to "Desbloquear por {{price}}" (PT) / "Unlock for {{price}}" (EN), interpolating the dynamic `PUBLIC_PRODUCTS.report_full_9.priceLabel`. Keeps a single source of truth for the price.

## Tracking

- `premium_cta_clicked` events keep their existing payload; `source_component` will now correctly reflect `sidebar_main_cta` / `sidebar_section` for newly wired clicks. No event is removed.
- Downstream `pricing_option_clicked` and `payment_cta_clicked` inside the dialog continue to forward `sourceComponent` — no change.

## What is explicitly NOT changed

- Product prices, `PUBLIC_PRODUCTS`, checkout routes, EuPago webhook, entitlements, credits ledger, `ConsumeCreditDialog`, `grantPostPurchaseBetaCredits`, scraping, `analyze-public-v1`, report generation, metric calculations, RLS, DB schema.
- Paid-user behaviour in the sidebar: period chips and Add competitor keep opening `ConsumeCreditDialog`, accessible section rows keep scrolling.

## Manual validation checklist

1. Free public report: click "Desbloquear relatório completo" (sidebar main CTA) → `PremiumInterestDialog` opens with default subtitle; `premium_cta_clicked` event fires with `source_component: "sidebar_main_cta"`.
2. Free user: click any locked premium section row in the sidebar (desktop and mobile sheet) → modal opens with contextual line "Esta secção faz parte do relatório completo."; no scroll happens; `source_component: "sidebar_section"` and `block_id` are tracked.
3. Free user: click 30d or 90d chip (desktop expanded and mobile compact) → modal opens with "Para analisar períodos maiores…"; `selected_window` continues to be tracked.
4. Free user: click locked "Adicionar concorrente" (desktop and mobile compact) → modal opens with "A comparação com concorrentes…".
5. In all four cases no network call to `analyze-public-v1` is made, no credit is reserved, and clicking the 9€ card still navigates to `/checkout/report-full?source=<contextual>`.
6. Paid user: section rows still scroll, period chips and Add competitor still open `ConsumeCreditDialog`, beta-credit balance line is unchanged.
7. The dialog never shows any reference to "créditos beta" / post-purchase bonus.
