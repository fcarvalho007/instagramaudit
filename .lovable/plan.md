# Real Report Data Layer — Plan (No Code Yet)

## A. Real data inventory (what is actually persisted today)

No fresh snapshot for `frederico.m.carvalho` exists yet (smoke test was always blocked). However, the snapshot **shape** is fully defined in code and is the authoritative reference.

`analysis_snapshots.normalized_payload` (today, post-normalization in `src/lib/analysis/normalize.ts` + persistence at `analyze-public-v1.ts` lines 542–556):

```
{
  profile: {
    username, display_name, avatar_url, bio,
    followers_count, following_count, posts_count, is_verified
  },
  content_summary: {
    posts_analyzed, dominant_format,            // Reels | Carrosséis | Imagens
    average_likes, average_comments,
    average_engagement_rate,                    // percent
    estimated_posts_per_week
  },
  competitors: [ { profile, content_summary } | { error_code } ]
}
```

Plus, computed at response time (not stored): `benchmark_positioning` (from `benchmark_references` table).

CRITICAL GAP: the raw `latestPosts[]` returned by Apify (captions, timestamps, likes per post, comments per post, media URLs, type, video views, permalinks) is **read once**, used to compute aggregates, and then **discarded**. Nothing post-level is persisted.

## B. /report/example inventory

`src/components/report/report-mock-data.ts` exposes a single `reportData` object with these sections, each consumed by a dedicated component:

```
profile, keyMetrics, temporalSeries, formatBreakdown,
competitors, topPosts, postingHeatmap, topHashtags,
topKeywords, bestDays, aiInsights
```

## C. Mapping table

| Report section | Current dummy field(s) | Real field today | Needs derived calc | Missing from snapshot | Recommended fallback | Risk |
|---|---|---|---|---|---|---|
| Header (avatar, handle, name, verified) | `profile.username/fullName/avatarGradient/verified` | `profile.{username,display_name,avatar_url,is_verified}` | none | — | initials avatar if `avatar_url` null/CORS-blocked | low |
| Profile summary (followers, following, posts) | `profile.{followers,following,postsCount}` | `profile.{followers_count,following_count,posts_count}` | none | — | "—" if null | low |
| Tier label ("Micro · 10K–50K") | `profile.tier`, `profile.tierRange` | derived from `followers_count` | yes (5 tiers) | — | always derivable | low |
| Window label ("17 Abr 2026 · 30 dias") | `profile.analyzedAt`, `windowDays` | `analysis_snapshots.created_at` + window from posts span | small calc | — | "30 dias" default | low |
| Posts analyzed | `profile.postsAnalyzed` | `content_summary.posts_analyzed` | none | — | — | low |
| Engagement rate (KPI) | `keyMetrics.engagementRate` | `content_summary.average_engagement_rate` | none | — | — | low |
| Engagement benchmark + delta | `keyMetrics.engagementBenchmark`, `engagementDeltaPct` | `benchmark_positioning.tier_benchmark` | small calc | — | hide delta if no benchmark | low |
| Posting frequency / week | `keyMetrics.postingFrequencyWeekly` | `content_summary.estimated_posts_per_week` | none | — | — | low |
| Dominant format | `keyMetrics.dominantFormat` + share % | `content_summary.dominant_format` | yes for share % | per-format counts not stored, only the winner | persist `format_breakdown` aggregates (Step 1) | medium |
| Benchmark gauge | `engagement_rate vs benchmark` | `benchmark_positioning` | none | — | — | low |
| Format breakdown (Reels/Carrosséis/Imagens · share% · engagement · benchmark) | `formatBreakdown[]` | only `dominant_format` today | yes | per-format share & engagement not persisted | persist `formatStats` map in Step 1 | medium |
| Competitors panel | `competitors[]` (eng + followers) | `competitors[]` (when supplied) | none | "Perfil analisado" omitted from competitors list | always derive from `profile` + competitor entries | low |
| Top posts (5 cards · thumb, date, format, likes, comments, eng%, caption) | `topPosts[]` | NONE — posts discarded | — | full post objects | persist top-N posts in Step 1 | high |
| Temporal series (30 daily likes/comments/views) | `temporalSeries[30]` | NONE | — | per-post timestamp + likes + comments + views | persist `latestPosts[]` raw, then bucket per day | high |
| Posting heatmap (7×24 + best slots) | `postingHeatmap` | NONE | — | per-post timestamps | persist post timestamps + engagement; compute matrix client-side | medium |
| Best days | `bestDays[7]` | NONE | — | per-post weekday + engagement | derive from persisted posts | medium |
| Top hashtags | `topHashtags[]` | NONE | — | captions | extract `#tag` regex from captions | medium |
| Top keywords | `topKeywords[]` | NONE | — | captions | tokenize captions, filter pt-PT stop-words | medium |
| AI insights (3 blocks) | `aiInsights[]` | NONE | — | LLM call | call `LOVABLE_API_KEY` (already present) with a deterministic prompt over computed metrics; cache result on the snapshot | medium |
| Report footer | static | static | — | — | — | low |

