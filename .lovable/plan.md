# Plan — Refine Cadência semanal (competitor) card

Scope: presentation-only edits to `src/components/report-redesign/v2/competitor-cadence-compare.tsx`. No backend, no provider calls, no adapter changes, no other components touched. Callsite (`report-overview-block.tsx`) and props contract unchanged.

## Goals
Make the sample/evidence visual and intentional even when thumbnails are missing, strengthen the methodology line, and keep the deterministic cadence reading.

## Changes

### 1. Dual evidence strip — always rendered
- Render the strip block whenever the card itself renders (it already requires both cadence values). Two columns side-by-side: primary (blue eyebrow) and competitor (indigo eyebrow).
- Each side shows up to 5 tiles. When no real thumbs exist for that side, fill 5 intentional placeholder tiles (`CompareThumbPlaceholder`) instead of hiding the side.
- A small "Miniaturas indisponíveis nesta amostra." caption appears under any side whose tiles are all placeholders. The card never looks broken or half-rendered.
- Remove the separate `MissingStrip` block — placeholders carry the message inline so both sides keep equal visual weight.

### 2. Stronger thumbnail row
- Bump tile size: `aspect-square w-full` inside a `grid grid-cols-5 gap-2 sm:gap-2.5`. Mobile wraps inside the card (5 cols stay readable at 375px because each tile is small but uniform). No horizontal scroll.
- Tile chrome: rounded-lg, side-tinted hairline border, soft shadow on hover when there's a permalink.
- Side header: eyebrow + `@handle` on one line, plus a small monochrome count "5 mais recentes" / "Sem amostra disponível" on the right.

### 3. Methodology line — clearer & deterministic
- Use the smaller of the two real-thumb counts when both have real thumbs; otherwise the larger; otherwise fall back to the strip cap (5).
- Copy:
  - With real thumbs: `Amostra: últimas {N} publicações disponíveis.`
  - Both sides placeholder-only: `Amostra recente indisponível nesta análise.` + the per-side caption already shown above.
  - When competitor has posts but thumbs are blocked (existing `competitor.hasPosts === true && competitorStrip.length === 0`): append the existing "Miniaturas do concorrente indisponíveis (links de CDN expirados)." note.
- Render as a single `text-sm text-content-secondary` line under the strip (slight bump from current `text-content-tertiary` for readability).

### 4. Visual hierarchy
- Keep `CompareCardShell` title/subtitle ("Cadência semanal" / "Publicações por semana") — already large.
- Keep `CompareStatBlock variant="bare"` for the two big weekly values (blue / indigo), `higherIsBetter`.
- Add a small section eyebrow above the strip grid: "Amostra recente" (Inter uppercase).

### 5. Deterministic interpretation
- Keep `buildCadenceInsight` as is — already returns the correct ladder (similar / slight / clear advantage either side).
- Add a "sample too small" guard: when BOTH real-thumb counts are 0 AND the ratio is between 0.9 and 1.1, prefer the cautious "Os dois perfis têm uma cadência semelhante." (already covered, just re-verify with a comment).
- Passed to `CompareCardShell` `footer` as today.

### 6. Mobile
- 5-col grid wraps within the card; no element exceeds the card padding.
- Side labels truncate; no horizontal page overflow.

## Out of scope
- `CompareCardShell`, `CompareStatBlock`, `CompareThumbPlaceholder` internals.
- `report-overview-block.tsx`, adapter, snapshot fetching, backend, providers, schema, credits.

## Validation
- `nunomarkl` preview: dual strip visible. Real primary thumbs when present. Competitor side renders 5 placeholder tiles with "Miniaturas indisponíveis nesta amostra." caption — looks intentional, not broken.
- Profile with real thumbs on both sides: real tiles render, methodology line shows correct N.
- 375px mobile: strip wraps inside card, no horizontal overflow.
- Cadence reading still names who publishes more and avoids overclaiming when both samples are empty.
- Typecheck passes.
