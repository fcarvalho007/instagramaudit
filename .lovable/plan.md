## Audit: "Publicações analisadas" — 11 vs 12 discrepancy

### How the metric is computed (both sides)

**Primary profile** — `src/lib/report/snapshot-to-report-data.ts:1171–1180`
```
if (sample.performancePosts.length > 0) {
  keyMetrics.postsAnalyzed = sample.analyzedPosts.length;
}
```
`sample` comes from `buildBlock01Sample(payload.posts)` (line 1161).
`analyzedPosts = posts.filter(p => p.is_pinned !== true)` — pinned excluded
(with a fallback to the full set only when 100% are pinned).
Falls back to `content_summary.posts_analyzed` only when there are no usable posts.

**Competitor** — same file, `competitorBreakdown` mapper at lines 1315–1333
```
const cPostsRaw = Array.isArray(c.posts) ? c.posts : [];
const cSample   = cPostsRaw.length > 0 ? buildBlock01Sample(cPostsRaw) : null;
const cAnalyzed = cSample?.analyzedPosts ?? [];
postsAnalyzed:
  cAnalyzed.length > 0 ? cAnalyzed.length : num(s.posts_analyzed, 0);
```
Symmetric path **when `competitor.posts[]` is present** — both sides go through
the same `buildBlock01Sample` helper, so the pinned-exclusion rule is applied
identically.
Asymmetric path **when `competitor.posts[]` is missing**: it falls back to
`content_summary.posts_analyzed`, which is the **raw count** computed upstream
by the snapshot job and **does not exclude pinned posts**.

### Pinned-post handling check
Both sides call the same `buildBlock01Sample`. There is no per-side override.
No code path strips pinned for primary and keeps it for competitor when both
go through `sample.analyzedPosts.length`.

### Why 11 vs 12 happens — three possible causes

1. **Legacy competitor snapshot (most likely root cause).**
   The competitor object in `payload.competitors[i]` has no `posts[]` array.
   The fallback `num(s.posts_analyzed, 0)` returns 12, the raw cap before
   pinned filtering. Primary, with `posts[]` present, has 1 pinned post
   removed → 11. This matches the symptom exactly.

2. **Competitor has `posts[]` but zero pinned posts.**
   Both sides ran through `buildBlock01Sample`; primary lost 1 to pinned,
   competitor lost 0 → 11 vs 12. This is **methodologically correct**: the
   denominators reflect the real non-pinned post count of each profile. The
   UI just isn't telling the user why.

3. **Real logic inconsistency** — none found in code review.
   Both sides use the same helper with the same rules.

### How to tell (1) from (2) without rescraping
Inspect the most recent `analysis_snapshots.normalized_payload`:
```sql
SELECT
  jsonb_array_length(normalized_payload->'posts') AS primary_posts,
  jsonb_array_length(normalized_payload->'competitors'->0->'posts')
    AS competitor_posts,
  normalized_payload->'competitors'->0->'content_summary'->>'posts_analyzed'
    AS competitor_cs_posts,
  (SELECT count(*) FROM jsonb_array_elements(normalized_payload->'posts') p
    WHERE (p->>'is_pinned')::boolean) AS primary_pinned,
  (SELECT count(*) FROM jsonb_array_elements(
      normalized_payload->'competitors'->0->'posts') p
    WHERE (p->>'is_pinned')::boolean) AS competitor_pinned
FROM analysis_snapshots
WHERE id = '<snapshot_id>';
```
- `competitor_posts IS NULL` → cause **(1)** legacy fallback.
- `competitor_posts = 12 AND competitor_pinned = 0 AND primary_pinned = 1`
  → cause **(2)** methodology-correct asymmetry.

### Root cause verdict
This is a **data/labeling issue**, not a logic bug. The comparison engine is
symmetric; the asymmetry comes either from a legacy competitor snapshot
without `posts[]` (cause 1) or from a real per-profile difference in pinned
posts (cause 2). In both cases the difference of 1 is benign.

### Recommended fix (no provider, no rescrape)

**A. Honest denominator (always safe).** In the competitor fallback branch,
subtract pinned posts from the legacy `content_summary.posts_analyzed` when
the snapshot exposes `content_summary.pinned_posts_count` (or the equivalent).
If not available, keep the current fallback but flag it.

**B. UI transparency (recommended now).** In `CompetitorOverviewCompare`, when
`competitor.postsAnalyzed !== primary.postsAnalyzed` and the delta is ≤ 2,
render a small footnote / `title` tooltip on the row:
> "Pinned posts são excluídos quando o snapshot do concorrente os identifica;
> snapshots legados podem incluí-los."

**C. Optional belt-and-suspenders.** Extend the competitor breakdown mapper so
that when `cPostsRaw.length === 0` and `s.posts_analyzed > 0`, we mark the row
as `windowAligned: false` (the existing "Concorrente em janela baseline" chip
already covers this idea) — this surfaces the legacy-snapshot caveat without
inventing new chrome.

### Return summary
- **Exact root cause:** the competitor's `postsAnalyzed` falls back to the raw
  `content_summary.posts_analyzed` when the snapshot does not embed
  `competitors[i].posts[]`, bypassing the pinned-post filter that the primary
  always goes through.
- **Data vs UI:** data-shape issue (legacy snapshot) surfaced as a silent UI
  inconsistency. No logic bug in the renderer.
- **Recommended next implementation prompt:**
  > "In `snapshot-to-report-data.ts` competitor breakdown mapper, when the
  > legacy fallback to `content_summary.posts_analyzed` is used, expose
  > a boolean (e.g. `postsAnalyzedFromLegacyFallback`) on the competitor
  > entry. In `CompetitorOverviewCompare`, render a discreet info tooltip
  > on the 'Publicações analisadas' row when this flag is true OR when the
  > delta vs primary is ≤ 2, explaining that pinned posts may not be
  > excluded on legacy competitor snapshots. No provider changes, no
  > rescraping, no schema changes."