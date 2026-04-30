# Phase 1B.1A — Refine Block 01 (Overview)

Compact, premium, Instagram-profile-inspired first fold. No locked files touched. No providers, PDF, admin, schema or `/report/example`.

## Files allowed (in scope)
- `src/components/report-redesign/v2/report-hero-v2.tsx` — major rewrite
- `src/components/report-redesign/v2/report-kpi-grid-v2.tsx` — fix overflow + PT label
- `src/components/report-redesign/v2/report-overview-block.tsx` — watermark "01" + tighter spacing
- `src/components/report-redesign/v2/report-shell-v2.tsx` — remove standalone positioning band
- `src/components/report-redesign/report-tokens.ts` — additive V2 tokens only

Locked files confirmed untouched: `report-shell.tsx`, `report-hero.tsx`, `report-kpi-grid.tsx`, `report-ai-reading.tsx`, `report-framed-block.tsx`, `report-section-frame.tsx`, `report-methodology.tsx`, all `tokens.css` / `styles.css`. The positioning banner file (`report-positioning-banner.tsx`) is V2 and not locked — we will stop importing it from the shell (file remains as dead code, not deleted, to keep diff minimal and rollback trivial).

## Data available (verified in `snapshot-to-report-data.ts`)
- `result.data.profile`: `username`, `fullName`, `followers`, `following`, `postsCount`, `postsAnalyzed`, `analyzedAt`, `verified`
- `result.enriched.profile`: `bio`, `avatarUrl`
- `result.coverage.windowDays`
- `result.data.keyMetrics.dominantFormat` ∈ `"Reels" | "Carousels" | "Imagens"` → display map: `Carousels → Carrosséis`

---

## 1) `report-hero-v2.tsx` — compact Instagram-style header

- Reduce vertical padding sharply: `pt-8 md:pt-10 lg:pt-12 pb-8 md:pb-10` (was `pt-12..20 pb-12..16`).
- Drop the "InstaBench · Relatório editorial" eyebrow inside the hero (replaced by the merged positioning strip below).
- Layout (desktop ≥ lg): two columns `flex justify-between items-start gap-8`.
  - **Left (identity)**: avatar (size-16 md:size-20, smaller than current 20/24) + identity column:
    - handle in serif (new token `h1HeroV2Compact`, smaller scale)
    - display name (slate-700, text-base)
    - bio (line-clamp-2, max-w-xl)
    - **Stats meta row** directly below bio (see §2)
  - **Right (actions)**: Exportar PDF + Partilhar stacked or inline; small coverage badges cluster underneath.
- Mobile: vertical, identity → stats → actions. Coverage badges become a small wrap row at bottom.
- Remove the large "cluster de cobertura + meta" block in its current form. Replace with a tighter cluster (smaller chips, single line where possible).
- Approximate desktop hero height target: ~280–340px.

### New tokens (additive in `report-tokens.ts`)
- `h1HeroV2Compact`: `font-display text-[1.5rem] sm:text-[1.875rem] md:text-[2.125rem] lg:text-[2.375rem] font-semibold tracking-[-0.02em] text-slate-900 leading-[1.1] break-words [word-break:normal] [hyphens:none]`
- `heroBandV2Compact`: same gradient family, slightly less saturated (radial peak ~12% instead of 16%) so the compact band reads premium without dominating.
- `heroStatItem`: `flex flex-col items-start gap-0.5`
- `heroStatValue`: `font-display text-base md:text-lg font-semibold text-slate-900 tabular-nums`
- `heroStatLabel`: `font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500`
- `positioningStrip`: `mt-5 md:mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-t border-slate-200/60 pt-4 md:pt-5`
- `positioningChip`: `inline-flex items-center gap-1.5 rounded-full ring-1 ring-blue-200 bg-blue-50 text-blue-700 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]`

## 2) Compact Instagram-style stats row

Inside the hero identity column, render a horizontal stats row (`flex flex-wrap gap-x-5 gap-y-2`) with conditional items (only when value is meaningful, i.e. `> 0` or non-empty):

