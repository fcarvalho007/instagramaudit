# Plan — Cadence comparison card: sample strip + stronger evidence

## Audit

- Component: `src/components/report-redesign/v2/competitor-cadence-compare.tsx` — today renders only `CompareStatBlock` (primary `postingFrequencyWeekly` vs `competitor.estimatedPostsPerWeek`) + a one-line footer verdict.
- Primary thumbnails available in-page: `payload.posts` → already passed into `buildBlock01Sample(payload?.posts)` in `report-overview-block.tsx` (`sample.analyzedPosts`, SnapshotPost). Each post carries `thumbnail_storage_url`, `thumbnail_url`, `taken_at_timestamp`, `permalink`. Use existing `pickThumbnailUrl()` from `src/lib/report/pick-thumbnail.ts`.
- Competitor thumbnails available in-page: `firstCompetitor.posts: unknown[]` (Phase 2B persisted per-post detail) — defensive parse. Same field names possible: `thumbnail_url` / `thumbnail_storage_url` / `taken_at_timestamp` / `permalink`. Older snapshots (or the mock) may have an empty array → strip simply not rendered.
- Constraint: no new fetches, no provider calls, no schema/backend changes — we only render what's already in the snapshot.

## What changes

### 1. Pass primary recent posts into the card
In `report-overview-block.tsx`, derive a small `primaryRecentPosts` array from `sample.analyzedPosts` (sort by `taken_at_timestamp` desc, take 5, map to `{ thumbUrl, permalink, takenAt }`). Pass it as a new optional prop on `CompetitorCadenceCompare`.

### 2. Extend `CompetitorCadenceCompare` props
```ts
interface SamplePost {
  thumbUrl: string | null;
  permalink: string | null;
  takenAt: number | null; // unix seconds
}
interface Props {
  primary: PrimarySide;
  competitor: ReportCompetitorBreakdownEntry;
  primaryRecentPosts?: SamplePost[];      // NEW
  /** When true (default), parse competitor.posts in-card to extract a strip. */
  showSampleStrips?: boolean;             // default true
}
```

### 3. Competitor strip extraction (in-card, defensive)
Helper `extractRecentPosts(competitor.posts, max = 5)`:
- Accept items that are non-null objects.
- Pick `thumbUrl = pickThumbnailUrl(item)`; `permalink = item.permalink || item.shortcode_url || null`; `takenAt = number(item.taken_at_timestamp || item.takenAt || item.taken_at) || null`.
- Sort by `takenAt` desc, fallback to input order when missing.
- Slice `max`.

### 4. Sample strip UI (per side)
Render below the existing stat block, only on sides that have ≥ 1 post:

```
Layout (md+):                       Layout (≤sm):
┌───────────┬───────────┐           ┌───────────┐
│  primary  │ competitor│           │  primary  │
│  strip    │   strip   │           ├───────────┤
└───────────┴───────────┘           │ competitor│
                                    └───────────┘
```

Each strip:
- Eyebrow: `@handle` in side color (`text-accent-primary` for primary, `text-compare-competitor` for competitor) + `text-eyebrow-sm`.
- Horizontal row of 3–5 square thumbnails (`aspect-square w-16 sm:w-20 rounded-lg overflow-hidden`).
- Per-thumbnail border tinted by side: `border border-accent-primary/15` (primary) / `border border-compare-competitor/15` (competitor).
- Render as `<a href={permalink} target="_blank" rel="noreferrer">` when `permalink` exists; otherwise plain `<div>`.
- Inside: `<img loading="lazy" decoding="async" onError={...}>` with the picked URL.
- **Fallback path (no broken-image icon ever):** local `state = "ok" | "failed"`; if no `thumbUrl` or `onError` fires → render a clean placeholder `<div class="size-full bg-surface-muted flex items-center justify-center"><ImageIcon class="size-4 text-content-tertiary/60" /></div>`. Use lucide `Image` icon.
- Mobile rule: side strips stack vertically; thumbnails stay in a single row of ≤5 with `flex gap-2` — no horizontal scroller. Force `aspect-square w-[18%]` at `<sm` to fit 5 across 375px minus padding.
- Accessibility: `alt=""` for decorative thumbnails (cadence evidence, not editorial); strip wrapper labelled `aria-label="Amostra recente de @handle"`.

