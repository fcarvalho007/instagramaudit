## 1. Executive summary

I reviewed the public/free report, Pro report, app sidebar, sticky unlock bar, pricing/unlock modal, credit-confirmation modal, pricing-interest modal, checkout shells and the design tokens. Overall posture is **decent**: shadcn primitives carry most ARIA, focus order is sensible, a global `:focus-visible` ring exists in `src/styles/tokens.css`, and PT copy is generally clear. The main weaknesses are predictable for a fast-moving SaaS:

- Several **muted text colours** (slate-400, content-tertiary, `text-[11px]`) sit below WCAG AA 4.5:1 on white surfaces.
- The **app sidebar / topbar** still uses raw `slate-*` classes (violates project core rule) and omits `aria-current`, `aria-label="Principal"` and an explicit `<header>`/`role="navigation"`.
- The **sticky unlock bar** uses `aria-hidden` for visual hide while leaving focusable buttons inside — buttons become unreachable yet still in tab order on some browsers; also the mobile "Ver tudo" label is vague (the user even flagged this pattern in the brief).
- Several dialogs use `text-[11px]` and `text-xs` for error / status text, which is borderline on mobile and screen magnification.
- Charts (engagement chart, KPI grid, heatmap) have **no text alternative / summary** for screen readers.
- The competitor input field has label + error association ✓, but the error message uses `text-[11px]` (~11 px) and only colour to indicate state.
- Locked premium cards rely on **blur + lock icon + colour** — content is visually obscured but the underlying DOM is still read by AT, which both leaks info and confuses screen readers (no `aria-hidden` or "Conteúdo bloqueado" label).
- Global `:focus-visible` ring exists, but several custom buttons override `focus:outline-none` and only add `focus-visible:ring-2 …/40` (40 % alpha) — visible on white, weak on muted backgrounds.

Nothing is catastrophic; all top items are 1–2 line fixes.

## 2. Top 10 accessibility issues (ranked)

| # | Severity | Area | Finding |
|---|---|---|---|
| 1 | **High** | `src/components/app/app-sidebar.tsx`, `app-topbar.tsx` | Nav items are plain `<Link>` without `aria-current="page"`; sidebar is `<aside>` not `<nav aria-label="Principal">`. Active state is colour-only (`bg-slate-100`). Screen reader users can't tell which section is active. Also `text-slate-400` for email/logout (~3.0:1) fails AA. |
| 2 | **High** | `src/components/report-redesign/v2/sticky-unlock-bar.tsx` | Bar wrapper uses `aria-hidden={!visible}` plus `pointer-events-none` for hide, but the inner buttons are still in the DOM. When `visible=false`, focus can still land on "Desbloquear"/"Fechar" via Tab in some browsers while AT is told to ignore them — focus appears to "vanish". Should toggle mount or `inert`. Also missing `role="region" aria-label="Acesso premium"`. |
| 3 | **High** | Sticky bar mobile | CTA label "Ver tudo" is non-descriptive (user flagged this in the brief). Should read "Desbloquear relatório completo · €9" or similar. Same button on desktop reads "Desbloquear" ✓ — inconsistent. |
| 4 | **High** | All locked premium cards (`premium-teaser-card.tsx`, blur overlays in report v2) | Blurred content is still in the accessibility tree. Result: screen readers read teaser data the user hasn't paid for, and the lock state is conveyed only by an icon + colour. Need `aria-hidden="true"` on the blurred payload + a sibling `<p>` "Conteúdo premium — desbloquear por €9". |
| 5 | **High** | Charts in `src/components/report/*` and `report-redesign/v2/report-engagement-benchmark-chart.tsx` | Recharts surfaces have no `role="img" aria-label` and no text summary (e.g. "Engagement médio: 3,2 %, benchmark do nicho: 2,1 %"). Fails WCAG 1.1.1 / 1.4.5. |
| 6 | **Medium** | `consume-credit-dialog.tsx` | Competitor handle error uses `text-[11px]` (~11 px) — below readable minimum on small viewports and against project core rule "minimum readable size text-xs (12px)". Also `aria-invalid` is set but the error `<p>` has no `role="alert"` (only the network errorMessage does), so the inline validation isn't announced live. |
| 7 | **Medium** | `sticky-unlock-bar.tsx`, multiple buttons in v2 | Custom buttons use `focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40` (alpha 40 %). On white surfaces the ring is ~1.6:1 against `surface-base`, well below the 3:1 non-text contrast requirement (WCAG 1.4.11). Drop the `/40` or raise to `/70`. |
| 8 | **Medium** | App layout (`src/components/app/app-layout.tsx`, header) | No skip link ("Saltar para conteúdo"), no landmark `<header role="banner">` wrapper on the topbar, and the mobile topbar's hamburger button has only an icon (no `aria-label="Abrir menu"`, no `aria-expanded`). |
| 9 | **Medium** | Contrast — repeated across report v2 and pricing | `text-content-tertiary` and `text-slate-400` are used for prices' "único" suffix, balance hints, "soon_note", chart axis labels. Several measured at ~3.5–4.0:1 on `surface-base`. Promote to `content-secondary` for any non-decorative text. |
| 10 | **Medium** | Pricing interest modal (`pricing-interest-modal.tsx`) and Add competitor input | RadioGroup options are wrapped via shadcn (good), but the modal title is a generic translation and the price text is rendered separately from the title — screen readers hear "Quanto pagarias?" without context of which plan. Need the dialog title to include `planLabel` + `planPrice`, or set `aria-describedby` to a sentence that includes both. |