| label (pt-PT)            | value source                                             |
|--------------------------|----------------------------------------------------------|
| publicações analisadas   | `profile.postsAnalyzed` (always show)                    |
| seguidores               | `profile.followers` if > 0 — formatted compact (1.2K, 3.4M) |
| a seguir                 | `profile.following` if > 0 — compact format              |
| publicações totais       | `profile.postsCount` if > 0 — only if ≠ postsAnalyzed    |
| dias                     | `coverage.windowDays` if > 0 (label "dias analisados")   |
| analisado em             | `profile.analyzedAt` if non-empty                        |

Each item: value on top (`heroStatValue`), label below (`heroStatLabel`). Compact formatter implemented locally in the file (small helper `formatCompact(n)`).

## 3) Merge the positioning banner into the hero

- Remove `<ReportPositioningBanner />` import + render from `report-shell-v2.tsx`.
- Inside `report-hero-v2.tsx`, append a `positioningStrip` directly after the identity/actions row, inside the hero band:
  - Left text (smaller, `text-[13px] md:text-sm text-slate-600 leading-relaxed max-w-2xl`):
    > "InstaBench cruza o que o perfil comunica publicamente, como compara com perfis semelhantes e que temas têm procura fora do Instagram."
  - Right: three `positioningChip` items: `Conteúdo público`, `Comparação com pares`, `Procura externa`.
- This eliminates the second strip while preserving the editorial positioning copy in a compact form.

## 4) `report-overview-block.tsx` — decorative "01" + tighter rhythm

- Remove the current `blockNumberDecor` div that sits above the KPI grid and pushes content down.
- Wrap the block content in `relative` and place "01" as an absolute watermark behind the heading area, hidden on mobile:
  - `aria-hidden`, `absolute -top-2 right-0 lg:right-2 select-none pointer-events-none`
  - reuse existing `blockNumberDecor` token (outline serif).
- Reduce gaps: outer `space-y-6 md:space-y-8` (was 8/10).
- Hero insight stays directly under the KPI grid, no extra `mt`. Insight container `max-w-3xl mt-2` for closer pairing.
- Keep "Leitura principal" eyebrow + `insightFrameV2` left rule.
- The block question "Como está o perfil em geral?" remains rendered by `ReportBlockSection` header — unchanged.

## 5) `report-kpi-grid-v2.tsx` — fix overflow + PT label

- Add a tiny mapper:
  ```ts
  const FORMAT_PT: Record<string, string> = {
    Carousels: "Carrosséis", Carousel: "Carrosséis",
    Reels: "Reels", Reel: "Reels",
    Images: "Imagens", Image: "Imagens", Imagens: "Imagens",
  };
  ```
- Use `FORMAT_PT[k.dominantFormat] ?? k.dominantFormat`.
- Prevent overflow on the format card:
  - When the value is categorical (string, not numeric), use a smaller text style: `font-display text-[1.375rem] md:text-[1.5rem] font-semibold tracking-tight leading-tight break-normal` (new token `kpiValueV2Categorical`).
  - Add `truncate` is wrong (clips diacritics) — instead use `min-w-0` on parent + `break-words [word-break:normal]`.
- Add `min-w-0` to every card and to inner value container to stop grid items pushing width.
- Tighten card padding to `p-4 md:p-5 lg:p-6` (was `p-5 md:p-6 lg:p-7`) for a denser, premium feel.
- Reduce numeric `kpiValueV2` to `text-[1.875rem] md:text-[2.125rem]` (slightly smaller) to align with the compact hero.
- Remove `spanLast` on the benchmark card on mobile — change to `col-span-2 sm:col-span-1` so it doesn't stretch oddly at sm/lg. At `lg`, all 5 fit on one row already.
- Verify no horizontal overflow at 375 / 768 / 1366 by relying on `min-w-0` + grid (already used).

## 6) `report-shell-v2.tsx` — remove standalone positioning band

- Delete the `<ReportPositioningBanner />` line and its import.
- Keep everything else intact (sidebar, tabs, blocks 02–06 are not modified).

## 7) Out of scope (explicitly untouched)
- Blocks 02–06, AIInsightBox, ReportAiReading, all framed blocks.
- `/report/example`, admin pages, API routes, providers, PDF, Supabase, AI prompts/validators.
- Database schema. Locked files.

## Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- No browser visual QA (user will validate manually).

## Report back
Files changed, locked-file confirmation, tsc result, vitest result, and confirmation that providers/PDF/admin/`/report/example`/schema were not touched.
