## Goal

Eliminate any remaining misleading zeros in Profile vs Competitor cards and make missing data look intentional, with consistent methodology copy. Use only adapter flags and snapshot data that already exists.

## Audit summary (current state)

Most of the foundation is already in place:

- `competitor-format-compare.tsx` — uses `competitor.hasFormatStats`; renders `MissingSide` instead of an empty donut. Legend rows show `—` for zero shares. Returns `null` when both sides are empty.
- `competitor-weekday-compare.tsx` — uses `competitor.hasWeekdayData`; renders a side aside when missing; suppresses competitor bars/numbers entirely instead of seven zero rows.
- `competitor-cadence-compare.tsx` — renders `CompareThumbPlaceholder` for missing/blocked thumbs and prints "Amostra: últimas N publicações disponíveis." plus a "links de CDN expirados" note when `hasPosts && competitorThumbs === 0`.
- `competitor-engagement-compare.tsx` — returns `null` when either ER is not positive (no fake 0%).
- `compare/compare-handle-row.tsx` `Avatar` — `onError` falls back to gradient initials with handle; never shows a broken circle.
- `comparison-hero.tsx`, `competitor-overview-compare.tsx` — every metric row is gated by `isPos(...)`.
- `snapshot-to-report-data.ts` — adapter sets `hasFormatStats`, `hasWeekdayData`, `hasPosts`, `postsAnalyzedFromLegacyFallback`.

## Gaps to close in this PR

### 1. Format card (`competitor-format-compare.tsx`)

- Add a methodology footer line inside the card:
  - Both sides have data → `Amostra: X publicações (@primary) · Y publicações (@competitor).`
  - Competitor missing → `Dados do concorrente indisponíveis nesta amostra.`
  - Add this regardless of whether `buildDonutInsight` returns a verdict (keep insight as separate copy).
- In `DonutSide`, change the centred "Sem dados" label so it only appears when `total === 0 && competitorHasStats === false` for the competitor side, and add a `title` on each zero legend row that reads `"0 publicações neste formato na amostra"` when `competitorHasStats === true` (true zero) vs the existing dash-only state when the field is missing.
- Keep current `MissingSide` exactly as is.

### 2. Weekday card (`competitor-weekday-compare.tsx`)

- Split the "missing" copy by reason:
  - `hasWeekdayData === false` → keep current "Sem dados suficientes do concorrente para comparar o ritmo semanal."
  - `hasWeekdayData !== false && totalCompetitor === 0` → "Sem publicações do concorrente nesta janela." (true zero, not missing).
- Refine sample line to follow the exact requested wording when applicable:
  - Always render `Amostra: últimas N publicações disponíveis.` when `sampleN > 0`.
  - Append `· Dados do concorrente indisponíveis nesta amostra.` when competitor is missing.
- No change to the seven-row chart, only to the right-hand aside copy + footer line.

### 3. Engagement card (`competitor-engagement-compare.tsx`)

- Add a small methodology line under the rail: `Amostra: X publicações (@primary) · Y publicações (@competitor).` using `primary.postsAnalyzed` (new optional prop, no schema change) and `competitor.postsAnalyzed`.
  - Caller (`report-shell-v2.tsx`) already has both numbers, pass them in.
  - If either is missing, render the line without that side rather than fabricating zero.

### 4. Cadence card (`competitor-cadence-compare.tsx`)

- Replace the current generic "Amostra recente indisponível nesta análise." with "Dados do concorrente indisponíveis nesta amostra." when `competitor.hasPosts === false`, keeping the CDN-expired note for `hasPosts === true && competitorThumbs === 0` (true block / expired URLs).

### 5. Identity / Overview (`competitor-overview-compare.tsx`, `comparison-hero.tsx`)

- No metric-row changes needed (already gated).
- In `comparison-hero.tsx`, when `methodologySampleSize` falls back to "Max" because one side is 0, suffix the sentence with `Dados do concorrente indisponíveis nesta amostra.` so it never reads as if the smaller sample were shared.

### 6. Shared empty-state primitive

- Introduce `CompareMissingDataNote` in `src/components/report-redesign/v2/compare/` to centralise the two canonical strings:
  - `Amostra: últimas {n} publicações disponíveis.`
  - `Dados do concorrente indisponíveis nesta amostra.`
- Use it in cards above so the copy never drifts.

## Out of scope

- No changes to schema, providers, credits, EuPago, checkout, Free/Public, `/report.example`.
- No new fetches; we only consume `competitor.hasPosts | hasFormatStats | hasWeekdayData | postsAnalyzed | posts`.
- No changes to KPI grid v2 or the locked identity card.
- No copy in admin or report-mock-data fixture.

## Validation

- Manual review on `nunomarkl` snapshot in preview at 375 px:
  - Format card shows `MissingSide` for competitor, methodology line "Dados do concorrente indisponíveis nesta amostra.".
  - Weekday card renders only primary bars and the missing-side aside; no row of seven competitor zeros.
  - Cadence card shows placeholder thumbs with the matching missing-data line.
  - Identity hero shows no fake 0 / 0% rows and prints the "Dados do concorrente indisponíveis…" suffix when relevant.
- `bunx vitest run` for cards under `src/components/report-redesign/v2/__tests__` (existing tests must still pass; add narrow tests for the new copy paths).
- `tsc` passes (typecheck runs automatically).
- Lighthouse on the report page unchanged; no new network requests in DevTools.
