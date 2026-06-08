## Phase 2 Visual Refinement — Mix de formatos + Ritmo por dia da semana

### Gap

Current Phase 2 renders `CompareBarPair` directly. That primitive is a small `surface-secondary` block with a tertiary eyebrow label and an 8rem left column for the category name — fine as a sub-block, wrong as a top-level report card. The approved reference shows:

- White editorial card shell (`rounded-2xl border bg-surface-primary shadow-card p-5 sm:p-6`)
- Fraunces title (`font-serif text-xl sm:text-2xl`)
- Per row: small category label ABOVE the two stacked bars, not to the left
- Two bars per row (primary blue, competitor indigo) with right-aligned % / count
- Deterministic insight footer in a tinted box, only when the gap is meaningful
- Neutral hint chip "Concorrente em janela baseline." when applicable

This matches the engagement card refinement (CompareStatBlock has `variant="card" | "bare"`) — same pattern.

### Files to edit

#### 1. `src/components/report-redesign/v2/compare/compare-bar-pair.tsx`

Add a `variant?: "card" | "bare"` prop (default `"card"`, back-compat).

- `"card"` — current behaviour untouched (any other call site keeps working).
- `"bare"` — strip the outer `<section>` shell, eyebrow, and hint line (parent renders Fraunces title + hint). Keep the legend + bars. Switch the per-row layout to "label above, bars below" (single column always) so labels sit above bars at every breakpoint, matching the reference. Bars stay 8px tall, right-aligned numeric value w-14 tabular-nums.

No change to math, sorting, accents, or the legend dots.

#### 2. `src/components/report-redesign/v2/competitor-format-compare.tsx`

Replace the bare `<CompareBarPair>` return with the editorial card shell:

```text
<section class="rounded-2xl border border-border-default bg-surface-primary shadow-card p-5 sm:p-6">
  <header>
    <h3 class="font-serif text-xl sm:text-2xl ...">Mix de formatos</h3>
    {windowAligned === false ? <chip>Concorrente em janela baseline.</chip> : null}
  </header>
  <CompareBarPair variant="bare" ... />
  <InsightFooter />   {/* only when deterministic + meaningful */}
</section>
```

`InsightFooter` is a small local helper inside the file (no new primitive). Logic:
- Compute the absolute gap on the **dominant primary format** (the category with the highest primary share).
- If `|primary - competitor| < 10 pp` → no footer (don't invent an insight).
- Else render in pt-PT, exactly one of:
  - `"O concorrente investe muito mais em ${formatLabel} — ${comp}% contra os teus ${prim}%. Pode explicar parte da diferença de envolvimento."` when competitor > primary by ≥10 pp on its own dominant format.
  - `"Este perfil investe mais em ${formatLabel} (${prim}% vs ${comp}%)."` when primary > competitor by ≥10 pp on the primary dominant.
- No "x%" type comparisons, no engagement claims when ER unknown, no superlatives.

Footer styling: `rounded-xl border border-border-subtle bg-surface-muted px-4 py-3 text-sm text-content-secondary leading-relaxed mt-4`.

#### 3. `src/components/report-redesign/v2/competitor-weekday-compare.tsx`

Same shell refactor:

- Wrap in the editorial card shell with Fraunces title `"Ritmo por dia da semana"`.
- Use `variant="bare"` on `CompareBarPair`.
- Move the baseline hint to the card header as a chip (instead of into `CompareBarPair`'s hint slot).
- Add a deterministic insight footer:
  - Find each side's peak weekday by ISO index.
  - If both peaks fall on the same day → `"Os dois perfis concentram publicações em ${day}."`
  - Else → `"Tu publicas mais em ${primaryPeak}; o concorrente em ${competitorPeak}."`
  - Skip the footer entirely when `totalPrimary < 3 || totalCompetitor < 3` (sample too small to claim a pattern).

#### 4. Tiny shared piece (optional)

A small `<HintChip>` component is repeated twice. Since it's 4 lines, I'll inline it in both wrappers rather than create a new file — keeps surface area minimal.

### Files NOT touched

- `report-overview-block.tsx` — wiring already correct from Phase 2 v1.
- `snapshot-to-report-data.ts` / `weekday-iso.ts` / `format-keys.ts` — data path unchanged.
- `report-mock-data.ts` — no shape change.
- Single-profile branches (`FormatCard`, `FrequencyCard`) — untouched.
- Free / Public / no-competitor paths — untouched.
- Engagement / cadence Phase 1 compare components — untouched.
- Apify, OpenAI, DataForSEO, schema, credits, payments, entitlements, checkout, Add Competitor flow, PR1 backend — out of scope.

### Validation

1. `bun tsc --noEmit` passes.
2. Vitest: existing `weekday-iso.test.ts` still passes.
3. Visual: `/admin/report-preview/nunomarkl?variant=pro_preview` → Mix de formatos + Ritmo cards now render in the white editorial shell with Fraunces titles, label-above-bars rows, blue/indigo paired bars, and the deterministic insight footer (when the threshold is crossed).
4. `frederico.m.carvalho` (no competitor) → still original `FormatCard` + `FrequencyCard`.
5. Free/Public report → unchanged (the swap lives inside `mode === "all" || mode === "locked"` with `firstCompetitor` ternary).
6. 375px viewport → single-column rows, no horizontal scroll (the new bare layout removes the desktop 8rem fixed column entirely).
7. No new fetches at render — components read from already-derived `formatEntries`, `payload.posts`, and `competitor.*`.