### 5. Methodology line
Single line below the strips, `text-xs text-content-tertiary`:
- *"Amostra: últimas {N} publicações disponíveis."* where `N = max(primaryStripCount, competitorStripCount, 0)` capped at 12. If both strips empty, falls back to *"Amostra com base nas últimas publicações disponíveis."*.

### 6. Deterministic insight (replaces the current footer line)
Keep `footer={...}` on `CompareCardShell`. Pure helper `buildCadenceInsight(p, c, sampleSizes)`:

- Define `weekly = postingFrequencyWeekly`, `cWeekly = estimatedPostsPerWeek`.
- **Sample-too-small guard:** if `min(primaryStripCount, competitorStripCount) < 3` AND both posts arrays are empty → render the existing one-line verdict (current behaviour, no scale claim).
- Otherwise:
  - `ratio = weekly / cWeekly`
  - `weeklyDelta = (weekly - cWeekly)`
  - Bucket:
    - `0.9 ≤ ratio ≤ 1.1` → *"Os dois perfis publicam com ritmo semelhante (≈ {avg} pub./semana)."*
    - `1.1 < ratio ≤ 1.5` → *"Este perfil publica mais ({weekly} vs {cWeekly} pub./semana)."*
    - `ratio > 1.5` → *"Este perfil publica com uma cadência claramente superior ({weekly} vs {cWeekly} pub./semana)."*
    - `0.66 ≤ ratio < 0.9` → competitor mirror of `1.1 < … ≤ 1.5`.
    - `ratio < 0.66` → competitor mirror of `> 1.5`.
- Numbers formatted via existing `fmtDecimal(n, 1)`.

### 7. Color convention
Keep entire card on the existing convention: primary blue (`accent-primary`), competitor indigo (`compare-competitor`). Borders/eyebrows/badges use side-tinted variants; numeric values inherit current `CompareStatBlock` styling (no change there).

### 8. No regressions
- `FrequencyCard` (no-competitor branch) untouched.
- Free/Public modes untouched (this card only mounts in `all`/`locked` with a competitor).
- No new dependencies. No network requests. No fetches.

## Files touched

1. `src/components/report-redesign/v2/competitor-cadence-compare.tsx` — extend props, add `extractRecentPosts`, `SampleStrip`, `Thumb`, `buildCadenceInsight`. Reuse `pickThumbnailUrl`. Import `Image` from `lucide-react`.
2. `src/components/report-redesign/v2/report-overview-block.tsx` — at the cadence mount site, derive `primaryRecentPosts` from `sample?.analyzedPosts` and pass it. No other call-site changes.

## Constraints respected

- No AI, no provider calls, no schema/backend changes, no new fetches.
- Only existing snapshot fields used (`payload.posts` for primary, `competitor.posts` for competitor).
- Broken / blocked thumbnails fall back to a clean media placeholder (no broken-image icon).
- Tokens only — `accent-primary`, `compare-competitor`, `surface-muted`, `content-*`, `border-default`.
- Public-UI font rule respected (Inter for numbers/labels, no JetBrains Mono, no Fraunces on body copy).
- Mobile: side strips stack; thumbnails ≤5 in a row without horizontal scroll.

## Validation

- `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` — cadence card shows the existing stat block, two side strips (when thumbnails exist), the methodology line, and the deterministic insight in the footer.
- Force a thumbnail `404` (DevTools block) — placeholder renders, never a broken-image icon.
- Snapshot with empty `competitor.posts` — only the primary strip shows; methodology line still renders; insight uses sample-too-small guard if `primary` strip also empty.
- 375px — strips stack, all 5 thumbnails fit in a row, no horizontal scroll.
- `/admin/report-preview/frederico.m.carvalho` (no competitor) — unchanged (still `FrequencyCard`).