**Powered by real data today (no schema change):** Header, profile summary, tier, window label, engagement KPI, posting frequency KPI, dominant format **name**, benchmark gauge, competitors panel.

**Requires enriched payload (Step 1 below):** format breakdown (shares + per-format engagement), top posts, temporal chart, heatmap, best days, hashtags, keywords, AI insights.

## D. Recommended `RealReportData` contract

Adapter-only TypeScript type — **no DB shape change**. The adapter `snapshotToReportData(snapshot, benchmark)` returns the same shape as `reportData`, so report components stay untouched:

```ts
export interface RealReportData {
  profile: {
    username: string;
    fullName: string;
    avatarUrl: string | null;
    verified: boolean;
    followers: number;
    following: number | null;
    postsCount: number | null;
    tier: "Nano" | "Micro" | "Mid" | "Macro" | "Mega";
    tierRange: string;
    analyzedAt: string;        // formatted dd MMM yyyy (pt-PT)
    windowDays: number;
    postsAnalyzed: number;
  };
  keyMetrics: {
    engagementRate: number;
    engagementBenchmark: number | null;
    engagementDeltaPct: number | null;
    postsAnalyzed: number;
    postingFrequencyWeekly: number;
    dominantFormat: "Reels" | "Carrosséis" | "Imagens";
    dominantFormatShare: number; // %
  };
  formatBreakdown: Array<{ format; sharePct; engagement; benchmark; status }>;
  competitors: Array<{ username; label; engagement; followers; isOwn; avatarUrl? }>;
  // Posts-derived (require Step 1):
  topPosts: Array<{ id; date; format; thumbnailUrl|gradient; likes; comments; engagementPct; caption; permalink? }>;
  temporalSeries: Array<{ date; isoDate; likes; comments; views }>;
  postingHeatmap: { days; matrix; bestSlots };
  bestDays: Array<{ day; fullDay; avgEngagement; isLeader }>;
  topHashtags: Array<{ tag; uses; avgEngagement }>;
  topKeywords: Array<{ word; count }>;
  aiInsights: Array<{ number; label; text }>;
  // Coverage flags so the UI can hide sections gracefully.
  coverage: {
    hasPosts: boolean;
    hasCaptions: boolean;
    hasMedia: boolean;
    hasAiInsights: boolean;
  };
}
```

## E. Implementation plan (smallest safe sequence)

### Step 1 — Enrich `normalized_payload` (no migration needed)

Extend the persisted JSON with raw-ish post data **without** changing table schemas. `normalized_payload` is `jsonb`; the cache key + freshness logic ignores extra fields.

Add to the object stored at `analyze-public-v1.ts` lines 542–556:

```ts
posts: [{
  id, shortcode, permalink, format,
  caption, hashtags[], mentions[],
  taken_at, taken_at_iso, weekday, hour_local,
  likes, comments, video_views|null,
  thumbnail_url|null, is_video
}],
format_stats: { Reels: {count, avg_eng}, Carrosséis: {…}, Imagens: {…} }
```

Implemented as a new pure function `enrichPosts(rawPosts, followers): EnrichedPosts` in `src/lib/analysis/normalize.ts` (extension, not rewrite). Cap at 12 posts (current `resultsLimit`). Strip Apify-internal fields to keep payload <50 kB.

Backwards compatible: existing readers that only consume `profile + content_summary + competitors` keep working. Old snapshots without `posts` show coverage flags = false in the adapter.

### Step 2 — `snapshotToReportData` adapter

