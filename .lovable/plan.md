## Goal
Replace the old price-card "cofre" area in the public report sidebar with a clean access summary that matches the simplified pricing model (€7 single / €28 pack, no subscription). Remove all €3/€13 pricing and "Abrir o cofre" wording from the sidebar.

## Scope (touched files)
- `src/components/report-redesign/v2/report-block-nav.tsx` — sidebar component
- `src/i18n/locales/pt/report.json` — PT strings under `nav`
- `src/i18n/locales/en/report.json` — EN strings under `nav`

Not touched: block-config, premium-interest-dialog, report-shell-v2, pricing logic, providers, snapshots, unlock flow, `/precos`.

## Changes

### 1. `report-block-nav.tsx`
- **Delete** `CofreCard` component entirely (lines ~275–412) and the `COFRE_ANCHOR_ID` / `scrollToCofre` helper.
- **Add** new `AccessSummaryCard` component rendered in the same slot inside `SidebarList`. It contains:
  - Short note (only shown when `variant === "public_mvp"` and Block 2 is in the list): `t("nav.access.beta_note")`.
  - Single CTA button `t("nav.access.cta")` that opens `PremiumInterestDialog` (reuses existing `useReportTracking` + `trackEvent({ eventType: "unlock_clicked", source_component: "sidebar_access" })`).
  - Trust microcopy below CTA: `t("nav.access.trust")`.
  - Clean, low-visual-weight styling using existing tokens (white surface, `border-border-default`, no gold gradient, no price cards, no star badge).
- **Remove** the locked-row scroll-to-cofre behavior: rename `onLockedClick` to open the same dialog. Simplest path — lift dialog state into `SidebarList` (or pass a single `onLockedClick={openDialog}` from the parent components). To keep the diff small, keep `AccessSummaryCard` owning the dialog and expose its `openDialog` via a ref-less pattern: move dialog state up into `SidebarList` and pass `openDialog` to both `AccessSummaryCard` and the locked `ItemRow` via `onLockedClick`. Desktop + mobile-drawer parents simply call the same opener.
- **Add per-item access badges in `ItemRow`** (replaces partial "3/5" and active dot semantics for the access label slot):
  - `overview` → `t("nav.access.badge_free")` (emerald)
  - `diagnostico` → `t("nav.access.badge_launch")` (amber)
  - all others → `t("nav.access.badge_premium")` (gold)
  - Determined via a new `accessBadge` field set inside `buildSidebarItems` based on `block.id`. Existing "partial 3/5" badge dropped from the public sidebar (no longer needed, since access is now communicated by the per-block badge).

### 2. i18n — `nav.access` namespace (PT/EN), replace the old `nav.cofre` block

PT:
```
"access": {
  "badge_free": "Grátis",
  "badge_launch": "Oferta de lançamento",
  "badge_premium": "Premium",
  "beta_note": "O Diagnóstico editorial faz parte da experiência premium, mas está aberto nesta fase beta.",
  "cta": "Ver opções de acesso",
  "trust": "1 relatório ou pack de 5. Sem subscrição."
}
```

EN:
```
"access": {
  "badge_free": "Free",
  "badge_launch": "Launch offer",
  "badge_premium": "Premium",
  "beta_note": "Editorial diagnosis is part of the premium experience, but it is open during this beta phase.",
  "cta": "View access options",
  "trust": "1 report or pack of 5. No subscription."
}
```

The `nav.cofre.*` keys are removed (no other consumer — grep confirms only `report-block-nav.tsx` reads them).

## Layout / mobile
- Card stays inside `SidebarList`, so it renders on desktop (sticky sidebar) and inside the mobile sheet drawer — same as today. No new fixed positioning.
- Compact: one note paragraph + one full-width CTA + one microcopy line. No grid of cards, no decorative glow.

## Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- `rg "€3|€13|Abrir o cofre|cofre" src/components/report-redesign/v2/report-block-nav.tsx` → empty.
- Manual: public report sidebar shows "Grátis" on Block 1, "Oferta de lançamento" on Block 2 with note, "Premium" badge on Blocks 3–6, single CTA opens existing PremiumInterestDialog. PT/EN both.

## Out of scope
Feedback form, commercial email templates, `app.plan.tsx`, `app.account.tsx`, brand contact helpers — these P0 items from the prior audit are NOT part of this prompt and will be addressed in separate prompts.