## Goal

Ensure the public/free report at `/analyze/$username` shows the 5 premium teaser cards after Engagement, the sticky unlock bar appears while scrolling through them, and the locked sidebar items scroll to the matching teaser. UI-only — no payment, entitlement, pricing, scraping, or generation logic touched.

## What the code already has (verified)

- `src/components/report-redesign/v2/premium-teaser-card.tsx` — locked card with number, eyebrow, title, description, optional sub-items chip list, blurred preview, and "Desbloquear por {priceLabel}" CTA reading from `PUBLIC_PRODUCTS.report_full_9.priceLabel` and routing through `usePremiumCta()`.
- `src/components/report-redesign/v2/report-overview-block.tsx` — `mode="free_with_engagement"` renders Identity → Methodology → Engagement (`id="engagement"`) → eyebrow "Relatório completo · 5 secções premium" → 5 `<PremiumTeaserCard>` (anchors `frequencia`, `formatos`, `publicacoes-chave`, `diagnostico-editorial`, `prioridades`). Copy matches the spec; Diagnóstico has the 7-item sub-list.
- `src/components/report-redesign/v2/report-shell-v2.tsx` — picks `mode="free_with_engagement"` when `lockBoundary === "engagement" && unlocked && !premiumUnlocked`. Renders `<StickyUnlockBar />` only when `lockBoundary === "engagement" && !premiumUnlocked` (so it never shows in PRO; in `internal_lab` the route never passes `lockBoundary`).
- `src/components/report-redesign/v2/sticky-unlock-bar.tsx` — copy matches the spec exactly; price from `PUBLIC_PRODUCTS.report_full_9.priceLabel`.
- `src/routes/analyze.$username.tsx` — passes `lockBoundary="engagement"`, `unlocked=true` (initial), `premiumUnlocked={false}`, `variant="public_mvp"`.
- Sidebar uses `COMMERCIAL_SECTIONS` (`block-config.ts`) whose ids match the teaser anchors 1:1.

## Why the teasers may not be visible

The teaser branch is correctly wired. The most common explanations for "not visible" are:
1. **Stale cached HTML** in the preview (the `analyze` route is SSR-disabled, so a hard reload should clear it).
2. **A render-state mismatch** (e.g. `unlocked` momentarily flipping to `false`, sending overview into `mode="free"`, which replaces Engagement with `LockGatePremium` and renders no teasers).
3. The user is comparing against `/report/example` or `internal_lab`, both of which intentionally don't show teasers.

The plan repairs the only render-state risk (point 2) defensively, and fills the two real gaps in the spec (sidebar scroll + sticky bar trigger).

## Changes

### 1. `src/components/report-redesign/v2/report-shell-v2.tsx` — defensive teaser fallback

In the overview branch, broaden the second condition so the 5 teasers also render when `unlocked` is briefly false during the onboarding-first flow:

- Keep `mode="free"` only for `lockBoundary === "engagement" && !unlocked && !leadHasOnboarded` cases — but since the route always passes `unlocked=true`, simplify the conditional to: `lockBoundary === "engagement" && !premiumUnlocked → mode="free_with_engagement"`, else default `"all"`. This guarantees the 5 teasers always render in the public free report, even if `unlocked` momentarily races.
- Remove the now-unreachable `LockGatePremium` mount that depends on `lockBoundary === "engagement" && !unlocked` (it was the legacy lead-magnet card; the flow is onboarding-first now, so this is dead code in the public path).

### 2. `src/components/report-redesign/v2/report-block-nav.tsx` — locked sidebar items scroll to teaser, then open modal

In the `premium`-items loop (around line 1043), replace the current `onClick={() => handlePremiumAccessClick("sidebar_section", ...)}` with a helper that:

1. Calls `scrollToBlock(item.block.id)` (the id is exactly the anchor: `frequencia`, `formatos`, `publicacoes-chave`, `diagnostico-editorial`, `prioridades`) to scroll the user to the matching `<PremiumTeaserCard>`.
2. Still fires `handlePremiumAccessClick("sidebar_section", { block_id })` so tracking and the modal continue to work — but with a small `setTimeout(..., 350)` so the scroll lands first and the user sees the locked teaser before the dialog opens. This satisfies "Clicking locked sidebar items should scroll to the corresponding locked teaser card, not silently do nothing" without weakening the conversion path.

### 3. `src/components/report-redesign/v2/sticky-unlock-bar.tsx` — more robust trigger

Replace the scroll-listener that watches `#engagement.bottom < 80` with an `IntersectionObserver` on the first teaser anchor `#frequencia`:

- `setPassedFree(true)` once `#frequencia` enters the viewport (rootMargin `0px 0px -10% 0px`).
- Keep the existing `#lead-magnet-card` observer to hide the bar when the final paywall CTA is visible.
- Fallback: if `#frequencia` is not in the DOM (PRO / internal lab), the bar stays hidden — which matches "must not appear in PRO" and "must not appear in internal lab" (the shell additionally gates the mount on `lockBoundary === "engagement" && !premiumUnlocked`).
- No copy or price change (already correct).

### 4. Anchors — keep existing ids, no duplicates

No new anchors. Confirm the existing ids stay: `#engagement`, `#frequencia`, `#formatos` (spec accepted "or the existing approved ID"), `#publicacoes-chave`, `#diagnostico-editorial`, `#prioridades`.

## Out of scope (explicitly unchanged)

- `PUBLIC_PRODUCTS.report_full_9` price — read dynamically; no hardcode.
- `PremiumCtaProvider`, `UnlockModal`, EuPago, webhooks, entitlements, credits, `report_requests`, `analysis_snapshots`, server functions, scraping, enrichment, snapshot adapter.
- `pro_preview` and `internal_lab` variants and the lab preview route.
- `/report/example`.
- Sidebar copy "2 de 7 secções accessíveis" already comes from `t("nav.access.progress", { accessible: 2, total: 7 })` for free — unchanged.

## Files to change

1. `src/components/report-redesign/v2/report-shell-v2.tsx`
2. `src/components/report-redesign/v2/report-block-nav.tsx`
3. `src/components/report-redesign/v2/sticky-unlock-bar.tsx`

## Validation checklist

1. `/analyze/<handle>` (free): Visão geral + Engagement render fully; below Engagement the eyebrow "Relatório completo · 5 secções premium" appears followed by 5 `<PremiumTeaserCard>` (03–07) with correct titles, descriptions, the 7-item chip list under 06, and the "Desbloquear por 9€" CTA reading the dynamic price.
2. Scrolling past Engagement: the sticky bar slides in (desktop: "Faltam-te 5 secções premium" + "Desbloquear"; mobile: "5 secções por desbloquear" + "Ver tudo"). The bar hides when `#lead-magnet-card` is in view at the bottom.
3. PRO state (premium unlocked): no sticky bar, no teaser cards (full sections render instead).
4. Internal lab route (`/admin_/report-preview/$username`): no sticky bar, no teaser cards.
5. Clicking a locked sidebar item (03–07): the page scrolls smoothly to the matching teaser card, then the `PremiumInterestDialog` opens (existing flow, unchanged).
6. Sidebar still reads "2 de 7 secções acessíveis" with 01/02 marked Free and 03–07 marked Premium.
7. Mobile (≤390 px): no horizontal overflow on any teaser card; CTA stays inside the card; sticky bar sits above the bottom tabs bar with `safe-area-inset-bottom`.
8. Price displayed everywhere remains `PUBLIC_PRODUCTS.report_full_9.priceLabel` (no hardcoded "9€" string introduced).
9. No payment/entitlement/checkout/EuPago/scraping/generation/calculation code touched (grep for changes restricted to the 3 files above).