## 3. Quick wins (also improve visual clarity)

These are 1–2 line, low-risk changes that pay off both visually and for AT:

1. **Sidebar active state**: add `aria-current="page"` + a 2 px left border or pill (already half-done with `bg-slate-100`). Replace `slate-*` with `content-*` / `surface-*` tokens at the same time. Removes a core-rule violation.
2. **Sticky bar CTA label**: change mobile "Ver tudo" → "Desbloquear · €9" (or the price token already in scope). Consistency + clarity.
3. **Sticky bar lifecycle**: when `!visible`, return `null` (or add the `inert` attribute) instead of `aria-hidden` + `pointer-events-none`. Removes phantom-focus bug and shrinks DOM.
4. **Locked teaser cards**: add `aria-hidden="true"` on the blurred payload and a visible "Conteúdo premium" badge that doubles as the AT label. Solves both the leak and the lock-icon-noise issue.
5. **Focus ring alpha**: in the custom button classes, replace `ring-accent-primary/40` with the bare token. The site-wide `:focus-visible` already provides a strong default — let it through.
6. **Mobile topbar hamburger**: add `aria-label="Abrir menu"`, `aria-expanded={open}`, `aria-controls="app-mobile-nav"`. Two attributes, three users helped (keyboard, screen reader, voice control).
7. **Skip link** in `app-layout.tsx` and `report-shell-v2.tsx`: a single visually-hidden `<a href="#conteudo">Saltar para o conteúdo</a>` that becomes visible on focus.
8. **Promote muted prices/suffixes** ("único", "pagamento único", balance hints) from `content-tertiary` → `content-secondary`. Improves both contrast and visual hierarchy.
9. **Dialog titles include plan + price** in the pricing-interest modal (DialogTitle template). Better headlines for everyone.
10. **Reduced motion**: the sticky bar uses `transition-[opacity,transform] duration-200`. Wrap in `motion-safe:` or honour `prefers-reduced-motion` (the global file already shows the pattern). One Tailwind variant.

## 4. Defer to a later accessibility sprint

- Full chart accessibility (data tables for each visualisation, sonification, etc.) — needs design.
- Comprehensive heading-order pass across all marketing routes (precos, servicos, landing variants).
- A11y test harness (axe-core / playwright a11y assertions) in CI.
- Full PT-PT copy review of error strings across forms (signup, reset password, beta request).
- Heatmap (`report-posting-heatmap.tsx`) keyboard interaction and AT description — requires a small redesign.
- Admin/backoffice accessibility — out of public scope, low priority while it stays internal.