New file `src/lib/report/snapshot-to-report-data.ts`. Pure, no I/O. Inputs:
- `snapshot.normalized_payload` (enriched)
- `benchmark_positioning` (or compute from `benchmark_references`)

Returns `RealReportData`. All derivations live here:
- tier label from followers (5 ranges)
- format share %, per-format engagement
- temporal series (30-day daily buckets, fill zeros)
- 7×24 heatmap matrix (normalized 0–1)
- best days (avg engagement per weekday)
- hashtag/keyword extraction from captions (pt-PT stop-word list)
- top posts ranked by `(likes+comments)/followers`
- engagement delta vs benchmark
- coverage flags

Unit-testable in isolation (no Apify, no DB).

### Step 3 — Admin-only real preview route

New route `src/routes/admin/report-preview.$username.tsx` (admin-gated via existing `requireAdminSession`).

- Loader calls a new `createServerFn` `getRealReportData({ username })` that reads the latest snapshot for that username, runs the adapter, returns `RealReportData`.
- Component reuses **the existing** `<ReportPage />` and section components, passing real data via a new optional `data?: ReportData` prop. Default behavior of `/report/example` (no prop → `reportData` mock) is preserved.
- Light-theme wrapper kept identical.
- `noindex, nofollow`.

This proves the pipeline end-to-end against a real snapshot **without** touching `/report/example` or any user-facing route.

### Step 4 — (Later, separate prompt) PDF + email + public route

Out of scope for this plan. Once Step 3 looks right against `frederico.m.carvalho`:
- Wire `/analyze/$username` (or new `/report/$snapshotId`) to the same adapter.
- Generate PDF from the same `RealReportData` (already a goal for `generate-report-pdf.ts`).
- Trigger Resend with the PDF link.

## F. Files to edit (Steps 1–3 only)

- `src/lib/analysis/normalize.ts` — add `enrichPosts()` and `computeFormatStats()` (additive).
- `src/routes/api/analyze-public-v1.ts` — extend the object passed to `storeSnapshot()` (lines 542–556) with `posts` + `format_stats`. Nothing else changes.
- `src/lib/report/snapshot-to-report-data.ts` — NEW. The adapter.
- `src/lib/report/tiers.ts` — NEW. Tier ranges (Nano/Micro/Mid/Macro/Mega).
- `src/lib/report/text-extract.ts` — NEW. Hashtag/keyword extraction with pt-PT stop-words.
- `src/components/report/report-page.tsx` — accept optional `data?: ReportData` prop, default to mock. Pure additive change. **Does not affect `/report/example`.**
- `src/routes/admin/report-preview.$username.tsx` — NEW. Admin-only preview using real data.
- (optional) `src/lib/analysis/types.ts` — add `EnrichedPosts` + `FormatStats` types alongside existing ones.

No DB migrations. No changes to RLS, RPC, edge functions, secrets, cost logic, or the kill-switch.

## G. Files to keep locked

Per `mem://constraints/locked-files` and project rules:

- `src/routes/report.example.tsx` — untouched.
- `src/components/report/report-mock-data.ts` — untouched (still the source for `/report/example`).
- `src/components/report/report-*.tsx` (sections) — props unchanged; they continue to consume the same `ReportData` shape.
- `src/integrations/supabase/client.ts` and `types.ts` — generated.
- `src/routeTree.gen.ts` — generated.
- `supabase/config.toml` — unchanged.
- `src/routes/api/generate-report-pdf.ts` — Step 4, not now.
- Email flows / Resend code — Step 4, not now.
- `src/lib/security/apify-allowlist.ts` and the Apify kill-switch — untouched.
- `/admin → Diagnóstico` panels — untouched.

## H. Open questions to flag before Step 1

1. The Instagram CDN often blocks hot-linked images (`avatar_url`, post `thumbnail_url`) due to referrer checks. Acceptable to render **gradient fallbacks** for v1 and only proxy media in Step 4? (cheaper, avoids storage decisions now)
2. AI insights: use `LOVABLE_API_KEY` with `google/gemini-2.5-flash` (cheap, fast, multilingual) and cache the 3-block output inside `normalized_payload.ai_insights`? Or leave AI insights for Step 4?
3. With `resultsLimit: 12`, the temporal chart will only have ~12 sparse data points across 30 days — confirm that's acceptable for v1, or bump `resultsLimit` later (cost impact) for denser charts.
