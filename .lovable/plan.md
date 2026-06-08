
## Goal

When the competitor side of a snapshot lacks Phase 2 fields (older snapshots) or has expired CDN URLs, the comparison cards currently render **misleading 0% donuts, empty weekday bars, and broken avatars**. Fix this in the adapter + components — no schema changes, no provider calls, no backend changes.

## Scope (files only)

1. `src/components/report/report-mock-data.ts` — type widening
2. `src/lib/report/snapshot-to-report-data.ts` — robust field reads
3. `src/components/report-redesign/v2/competitor-format-compare.tsx`
4. `src/components/report-redesign/v2/competitor-weekday-compare.tsx`
5. `src/components/report-redesign/v2/competitor-cadence-compare.tsx`
6. `src/components/report-redesign/v2/overview/comparison-hero.tsx`

No changes to: backend, providers, schema, credits, EuPago, checkout, entitlements, Free/Public, or the legacy `ReportCompetitors` component.

## Changes

### 1) Adapter — robust competitor field reads (no new payload fields)

In `snapshot-to-report-data.ts` (~lines 1296–1410), widen the source reads using ONLY fields that already exist in `analysis_snapshots.normalized_payload`:

- `avatarUrl` ← first non-empty of: `profile.avatar_storage_url`, `profile.avatar_url`, `profile.profile_pic_url_hd`, `profile.profile_pic_url`.
- For each competitor post mapped into `posts[]`, keep existing fields and also expose: `thumbUrl` (resolved via `pickThumbnailUrl({thumbnail_storage_url, thumbnail_url, display_url})`), `permalink`, `takenAt`, `weekday`, `format`, `likes`, `comments`, `engagementPct`, `caption` — only when each field is present on the raw post.
- Recompute `weekdayCounts`/`weekdayCountsIso` from `competitors[i].posts[*].weekday` when `weekday_counts` is missing but `posts[]` is present (silent legacy upgrade — no fake data).
- Recompute `formatStats` from `competitors[i].posts[*].format` the same way (count + share_pct) when `format_stats` is missing but `posts[]` is present.
- Add boolean flags so components can render correct empty states:
  - `hasPosts` (boolean) — true iff `posts[]` has ≥1 entry after mapping.
  - `hasFormatStats` (boolean) — true iff `formatStats` is present with ≥1 non-zero share.
  - `hasWeekdayData` (boolean) — true iff `weekdayCountsIso` sum > 0.
  - `avatarMissing` (boolean) — true iff none of the avatar URL candidates exist (different from "URL exists but image fails to load" — that case is detected client-side).

These are derived from existing data; no payload changes.

### 2) Type widening — `ReportCompetitorBreakdownEntry`

In `report-mock-data.ts`, add the new optional flags + `posts[]` becomes a typed array (still `unknown[]`-compatible to avoid downstream churn):

```ts
hasPosts?: boolean;
hasFormatStats?: boolean;
hasWeekdayData?: boolean;
avatarMissing?: boolean;
```

Update the mock entry to set `hasPosts: false, hasFormatStats: true, hasWeekdayData: true` so `/report.example` keeps current visuals.

### 3) `competitor-format-compare.tsx` — neutral state when competitor stats missing

- If `competitor.hasFormatStats === false`:
  - Render the **primary donut** as usual.
  - On the competitor side, swap the donut + 0% list for a centered neutral block: icon + caption **"Dados do concorrente indisponíveis nesta amostra."** + sub-line "Mix de formatos requer publicações analisadas no concorrente."
- If `competitor.hasFormatStats === true` but every share is `0` → keep current "Sem dados" centered label (real zero is rare but possible).
- Do not change the primary side rendering or the card insight footer (skip insight when competitor is in neutral state — `buildDonutInsight` already returns null in that case).

### 4) `competitor-weekday-compare.tsx` — neutral state when weekday missing

- If `competitor.hasWeekdayData === false` and primary has data:
  - Render primary as a single-side bar chart inside the same `CompareCardShell` slot, with a neutral footer note **"Ritmo do concorrente indisponível nesta amostra."**
  - Skip insight.
- If both sides are zero → keep current `return null`.

### 5) `competitor-cadence-compare.tsx` — clearer sample strip empty state

- Keep `extractRecentPosts` using existing `pickThumbnailUrl` helper (already prefers storage URL → thumbnail → display).
- When `competitorStrip.length === 0` AND `competitor.hasPosts === false`, render a single competitor-side neutral block: **"Sem amostra recente do concorrente nesta análise."** (do not render empty placeholders pretending posts exist).
- When `competitorStrip.length === 0` AND `competitor.hasPosts === true` (posts exist but every thumb URL is null/expired), render the placeholder strip with the existing methodology note: "Miniaturas indisponíveis (links de CDN expirados)."

### 6) `comparison-hero.tsx` — avatar fallback + methodology copy

- `CompareAvatar` already falls back to initials gradient on `onError` — no change needed there.
- Add a defensive `avatarMissing` check in `IdentityCard`: when `avatarUrl == null`, render initials directly (skip the `<img>` mount that would briefly flicker).
- Methodology footnote: when `competitor.hasPosts === false`, append **"Algumas comparações detalhadas (mix, ritmo, miniaturas) requerem análise mais recente do concorrente."**

## Empty-state taxonomy (single source of truth for components)

| State | Trigger | Render |
|---|---|---|
| Real zero data | adapter flag is true but values are all 0 | "Sem dados" inside chart |
| Missing in snapshot | `hasFormatStats === false`, `hasWeekdayData === false`, `hasPosts === false` | Neutral block "Dados do concorrente indisponíveis nesta amostra." |
| Blocked/expired image | `<img onError>` fires | Initials gradient (avatar) or `CompareThumbPlaceholder` (thumb) |
| Sample too small | `posts < 3` (already implemented in insights) | Insight returns null |

## Validation (manual after edits)

1. `nunomarkl` preview: Mix de formatos shows primary donut + neutral block on competitor (no 0% bars).
2. Ritmo por dia shows primary bars + neutral footer (no 0 bars on competitor side).
3. Cadência: competitor strip shows neutral message (not 5 empty placeholder squares).
4. Hero avatar for `@manzarra` shows "M" initials in competitor-color gradient instead of broken circle.
5. `/report.example` mock still renders fully populated comparison (mock entry has `hasFormatStats: true, hasWeekdayData: true`).
6. 375px width: no horizontal overflow on any of the 4 cards (neutral blocks are full-width).
7. Typecheck passes.

## Out of scope

- No re-fetching of competitor (would require providers).
- No backend persistence changes (no `avatar_storage_url` mirroring yet — that's a future prompt).
- No changes to legacy `ReportCompetitors` horizontal-gauge component.

