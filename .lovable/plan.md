# Audit: "Publicações analisadas" 11 (primary) vs 12 (competitor)

## 1. Exact source fields

### Primary side
`primary.postsAnalyzed` is set in `report-overview-block.tsx` from `k.postsAnalyzed`, which comes from `ReportData.keyMetrics.postsAnalyzed`. That value is **overridden** in `src/lib/report/snapshot-to-report-data.ts:1173`:

```ts
const sample = buildBlock01Sample(posts);           // line 1154
…
keyMetrics.postsAnalyzed = sample.analyzedPosts.length;  // line 1173
```

`buildBlock01Sample` (`src/lib/report/block01-sample.ts:128`) filters:
- `is_pinned === true` → **excluded**
- date outliers → pruned
Fallback: if every post is pinned, keep all (so we never return zero).

So the primary number is **non-pinned posts after Block 1 sample filtering**.

### Competitor side
`competitor.postsAnalyzed` in `competitor-overview-compare.tsx` comes from `ReportCompetitorBreakdownEntry.postsAnalyzed`, built in `snapshot-to-report-data.ts:1307`:

```ts
postsAnalyzed: num(s.posts_analyzed, 0),  // s = competitor.content_summary
```

`content_summary.posts_analyzed` is written by `src/lib/analysis/normalize.ts:200` as the **raw `posts.length`** — no pinned filter, no outlier prune. Same field that primary used to show before the Block 1 sample override.

## 2. The 11 vs 12 explained

| Side | Source | Filter | Value |
|---|---|---|---|
| Primary (@nunomarkl) | `sample.analyzedPosts.length` | pinned removed + date outliers | **11** |
| Competitor | `content_summary.posts_analyzed` | none (raw posts.length) | **12** |

@nunomarkl's snapshot has 12 posts; 1 is pinned → primary drops to 11, competitor keeps 12. Same input shape, different rule.

## 3. Verdict: bug (asymmetric, not a windowing difference)

- Both sides are baseline (`windowAligned: false` for competitors today, and primary in this preview is the same snapshot).
- The mismatch is **not** about window; it's that primary went through `buildBlock01Sample` and competitor did not.
- Every other competitor metric (`averageLikes`, `averageEngagementRate`, `estimatedPostsPerWeek`, `dominantFormat`) is also raw `content_summary` — primary went through Block 1 override. So whenever a competitor has pinned posts the comparison silently mixes denominators across the whole card, not just this row.

## 4. Recommended fix (smallest safe change, no providers, no schema)

In `src/lib/report/snapshot-to-report-data.ts` around lines 1289–1336, when building each `competitorBreakdown` entry, if `c.posts` is a non-empty array (Phase 2B already added it — see line 1330), recompute `postsAnalyzed` and the dependent averages using the same `buildBlock01Sample` helper:

```ts
const cPosts = Array.isArray((c as any).posts) ? (c as any).posts as SnapshotPost[] : [];
const cSample = cPosts.length > 0 ? buildBlock01Sample(cPosts) : null;
const cAnalyzed = cSample?.analyzedPosts ?? [];
const cPerf     = cSample?.performancePosts ?? [];
…
postsAnalyzed: cAnalyzed.length > 0 ? cAnalyzed.length : num(s.posts_analyzed, 0),
averageLikes:    cPerf.length > 0 ? avg(cPerf, p => p.likes)    : num(s.average_likes, 0),
averageComments: cPerf.length > 0 ? avg(cPerf, p => p.comments) : num(s.average_comments, 0),
averageEngagementRate: cPerf.length > 0 ? avg(cPerf, p => p.engagement_pct) : num(s.average_engagement_rate, 0),
```

Properties of this fix:
- Pure adapter change. No Apify/OpenAI/DataForSEO calls, no schema, no payment/credit/checkout impact.
- Falls back cleanly to legacy `content_summary` when `c.posts` is absent (older snapshots).
- Makes the card honest: both sides use the same denominator and same filter.
- Brings competitor metrics into the same definition primary already uses for engagement, format share, and cadence — fixes the silent mismatch in those other rows too.

## 5. Microcopy

Even after the fix the label `"Publicações analisadas"` stays accurate (it's the same definition both sides). No relabel needed. The phrasing `"Posts válidos na análise"` is more precise but unnecessary once the numbers match.

If the fix is *not* applied for some reason, the only honest interim copy is to add a small hint under the card: *"Posts fixados excluídos do lado do perfil."* — but this is a band-aid; symmetry in the adapter is the correct path.

## 6. Out of scope

- No window alignment change (`windowAligned` stays as-is; competitors remain baseline today).
- No edits to `buildBlock01Sample`, normalize.ts, or any provider/Apify code.
- No UI rewrites beyond the optional microcopy.
