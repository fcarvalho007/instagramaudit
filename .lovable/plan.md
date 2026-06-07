## Phase 2 — Distribution comparison data audit

Scope: prepare `competitorBreakdown[0]` for paired-bar cards (Mix de formatos, Ritmo por dia da semana). Read-only audit. No provider, schema, payment, credit, entitlement, Apify or DataForSEO changes.

## Data availability table

All fields below already arrive in the snapshot via `analyze-public-v1.ts:1158-1166` (Phase 2B persisted `posts`, `format_stats`, `weekday_counts`, `top_hashtags`). The adapter `snapshot-to-report-data.ts:1300-1357` already maps them onto `ReportCompetitorBreakdownEntry`.

| Phase 2 card need | Primary source | Competitor source | Available today? | Notes |
|---|---|---|---|---|
| Format mix % per format | `formatBreakdown[].sharePct` | `competitor.formatStats[fmt].share_pct` | YES | Keys aligned: both produced by `normalize.ts:612-627` → `Reels` / `Carrosséis` / `Imagens` |
| Format mix count | `formatBreakdown[].count` | `competitor.formatStats[fmt].count` | YES | Same source |
| Dominant format label | `keyMetrics.dominantFormat` | `competitor.dominantFormat` | YES | Already on entry |
| Dominant format share % | `keyMetrics.dominantFormatShare` | derivable: `competitor.formatStats[competitor.dominantFormat]?.share_pct` | DERIVABLE | Not stored explicitly on entry, easy adapter add |
| Posts per week | `keyMetrics.postingFrequencyWeekly` | `competitor.estimatedPostsPerWeek` | YES | Already used by `CompetitorCadenceCompare` |
| Weekday rhythm (7 buckets) | derived from `posts[].weekday` (UTC) → ISO Mon..Sun by `FrequencyCard` | `competitor.weekdayCounts: number[7]` | YES, but **misaligned** | See "Missing / misaligned" below |
| Peak weekday | `FrequencyCard` derives from buckets | derivable from `weekdayCounts` | DERIVABLE | Same helper, no new data |
| Avg engagement per format | `formatBreakdown[].avgEngagement` (when present) | `competitor.formatStats[fmt].avg_engagement_pct` | YES | Not yet exposed in `competitorBreakdown` type ergonomics but already on the record |

## Missing / misaligned fields

1. **Weekday index convention mismatch — must fix in adapter.**
   - Producer (`analyze-public-v1.ts:1131-1135`) builds `weekdayCounts[p.weekday]` with `p.weekday` documented as `0=Sunday … 6=Saturday (UTC)` (`enrichPosts` types).
   - Primary `FrequencyCard` consumes Mon..Sun-indexed buckets (line 137: `weekday: 0..6 where Mon=0..Sun=6`).
   - Adapter currently copies `weekday_counts` verbatim (`snapshot-to-report-data.ts:1341-1345`) — paired bars would silently misalign by 1 day.
   - **Fix:** use the existing `utcWeekdayToIso` helper (line 584) in the adapter to remap into a new field `weekdayCountsIso: number[7]` (Mon=0..Sun=6). Keep `weekdayCounts` unchanged for back-compat.

2. **Dominant format share not on entry.**
   - The number is trivially derivable client-side, but exposing it on the entry mirrors primary `keyMetrics.dominantFormatShare` and avoids cards re-implementing the lookup.
   - **Fix:** add optional `dominantFormatShare?: number` populated in adapter from `formatStats[dominantFormat]?.share_pct`.

3. **No data missing from snapshot.** Both gaps are adapter-only ergonomics. No schema migration, no new Apify field, no second scrape.

## Recommended adapter changes (smallest safe extension)

File: `src/lib/report/snapshot-to-report-data.ts` (entry builder block 1300-1357).
File: `src/components/report/report-mock-data.ts` (type only).

```ts
// report-mock-data.ts — extend ReportCompetitorBreakdownEntry
weekdayCounts?: number[];          // (existing) raw UTC Sun..Sat — keep for back-compat
weekdayCountsIso?: number[];       // NEW: ISO Mon..Sun, aligned with FrequencyCard
dominantFormatShare?: number;      // NEW: share_pct of dominantFormat in formatStats
```

