## Goal

When `competitorBreakdown[0]` exists in **Pro mode (`all`)**, render Overview / Engagement / Cadence as comparison-aware cards instead of *original card + appended compare block*. No data, schema, provider, credit, payment, entitlement or Free/Public changes.

## Current state (after audit)

In `src/components/report-redesign/v2/report-overview-block.tsx`:

- **Overview** — `EditorialIdentityCard` (always) + `CompetitorOverviewCompare` (grid with 6 rows: Seguidores, Posts analisados, ER, Likes, Comments, Posts/semana) + `CompetitorBioCompare`.
- **Engagement** — `EngagementCardRefined` (single-profile) **then** `CompetitorEngagementCompare` appended below (ER + likes + comments + verdict).
- **Cadence** — `FrequencyCard` (calendar + posts/week) **then** `CompetitorCadenceCompare` appended below (posts/week).

Result: same KPI shown twice per card, ER appears 3× across the block (Overview grid, Engagement card, Engagement compare).

## Target behaviour

| Card | No competitor | With 1 competitor |
|---|---|---|
| Identity Card | unchanged | unchanged (identity ≠ KPI compare) |
| Overview compare (KPI grid) | not rendered | trimmed to **identity rows only**: Seguidores, Publicações analisadas |
| Bio compare | not rendered | unchanged |
| Engagement | `EngagementCardRefined` | `CompetitorEngagementCompare` **in place of** the single-profile card |
| Cadence/Frequência | `FrequencyCard` | `CompetitorCadenceCompare` **in place of** `FrequencyCard` |

This collapses the duplication: each metric appears once, in the comparison-aware version. The comparison block becomes the card, not a sibling below it.

The `windowAligned === false` hint already lives inside the compare blocks (subtle, single line) — preserved.

## Edits (single file)

**`src/components/report-redesign/v2/report-overview-block.tsx`** — only conditional render orchestration changes; no new components, no signature changes.

1. **Overview KPI grid** (lines 266–279) — pass a `scope="identity"` flag (or trim inline) so `CompetitorOverviewCompare` only emits Seguidores + Publicações analisadas rows. → Implemented as a new `scope?: "identity" | "all"` prop on `CompetitorOverviewCompare` defaulting to `"all"` (back-compat). In the block we pass `scope="identity"`.

2. **Engagement** (lines 370–385) — replace:
   ```text
   <EngagementCardRefined/>
   {firstCompetitor ? <CompetitorEngagementCompare/> : null}
   ```
   with:
   ```text
   firstCompetitor
     ? <CompetitorEngagementCompare/>
     : <EngagementCardRefined/>
   ```

3. **Cadence** (lines 389–411) — replace:
   ```text
   <FrequencyCard/>
   {firstCompetitor ? <CompetitorCadenceCompare/> : null}
   ```
   with:
   ```text
   firstCompetitor
     ? <CompetitorCadenceCompare/>
     : <FrequencyCard/>
   ```

**`src/components/report-redesign/v2/overview/competitor-overview-compare.tsx`** — add `scope?: "identity" | "all"` prop. When `"identity"`, `buildRows` returns only Seguidores + Publicações analisadas. Default `"all"` keeps existing callers (none today besides the block) unchanged.

## Out of scope (untouched)

- `FormatCard`, `PostComparisonBlock`, `EditorialIdentityCard`, `MethodologyLine`, `CompetitorBioCompare`, `ReportCompetitors` legacy gauge.
- Free / `free_with_engagement` / `locked` modes other than what is required to keep the conditional inside `all`/`locked` paths working — the existing rendering of Engagement/Cadence under `mode === "locked"` is unchanged structurally but inherits the new `firstCompetitor ? compare : card` switch.
- Multi-competitor (Fase 1.5), Add Competitor flow, providers, credits, EuPago, checkout, entitlements, snapshot schema, Apify, OpenAI, DataForSEO.
- `CompetitorEngagementCompare` / `CompetitorCadenceCompare` internals (already use `CompareStatBlock` + `vs` semantics + delta verdict).

## Risks

- **`EngagementCardRefined` carries extra UI** (benchmark chart, methodology hint). Replacing it removes that visualization when a competitor exists. Mitigation: acceptable per goal ("comparison should be visually central, no duplicated metric"). If user later wants benchmark chart preserved, we add a second phase to inject it inside the compare card.
- **`FrequencyCard` carries calendar/timeline**. Same trade-off; the calendar disappears in comparison mode. Documented; reversible in a follow-up by composing the calendar inside `CompetitorCadenceCompare`.
- **No new files**, no new exports, no new tests required for typecheck — risk of typecheck regression is minimal.

## Validation checklist

1. `nunomarkl` (has competitor) → Engagement/Cadence show compare cards only, no duplicated single-profile card above; Overview compare grid shows only Seguidores + Publicações analisadas.
2. `frederico.m.carvalho` (no competitor) → identical to today.
3. Free / `free_with_engagement` modes → identical to today (no `firstCompetitor` branch triggered).
4. 375px viewport → no horizontal overflow (compare blocks already use `grid-cols-1` mobile-first).
5. `bun tsc --noEmit` (executed automatically) → passes.
6. No provider calls on render (pure read from `result.data.competitorBreakdown`).

## Output after build

- Files changed: 2 (`report-overview-block.tsx`, `overview/competitor-overview-compare.tsx`).
- Before/after summary in chat.
- Confirmation that compare blocks replace, not append.
