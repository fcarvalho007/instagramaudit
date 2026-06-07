## Goal
Add a compact competitor cadence comparison to the Pro Frequency/Cadence section using the existing `competitorBreakdown` data and the new comparison primitives.

## What we build

1. **New component** `src/components/report-redesign/v2/competitor-cadence-compare.tsx`
   - Uses `CompareStatBlock` (Pattern 1 — single-number comparison) directly, no extra card wrapper.
   - Compares **primary `postingFrequencyWeekly`** vs **competitor `estimatedPostsPerWeek`**.
   - Renders `null` if either value is missing, zero, or non-finite.
   - Below the stat block, shows a deterministic insight line:
     - ratio ≥ 1.05 → "Este perfil publica com maior frequência."
     - ratio ≤ 0.95 → "O concorrente publica com maior frequência."
     - otherwise → "Os dois perfis têm uma cadência semelhante."
   - Includes `// TODO: multi-competitor layout (Fase 1.5)` comment.
   - Helper functions: `isPositive`, `fmtDecimal` (local to the file, no new utils).

2. **Edit** `src/components/report-redesign/v2/report-overview-block.tsx`
   - Import the new component.
   - In the `mode === "all" || mode === "locked"` branch, render `<CompetitorCadenceCompare>` immediately after `<FrequencyCard>` (still inside the `#frequencia` wrapper or as a sibling before `#formatos`).
   - Pass primary side: `{ handle: primaryHandle, postingFrequencyWeekly: k.postingFrequencyWeekly }`.
   - Pass competitor side: `firstCompetitor`.
   - Only renders when `firstCompetitor` exists and has a usable `estimatedPostsPerWeek`.

## What we do NOT touch

- `FrequencyCard` — zero prop changes, zero internal edits.
- `FormatCard`, `EngagementCardRefined`, `EditorialIdentityCard`, `PostComparisonBlock`.
- `CompetitorOverviewCompare`, `CompetitorEngagementCompare`.
- Adapter, backend, snapshot generation, Apify.
- Free/Public report paths — `firstCompetitor` is only derived in Pro branches.
- Payments, checkout, EuPago, credits, entitlements, schema, pricing.
- Day-of-week distribution — not compared (data not persisted for competitors).
- Mock data shape.

## Validation checklist

1. Pro without competitor: Frequency section renders identically to today.
2. Pro with one competitor: a compact `CompareStatBlock` appears below the Frequency card showing posts/week for both sides, with the deterministic insight line.
3. No day-of-week comparison is shown.
4. Mobile 375px: no horizontal overflow (grid collapses to single column naturally via `sm:` breakpoints in `CompareStatBlock`).
5. Free/Public (`mode !== "all" && mode !== "locked"`): unchanged.
6. Typecheck passes (`bunx tsc --noEmit`).
7. No new provider calls, no AI calls.