```ts
// snapshot-to-report-data.ts — inside the existing entry object
const rawWeekday = Array.isArray(c.weekday_counts)
  ? (c.weekday_counts as unknown[]).map((n) => num(n, 0))
  : [];
const weekdayCountsIso =
  rawWeekday.length === 7
    ? Array.from({ length: 7 }, (_, isoIdx) => {
        // isoIdx 0=Mon..6=Sun → UTC idx 1..6,0
        const utcIdx = (isoIdx + 1) % 7;
        return rawWeekday[utcIdx] ?? 0;
      })
    : [];

// ...
weekdayCounts: rawWeekday.slice(0, 7),
weekdayCountsIso,
dominantFormatShare:
  formatStats && typeof formatStats === "object" && typeof dominantFormat === "string"
    ? num(
        (formatStats as Record<string, { share_pct?: number }>)[dominantFormat]
          ?.share_pct,
        0,
      )
    : 0,
```

Pure additive. Older snapshots fall back to empty / 0. No new provider call. No snapshot version bump required (fields are optional).

## Out of scope

- Provider calls, Apify, DataForSEO, OpenAI.
- Schema / migrations / payments / credits / entitlements / EuPago / checkout.
- Multi-competitor (Fase 1.5).
- Primary-side `FormatCard` / `FrequencyCard` internals — only consumed read-only.
- Free / `free_with_engagement` report.

## Risks

- Weekday remap **must** use the existing `utcWeekdayToIso` helper or an equivalent constant; getting it backwards inverts the chart silently. Plan to add a 4-line unit test in `snapshot-to-report-data` covering: input `[7,1,2,3,4,5,6]` (Sun=7 posts) → `weekdayCountsIso[6] === 7` (Sun is the last ISO bucket).
- `dominantFormatShare` key lookup depends on exact format string match. The normalizer uses `Reels|Carrosséis|Imagens`; adapter must not lowercase or strip accents. Document this in a JSDoc.
- Adding two optional fields cannot break consumers, but Phase 2 cards must guard against `weekdayCountsIso.length !== 7` and `formatStats == null` (Phase 0 / mock snapshots).

## Phase 2 implementation prompt (ready to send when approved)

```
Use Plan Mode then Edit Mode.

Goal:
Build the two distribution-comparison cards for Phase 2:
1. Mix de formatos (paired bars per format)
2. Ritmo por dia da semana (paired bars per weekday)

Scope:
- New component CompetitorFormatCompare using existing
  CompareBarPair primitive, fed by competitorBreakdown[0].formatStats
  vs primary formatBreakdown.
- New component CompetitorCadenceWeekdayCompare using CompareBarPair,
  fed by competitorBreakdown[0].weekdayCountsIso vs primary weekday
  buckets derived in FrequencyCard's existing helper (extract to a
  small util if needed).
- Wrap both with the white-card + Fraunces shell pattern established
  by CompareStatBlock variant="card" (or use it directly via a new
  bare variant if the bar primitive ships its own shell).
- When competitorBreakdown[0] exists in Pro mode, replace the
  single-profile FormatCard / FrequencyCard with the compare card
  (same pattern Fase 1 used for Engagement / Cadence). Otherwise
  render the original cards unchanged.

Pre-req adapter changes (do first, single migration-free PR):
- Extend ReportCompetitorBreakdownEntry with optional
  weekdayCountsIso and dominantFormatShare.
- Populate them in snapshot-to-report-data.ts using
  utcWeekdayToIso for weekday remap.
- Add unit test covering the weekday remap (Sun bucket arrives last).

Do not touch: providers, Apify, DataForSEO, OpenAI, schema, payments,
credits, entitlements, checkout, Free/Public, multi-competitor.

Validate:
- nunomarkl Pro view shows compare format bars + compare weekday
  bars instead of single-profile cards.
- frederico.m.carvalho (no competitor) unchanged.
- Free/Public unchanged.
- 375px mobile no overflow.
- bun tsc --noEmit passes.
- Weekday remap test passes.
```
