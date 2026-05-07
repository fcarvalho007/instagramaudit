
# Design System Audit & Consolidation — Corrected Plan

## Typography Rules (corrected)

**Public-facing fonts: Fraunces + Inter only.**

- **Fraunces**: editorial H1/H2 headings only (page titles, report block titles).
- **Inter**: everything else — body, UI, labels, cards, buttons, forms, metadata, metrics, numbers, KPI values, prices, badges.
- **JetBrains Mono**: forbidden in public-facing UI. Allowed only in admin/internal technical contexts (logs, IDs, provider diagnostics, cost/debug tables, timestamps).
- Public-facing numbers use `Inter SemiBold/Bold` with `tabular-nums`, never `font-mono`.

## Typography Scale

| Element | Font | Desktop | Mobile |
|---------|------|---------|--------|
| H1 / page title | Fraunces SemiBold/Bold | 40-48px | 32-38px |
| H2 / block title | Fraunces SemiBold | 26-32px | 22-26px |
| H3 / card title | Inter SemiBold | 18-22px | 16-20px |
| Body | Inter Regular | 15-17px | 14-16px |
| UI labels/badges/metadata | Inter Medium/SemiBold | 12-14px | 12-14px |
| Large metrics | Inter SemiBold/Bold | 32-56px | 24-40px |
| Card metrics | Inter SemiBold/Bold | 24-36px | 20-28px |
| Small metrics | Inter SemiBold | 14-18px | 13-16px |
| Minimum readable | any | 12px (`text-xs`) | 12px |

Below 12px only for: chart axis ticks, decorative micro-labels, dense admin technical tables — each exception must be justified.

---

## Audit: Public-facing `font-mono` violations (must replace with Inter)

**Landing page** (4 files):
- `mockup-metric-card.tsx:84,100` — metric values
- `mockup-benchmark-gauge.tsx:33,41` — gauge labels
- `mockup-dashboard.tsx:153` — dashboard numbers

**Product / analysis** (3 files):
- `analysis-header.tsx:80` — metric display
- `analysis-benchmark-block.tsx:119,128,136` — benchmark values
- `analysis-competitor-comparison.tsx:104,108,228` — comparison numbers

**Report public** (12 files):
- `report-overview-cards.tsx:270,276,282,389,503,520,538,560,618` — all KPI values and metric numbers
- `report-overview-engagement.tsx:160,163,195` — engagement metrics
- `report-hero-v2.tsx:122` — hero metric
- `report-diagnostic-card.tsx:303,418,445,527,659,693,737,855,943,1123,1124` — all diagnostic numbers
- `report-diagnostic-grid-v2.tsx:151,179` — grid metrics
- `report-engagement-benchmark-chart.tsx:250` — benchmark values
- `report-editorial-patterns.tsx:145` — pattern metrics
- `report-engagement-history.tsx:108,124,125` — history values
- `report-ai-reading.tsx:87` — AI score
- `report-themes-feature.tsx:176,182` — theme metrics
- `report-block-nav.tsx:85,250` — nav indicators
- `caption-diagnostics-card.tsx:573,606,674,739,759,817,839` — caption metrics
- `hashtag-diagnostics-card.tsx:141,191,194` — hashtag metrics
- `visual-cover-analysis-card.tsx:307,326,446` — visual metrics
- `report-enriched-top-links.tsx:59,65,67` — post metrics
- `report-methodology.tsx:152` — methodology numbers
- `market-signals-chart.tsx:85,96,138` — chart labels (fontFamily in JS config too)

**Beta** (1 file):
- `beta.submitted.$requestId.tsx:46` — request ID display

**Shared UI**:
- `ui/chart.tsx:224` — Recharts tooltip value

## Audit: Admin/internal `font-mono` (may keep)

These are acceptable — logs, IDs, cost tables, provider diagnostics:
- `admin/v2/report-drawer.tsx` — IDs, timestamps, cost values
- `admin/v2/receita/*` — reconciliation, invoices, plans, waterfall, cohort tables
- `admin/v2/clientes/*` — customer cost data
- `admin/v2/conhecimento/*` — benchmark raw data
- `admin/v2/error-investigation-modal.tsx` — error codes
- `admin/request-list.tsx`, `admin/request-detail-sheet.tsx` — request IDs
- `admin.sistema.tsx` — system diagnostics

---

## Audit: Tiny text violations (public-facing, must fix to >= 12px)

