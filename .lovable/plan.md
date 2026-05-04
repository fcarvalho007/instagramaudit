
## Audit & Improve AnalysisSkeleton Loader

### Current State

The loader renders correctly on both desktop (1280px) and mobile (375px). The card is well-centered, typography hierarchy is clear, bar animations are smooth, and the overall feel is clean/analytical (Iconosquare-style). A dev-only preview route already exists at `/dev-loading-preview`.

### Visual QA Findings

**Desktop (1280px):** Card centered, good whitespace, bars animate smoothly with staggered delays. Phase text transitions are elegant. The gradient background blends well with the light theme.

**Mobile (375px):** Card fills width with proper padding. Bar widths scale via `clamp()`. Phase text wraps cleanly at 2 lines. Username badge is readable. Footer text wraps at 2 lines gracefully.

**Issues identified:**
1. The eyebrow label "A ANALISAR PERFIL" uses hardcoded `text-[11px]` — should use the existing `.text-eyebrow-sm` utility per the design system rules.
2. The phase message uses `font-display` (Fraunces) — per the 2-font rule, Fraunces is only for H1 on the report page. Loading phase messages should use Inter (`font-sans`).
3. No `previewLoading` dev flag exists on the real `/analyze/$username` route — the only way to preview is via the separate `/dev-loading-preview` route.
4. Reduced-motion mode stops animations but the bars freeze at `scaleY(0.6)` which looks like a broken half-state. A polished static state should show bars at varying fixed heights to maintain the "analytics chart" silhouette.

### Plan

#### 1. Add `?previewLoading=1` to `/analyze/$username` (dev-only)

**File:** `src/routes/analyze.$username.tsx`

- Extend `validateSearch` to accept `previewLoading` (optional number).
- In `AnalyzePage`, when `previewLoading === 1` AND `import.meta.env.DEV` is true, render `AnalysisSkeleton` permanently instead of triggering the real analysis pipeline.
- In production, the param is ignored — zero impact on real users.

#### 2. Fix typography tokens in the loader

**File:** `src/components/product/analysis-skeleton.tsx`

- Replace hardcoded `text-[11px] font-semibold uppercase tracking-[0.08em]` on the eyebrow with the `text-eyebrow-sm` utility class.
- Replace `font-display text-xl font-semibold ... sm:text-2xl` on the phase message with `font-sans text-lg font-semibold ... sm:text-xl` — Inter, not Fraunces, for non-H1 text.

#### 3. Polish reduced-motion static state

**File:** `src/components/product/analysis-skeleton.tsx`

- Update the `@media (prefers-reduced-motion: reduce)` CSS block to give each `.liq-bar` a different fixed `scaleY` via `:nth-child()` selectors, creating a static bar chart silhouette (e.g. 0.4, 0.55, 0.35, 0.65, 0.8, 0.5, 0.7) instead of all bars frozen at 0.6.

### What remains untouched

- Backend analysis logic, Apify calls, caching — zero changes.
- Report UI, PDF generation, share flow — zero changes.
- Global tokens, locked files — zero changes.
- `/dev-loading-preview` route — kept as-is (complementary to the new flag).
- Production user experience — `previewLoading` param is gated behind `import.meta.env.DEV`.

### Validation

- `tsc --noEmit`
- `vitest`
- Visual QA on desktop and 375px mobile via browser tools
- Reduced-motion QA via browser emulation
