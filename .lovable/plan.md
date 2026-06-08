## Plan — Legacy-aware "Publicações na amostra" row

### Problem (recap)
Primary uses `sample.analyzedPosts.length` (pinned excluded → 11). Legacy competitor snapshots without `competitors[i].posts[]` fall back to `content_summary.posts_analyzed` (pinned included → 12). Same label "Publicações analisadas" makes the comparison look unfair.

### Approach
UI-only compatibility patch in **`competitor-overview-compare.tsx`** + a tiny prop addition wired from **`report-overview-block.tsx`**. No adapter logic changes, no schema, no providers.

### Changes

**1. `src/components/report-redesign/v2/overview/competitor-overview-compare.tsx`**
- Add optional `postsInSample?: number` to `PrimarySide` (raw count including pinned, i.e. `sample.analyzedPosts.length + sample.pinnedPostsExcluded`).
- In `buildRows`, when `competitor.postsAnalyzedFromLegacyFallback === true`:
  - Use label **"Publicações na amostra"** instead of "Publicações analisadas".
  - Use `primary.postsInSample ?? primary.postsAnalyzed` for the primary value (so both sides include pinned → symmetric legacy comparison).
  - Tag the row with `isLegacyFallback: true`.
- When the flag is false: keep existing behaviour (label "Publicações analisadas", strict `postsAnalyzed`, current tooltip logic).
- Render a small muted footnote **inside the card** (below the grid) when any row is legacy:
  > "Amostra legada: algumas métricas excluem publicações fixadas."
  Use `.text-content-tertiary text-xs mt-4` (tokens, no slate-*).
- Remove the asymmetric tooltip path for the legacy case (no longer needed — label change communicates it). Keep the ±2 delta tooltip only when **not** legacy.

**2. `src/components/report-redesign/v2/report-overview-block.tsx`**
- Pass `postsInSample: (sample?.analyzedPosts.length ?? 0) + (sample?.pinnedPostsExcluded ?? 0)` to `<CompetitorOverviewCompare primary={{ … }} />`.
- No other change.

### What is NOT changed
- `snapshot-to-report-data.ts` adapter logic and the `postsAnalyzedFromLegacyFallback` flag (already in place from the previous PR).
- Engagement / likes / comments / cadence rows — untouched.
- Free / Public / non-competitor flows — `CompetitorOverviewCompare` only mounts when `firstCompetitor` exists in `mode === "all"`.
- No Apify / provider / schema / credit / payment / entitlement changes.

### Validation
- `/admin/report-preview/nunomarkl?variant=pro_preview`:
  - Row reads **"Publicações na amostra"**.
  - Primary 12 vs competitor 12 (or whatever raw counts agree).
  - Footnote visible once.
- Any current snapshot with `competitors[i].posts[]` present → flag is `false`, label stays **"Publicações analisadas"**, strict 11-vs-N comparison, no footnote.
- Reports without a competitor render unchanged.
- `bunx tsc --noEmit` — typecheck passes (will rely on automated build check).

### Files changed
- `src/components/report-redesign/v2/overview/competitor-overview-compare.tsx`
- `src/components/report-redesign/v2/report-overview-block.tsx`