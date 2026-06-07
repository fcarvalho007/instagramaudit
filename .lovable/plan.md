# Phase 2 — Profile vs Competitor (Format Mix + Weekday Rhythm)

## Scope

Add comparison-mode versions of two distribution cards that conditionally replace the single-profile cards when `firstCompetitor` exists, mirroring the Phase 1 ternary pattern. Both use the existing `CompareBarPair` primitive.

## Files to create

### 1. `src/lib/report/weekday-iso.ts` (new util)
Tiny pure helper to remap UTC weekday counts (0=Sun..6=Sat — the shape `analyze-public-v1.ts:1131-1136` produces) to ISO weekday counts (Mon=0..Sun=6 — the shape `FrequencyCard.aggregateByWeekday` uses, so visual alignment is guaranteed).

```ts
export function remapUtcCountsToIso(utc: number[]): number[] {
  // utc[0]=Sun → iso[6]; utc[1..6]=Mon..Sat → iso[0..5]
  const iso = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 7 && i < utc.length; i++) {
    const value = Number.isFinite(utc[i]) ? Math.max(0, Math.floor(utc[i])) : 0;
    const isoIndex = i === 0 ? 6 : i - 1;
    iso[isoIndex] = value;
  }
  return iso;
}
```

### 2. `src/lib/report/__tests__/weekday-iso.test.ts` (new test)
- `[1,2,3,4,5,6,7]` (Sun=1..Sat=7) → `[2,3,4,5,6,7,1]` (Mon..Sun).
- All-zeros stays all-zeros.
- Missing/short arrays default missing slots to 0.
- Negatives / NaN clamped to 0.

### 3. `src/components/report-redesign/v2/competitor-format-compare.tsx` (new)
Comparison-mode replacement for `FormatCard` when a competitor exists. Renders:
- A short caption (peak format on each side) above the bars (keeps the editorial framing the single-profile card has).
- A single `CompareBarPair` with 3 categories: Reels, Carousels, Imagens. Unit `percent`. Per-row `primaryFormatted`/`competitorFormatted` strings show the share with one decimal pt-PT (e.g. `41,7 %`) and the count in parentheses if it fits.
- The competitor baseline hint (`"Concorrente em janela baseline."`) when `competitor.windowAligned === false`, matching the Phase 1 cards.

Primary input is the already-computed `formatEntries: FormatEntry[]` from `report-overview-block.tsx:191` — no recomputation. Competitor input is `competitor.formatStats` normalised via the same `normaliseFormatKey` helper that lives in `report-overview-block.tsx:106` (I will export it via the comparison file's local copy or move it to a small shared util — see "Decision" below). Categories with both sides at 0 are dropped so the card stays honest.

Renders `null` and lets the parent fall back if `competitor.formatStats` is missing or every key is 0/null.

### 4. `src/components/report-redesign/v2/competitor-weekday-compare.tsx` (new)
Comparison-mode replacement for the `WeeklyRhythmChart` subsection of the cadence/frequency card when a competitor exists. Phase 1 already replaced the full `FrequencyCard` with `CompetitorCadenceCompare` (a single-number "Cadência semanal" stat), so the weekday distribution chart was dropped — Phase 2 re-introduces the weekday distribution on the comparison side as a stacked second block below the cadence stat.

Renders:
- 7 categories Seg / Ter / Qua / Qui / Sex / Sáb / Dom (uses `report.weekday_short`/`weekday_long` from `i18n/locales/pt/report.json:364`).
- Per row: primary count vs competitor count via `CompareBarPair` (unit `abs`). `primaryFormatted` / `competitorFormatted` show the absolute count.
- Same baseline hint when `competitor.windowAligned === false`.

Primary input: derive a 7-slot ISO array from `sample.analyzedPosts` (pinned excluded — Block 1 canonical sample, already in scope in `report-overview-block.tsx:131-135`) using `post.weekday` (UTC, 0=Sun..6=Sat) → ISO via `remapUtcCountsToIso`. Falls back to aggregating `enriched.postingTimeline` the way `frequency-card.aggregateByWeekday` does if `sample` is null.

Competitor input: `competitor.weekdayCountsIso` (new adapter field, see file 5).

Returns `null` if both sides sum to 0.

### 5. Adapter — `src/lib/report/snapshot-to-report-data.ts`
- Import the new `remapUtcCountsToIso` helper.
- In the `competitorBreakdown` builder (around line 1369), keep the existing raw `weekdayCounts` (back-compat) and add `weekdayCountsIso: remapUtcCountsToIso(weekdayCounts)` next to it.

### 6. Type — `src/components/report/report-mock-data.ts`
Add `weekdayCountsIso?: number[]` to `ReportCompetitorBreakdownEntry` (sibling of the existing optional `weekdayCounts?: number[]` at line 46). Update the in-file mock (line 398) with a deterministic ISO-remapped copy of its current `weekdayCounts` so the example snapshot renders.

## Files to edit (wiring)

### `src/components/report-redesign/v2/report-overview-block.tsx`
Two surgical edits — same conditional-replacement pattern Phase 1 already uses:

1. Around line 399 (inside the `#frequencia` block, after the existing `<CompetitorCadenceCompare … />`): stack the new `<CompetitorWeekdayCompare … />` below it when `firstCompetitor` exists. (Single-profile branch — the `FrequencyCard` else — is untouched.)
2. Around line 412 (the `#formatos` block): wrap the existing `<FormatCard … />` in `firstCompetitor ? <CompetitorFormatCompare … /> : <FormatCard … />`.

Both new components receive the existing primary props (`formatEntries`, `payload`, `primaryHandle`, `sample`) — no new derived state in the block.

### Decision on the `normaliseFormatKey` helper
Two options, both safe:
- (a) Move `normaliseFormatKey` from `report-overview-block.tsx:106` to `src/lib/report/format-keys.ts` and import from both files.
- (b) Duplicate the 6-line function inside `competitor-format-compare.tsx`.

I'll go with (a) — single line of truth, zero behavioural risk, and the helper is already pure.

## Out of scope (per the brief)

- No Apify / OpenAI / DataForSEO calls.
- No schema changes (the `weekday_counts` field already lives in the snapshot; we only remap downstream).
- No payments / credits / entitlements / checkout / Add Competitor flow / multi-competitor UI.
- No edits to `EngagementCardRefined`, `FrequencyCard`, `FormatCard`, `EditorialIdentityCard` or any of the Phase 1 compare components.
- Free / `free_with_engagement` / no-competitor branches remain untouched (the new ternaries live inside `mode === "all" || mode === "locked"` and trigger only when `firstCompetitor` is present).

## Validation

1. `/admin/report-preview/nunomarkl?variant=pro_preview` — `#formatos` shows paired Reels/Carousels/Imagens bars (blue vs indigo). `#frequencia` shows the cadence stat block AND the weekday distribution paired-bars below it.
2. `/admin/report-preview/frederico.m.carvalho` (no competitor) — unchanged: original `FrequencyCard` + `FormatCard`.
3. Free / Public — unchanged (`mode !== "locked"`).
4. 375px viewport — `CompareBarPair` already collapses to `grid-cols-1` (`compare-bar-pair.tsx:58`), no new fixed widths introduced, no overflow.
5. `bun tsc --noEmit` passes.
6. `bunx vitest run src/lib/report/__tests__/weekday-iso.test.ts` passes.
7. No new network requests at render (components read from `result.data` and `payload` only).