| File | Current | Action |
|------|---------|--------|
| `report-diagnostic-card.tsx` | `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]` (15+ instances) | All to `text-xs` unless chart tick |
| `report-editorial-patterns.tsx` | `text-[10px]` | `text-xs` |
| `report-engagement-history.tsx` | `text-[11px]` (3x) | `text-xs` |
| `report-ai-reading.tsx` | `text-[11px]` | `text-xs` |
| `report-block-nav.tsx` | `text-[10px]` (2x) | `text-xs` |
| `report-themes-feature.tsx` | `text-[11px]` (2x) | `text-xs` |
| `caption-diagnostics-card.tsx` | `text-[11px]`, `text-[9px]`, `text-[12px]` | All to `text-xs` |
| `report-methodology.tsx` | `text-[10px]` | `text-xs` |
| `report-overview-cards.tsx` | `text-[11px]` (5x) | `text-xs` |
| `analysis-skeleton.tsx` | `text-[11px]` (2x) | `text-xs` |
| `analysis-competitor-comparison.tsx` | `text-[0.625rem]` (10px) | `text-xs` |
| `app.plan.tsx` | `text-[11px]` (4x) | `text-xs` |
| `app.account.tsx` | `text-[11px]` (6x) | `text-xs` |
| `app.reports.tsx` | `text-[11px]` (2x) | `text-xs` |
| `pro-tracking-teaser.tsx` | `text-[11px]` (2x) | `text-xs` |
| `report-card.tsx` | `text-[11px]` | `text-xs` |
| `visual-cover-analysis-card.tsx` | `text-[11px]` | `text-xs` |
| `hashtag-diagnostics-card.tsx` | `text-[13px]` (2x) | Keep (>12px, acceptable) |
| `market-signals-chart.tsx` | `text-[11px]` | `text-xs` for label; chart axis config: keep if justified |

## Audit: Hardcoded `slate-*` colors (376 instances)

Concentrated in CRM (`app.reports.tsx`, `app.plan.tsx`, `app.account.tsx`), auth pages, and some report components. All must be replaced with design tokens (`text-content-*`, `bg-surface-*`, `border-border-*`).

---

## Implementation Order

### Phase 1 — Auth & CRM (lowest risk, high visibility)

Replace `slate-*` with tokens and `text-[11px]` with `text-xs` in:
- `auth-card.tsx`
- `login.tsx`, `signup.tsx`, `reset-password.tsx`
- `app.tsx`, `app.reports.tsx`, `app.reports.$id.tsx`
- `app.plan.tsx`, `app.account.tsx`
- `pro-tracking-teaser.tsx`, `report-card.tsx`

### Phase 2 — Landing page

Replace `font-mono` with `font-sans font-semibold tabular-nums` in:
- `mockup-metric-card.tsx`
- `mockup-benchmark-gauge.tsx`
- `mockup-dashboard.tsx`

### Phase 3 — Report components (highest volume, most sensitive)

Two sub-tasks per file:
1. Replace `font-mono` with `font-sans font-semibold tabular-nums` (or `font-bold` for large metrics)
2. Replace sub-12px text with `text-xs`

Files by priority:
- `report-overview-cards.tsx` (9 mono + 5 tiny)
- `report-diagnostic-card.tsx` (11 mono + 15 tiny)
- `report-hero-v2.tsx`, `report-overview-engagement.tsx`
- `caption-diagnostics-card.tsx`, `hashtag-diagnostics-card.tsx`
- `visual-cover-analysis-card.tsx`
- `report-engagement-benchmark-chart.tsx`
- `report-editorial-patterns.tsx`, `report-engagement-history.tsx`
- `report-ai-reading.tsx`, `report-methodology.tsx`
- `report-themes-feature.tsx`, `report-block-nav.tsx`
- `report-diagnostic-grid-v2.tsx`
- `report-enriched-top-links.tsx`
- `market-signals-chart.tsx` (includes JS fontFamily config)
- `analysis-header.tsx`, `analysis-benchmark-block.tsx`, `analysis-competitor-comparison.tsx`
- `analysis-skeleton.tsx`
- `ui/chart.tsx` (shared tooltip)
- `beta.submitted.$requestId.tsx`

### Phase 4 — Admin area (minor fixes only)

- `admin.sistema.tsx:132` — remove inline `style={{ color: "#888780" }}`, use `text-admin-text-tertiary`
- Keep all admin `font-mono` usage as-is (internal/technical context)

### Phase 5 — Runtime error investigation

- Investigate TanStack Router hydration invariant on `/admin/report-lab`

---

## Files NOT to touch

- Provider logic (`src/lib/providers/`, edge functions)
- Cost formulas (`src/lib/cost/`)
- PDF pipeline (`src/lib/pdf/`)
- Report generation logic (`src/lib/report/`)
- Supabase schema / migrations
- `src/integrations/supabase/client.ts`, `types.ts`, `.env`
- `src/styles/tokens.css`, `src/styles/tokens-light.css` (already correct)

## Estimated scope

~35 files, ~500+ line replacements. Mechanical changes: `font-mono` → `font-sans font-semibold tabular-nums`, `text-[Npx]` → `text-xs`, `slate-*` → tokens. No new dependencies. No schema changes. No provider calls.
