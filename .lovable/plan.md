## Goal

Stop large-magnitude values (e.g. 1 147 836 followers vs 5 264 927) from overflowing or colliding inside the side-by-side panels of Phase 1 comparison cards, while keeping the editorial look. Surgical changes only: `CompareStatBlock`, `competitor-overview-compare`, and (lightly) the engagement/cadence call-sites. No data, schema, providers, credits, checkout, EuPago, Free/Public.

## Diagnosis

`Side` in `compare-stat-block.tsx:130` renders the value at `text-3xl sm:text-4xl` with no width guards beyond a `min-w-0` on the panel. The grid is `1fr_auto_1fr`, so when both columns get a long string like `"5 264 927"` at 36-40px, they push past their 1fr share, the panels visually collide and the centered `vs` gets squeezed. There is no compact-notation fallback — `fmtInt` in `competitor-overview-compare.tsx:177` always emits the full pt-PT integer.

Existing helper `formatCompactNumber(value, lang)` already exists in `src/lib/i18n/format.ts` (used by hero + identity card). Reuse it — no new util.

## Plan

### 1. `competitor-overview-compare.tsx` — compact formatting per metric

- Replace the inline `fmtInt` for the **Seguidores** row with `formatCompactNumber(value, "pt")` (e.g. "1,1 M", "5,3 M"). Pass the raw integer as a new `rawValue`/title hint so the tooltip shows the exact number.
- For **Likes por publicação** and **Comentários por publicação**: use compact only when `value >= 10_000`; otherwise keep `fmtInt`. Avoids "8,2 mil" where "8 246" still fits.
- **Publicações analisadas**, **Publicações por semana**, **Envolvimento médio** → unchanged (already short).
- Extend the `Row` shape with optional `primaryTitle` / `competitorTitle` (exact pt-PT integer) and forward them to `CompareStatBlock` via `primary.title` / `competitor.title`.

### 2. `compare-types.ts` — add optional `title` field on `CompareSide`

Pure additive field used as `title=` attribute on the value `<span>`. No behavioural change for callers that omit it.

### 3. `compare-stat-block.tsx` — responsive guards (the real fix)

Inside `Side`:
- Add `min-w-0 overflow-hidden` to the value `<span>`.
- Replace `text-3xl sm:text-4xl` with a fluid clamp: `text-[clamp(1.5rem,4.2vw,2.25rem)]` so 1460px desktop gets ~36px and 375px mobile gets ~24px. Keep `tabular-nums`, `font-semibold`, `leading-tight`.
- Add `whitespace-nowrap` + `title={side.title ?? side.formatted}` so the exact value is always discoverable on hover.
- Keep the handle `truncate max-w-full`.

On the wrapper grid:
- Change `sm:grid-cols-[1fr_auto_1fr]` → `sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` so 1fr columns can actually shrink (canonical CSS-grid overflow fix).
- Bump the `vs` column to `min-w-8 px-1` so the separator has stable breathing room and never gets squeezed.
- Keep the outer `min-w-0` on the section.

### 4. Engagement / Cadence cards — no logic change

They render percentages and "/ semana" decimals already short. They share `CompareStatBlock`, so they inherit the clamp + overflow guard for free. No edits required other than confirming the call-sites still compile.

### 5. Mobile (375 px)

Existing layout already stacks vertically via `grid-cols-1 sm:grid-cols-[...]`. With the clamp lower bound at 24px and `min-w-0` on the value span, the seguidores row will read e.g. "1,1 M" / "5,3 M" with the `vs` chip centered between the stacked panels — no horizontal scroll.

## Validation

1. Visit `/admin/report-preview/nunomarkl?variant=pro_preview` at 1460px — confirm "Seguidores" reads as "1,1 M" vs "5,3 M" (compact), `vs` is visible, no overlap.
2. Hover the values — `title` shows the exact integer (`1 147 836`).
3. Resize the browser preview to 375px — panels stack, no horizontal scroll, value text shrinks to ~24px.
4. `/admin/report-preview/frederico.m.carvalho` (no competitor) — unchanged (compare cards not rendered).
5. `/report.example` (Free/Public) — unchanged.
6. `bun tsc --noEmit` clean.
7. Network panel during render — no new provider/network calls.

## Files to change

- `src/components/report-redesign/v2/compare/compare-types.ts` — add optional `title?: string` on `CompareSide`.
- `src/components/report-redesign/v2/compare/compare-stat-block.tsx` — grid track `minmax(0,1fr)`, `vs` min width, fluid clamp on value, overflow guards, forward `title`.
- `src/components/report-redesign/v2/overview/competitor-overview-compare.tsx` — use `formatCompactNumber` for Seguidores (and likes/comments when ≥10 000), pass raw pt-PT integer via `title`.

No edits to engagement-compare, cadence-compare, data adapter, schema, providers, or Free/Public.