## 5. Files likely affected (quick wins first)

```text
src/components/app/app-sidebar.tsx
src/components/app/app-topbar.tsx
src/components/app/app-layout.tsx
src/components/report-redesign/v2/sticky-unlock-bar.tsx
src/components/report-redesign/v2/premium-teaser-card.tsx
src/components/report-redesign/v2/report-shell-v2.tsx
src/components/report-redesign/v2/consume-credit-dialog.tsx
src/components/pricing/pricing-interest-modal.tsx
src/components/report/report-engagement-history.tsx (charts)
src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx
src/components/layout/header.tsx
src/styles/tokens.css  (only if we re-tune focus ring or muted tokens)
```

No schema, no pricing, no EuPago, no credits, no checkout logic touched by any of the above.

## 6. Recommended implementation prompts (one small fix per prompt)

Each is intentionally narrow so it can be run independently in build mode.

1. **Sidebar a11y + de-slate**
   > In `src/components/app/app-sidebar.tsx` and `app-topbar.tsx`, replace all `slate-*` classes with semantic tokens (`content-primary`, `content-secondary`, `surface-base`, `surface-muted`, `border-default`). Wrap the desktop nav in `<nav aria-label="Principal">` and add `aria-current="page"` to the active link. No behaviour changes.

2. **Mobile topbar hamburger**
   > In `src/components/app/app-topbar.tsx`, add `aria-label="Abrir menu"`, `aria-expanded`, and `aria-controls` to the menu button; give the collapsible nav an `id` and `role="navigation"`.

3. **Sticky unlock bar — mount + label**
   > In `src/components/report-redesign/v2/sticky-unlock-bar.tsx`: return `null` when `!visible`. Rename the mobile CTA from "Ver tudo" to "Desbloquear · {priceLabel}". Drop `aria-hidden` hack. Honour `prefers-reduced-motion`.

4. **Custom button focus rings**
   > Across `sticky-unlock-bar.tsx` and any v2 button that overrides `focus:outline-none`, remove the `/40` alpha on `focus-visible:ring-accent-primary` so the ring meets 3:1 contrast, or remove the override entirely and rely on the global `:focus-visible` rule in `src/styles/tokens.css`.

5. **Locked premium card AT-safety**
   > In `src/components/report-redesign/v2/premium-teaser-card.tsx`, wrap the blurred content in a `<div aria-hidden="true">` and add a sibling visible badge "Conteúdo premium — desbloquear por {priceLabel}" that screen readers announce. No payload changes.

6. **Skip link + landmarks**
   > In `src/components/app/app-layout.tsx` and `src/components/report-redesign/v2/report-shell-v2.tsx`, add a visually-hidden "Saltar para o conteúdo" link as the first focusable element targeting the existing `<main>`. Give `<main>` an `id="conteudo"`.

7. **Consume-credit dialog — error live + min size**
   > In `src/components/report-redesign/v2/consume-credit-dialog.tsx`, raise `text-[11px]` → `text-xs`, and add `role="alert"` to the inline `competitor-handle-error` paragraph. No validation logic changes.

8. **Pricing-interest modal — title carries plan**
   > In `src/components/pricing/pricing-interest-modal.tsx`, render the plan label + price inside `DialogTitle` (or `aria-describedby` pointing at a sentence containing both). Keeps visual layout, fixes the "out of context" announcement.

9. **Muted text contrast pass**
   > For non-decorative copy (price suffixes "único", balance hints, soon notes, chart axes), promote `content-tertiary` → `content-secondary`. Scope: report v2 sidebar/topbar, sticky bar, consume-credit dialog. No layout changes.

10. **Chart text alternative (minimum)**
    > For the engagement benchmark chart and KPI grid charts in v2, add `role="img"` plus a derived `aria-label` (e.g. "Engagement médio do perfil: 3,2 %; benchmark do nicho: 2,1 %"). Full data-table alternative deferred.

## 7. Implementation status

Nothing implemented. This is a planning artefact only — every prompt above is meant to be triggered explicitly by the user, one at a time, in build mode.
