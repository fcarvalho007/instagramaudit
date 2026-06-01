# Plan — Safe thumbnail persistence & rendering

## Audit findings (read-only)

**Current state:**
- `/api/public/ig-thumb` **does not exist** in the codebase. The reference in `report-post-comparison.tsx:912` is a stale comment. Nothing to remove.
- `persistThumbnailsInPayload` (in `src/lib/report-snapshots/persist-thumbnails.server.ts`) is called from `storeSnapshot` (cache.ts:185) and **overwrites** `post.thumbnail_url` with the storage URL on success, or with `null` on failure. This is destructive — exactly the anti-pattern the user wants fixed.
- DB check on 5 most recent snapshots: 12/12 posts each still hold raw `cdninstagram.com` URLs; 0 storage URLs. So either the helper never ran for these (likely — they predate it or it crashed silently) or every fetch failed and was reset to IG CDN (impossible, since failure sets `null`). Net: **today's snapshots ship raw IG CDN URLs to the browser**; the browser loads them directly. The "format icon fallback" reproduces when the browser also can't load that URL (expired signed URL, region block, etc.).
- Normalize stage (`normalize.ts:422 pickThumbnail`) already considers all relevant Apify fields: `displayUrl`, `display_url`, `imageUrl`, `thumbnailUrl`, `thumbnail_url`.
- Components currently used:
  - `caption-diagnostics-card.tsx` → reads `p.thumbnail_url`
  - `visual-cover-analysis-card.tsx` → reads `post.thumbnail_url`
  - `report-post-comparison.tsx` → reads `post.thumbnailUrl` (camelCase shim via `EnrichedPost`)
  - `format-card.tsx` / `report-diagnostic-card.tsx` → read `thumbnailUrl`
  - `pdf/report-document.tsx` → reads `thumbnail_url`
- Storage bucket `post-thumbnails` already exists (migration `20260601115104`): public read, service-role write, image/* only. **No new bucket needed.**

## Root cause (confirmed)

Server-to-server fetch of `*.cdninstagram.com` from the Cloudflare Worker returns 403 (Instagram blocks the Worker IP range / missing browser-only signed-headers). The current helper masks this by **nulling out the original URL**, which removes the browser's only working fallback.

## Cache vs fresh

The affected report is served from a **cached** `analysis_snapshot` (5 newest snapshots audited, all `posts_storage = 0`, all `posts_ig_cdn = 12`). No fresh Apify call needed to validate the fix path — we can drive the helper with a single approved fresh run later (Task 9).

## Changes

### 1. Schema (additive, non-breaking)

`src/lib/analysis/normalize.ts`:
- Add `thumbnail_storage_url: string | null` to `NormalizedPost`.
- `normalizePosts` sets it to `null` initially; `thumbnail_url` keeps the original Apify URL.
- Same for `profile.avatar_url` → add `avatar_storage_url`.

`src/lib/report-snapshots/schema.ts`:
- Add optional `thumbnail_storage_url: httpsUrl.nullable().optional()` to `PostSchema`.

### 2. Rewrite `persist-thumbnails.server.ts` to be additive

- **Do not overwrite** `post.thumbnail_url` or `profile.avatar_url`.
- Write the persisted URL (or `null`) into `post.thumbnail_storage_url` / `profile.avatar_storage_url`.
- Add structured counters in the return value:
  ```ts
  { attempted, stored, failed_403, failed_timeout, failed_invalid_content_type, failed_upload, failed_other }
  ```
- Keep existing concurrency (4), timeout (8s), MIME allowlist (`image/*`), 2 MB size cap (new — count as `failed_invalid_content_type`).
- Keep best-effort: any throw is caught; analysis continues.
- Storage path stays `post-thumbnails/{cacheKey}/{shortcode|id|idx-N}.{jpg|png|webp}`.

### 3. Instrumentation

In `cache.ts:storeSnapshot`, replace the existing single-line `console.log` with one structured log:
```
[thumbnails] handle=... cache_key=... attempted=N stored=N failed_403=N failed_timeout=N failed_invalid_content_type=N failed_upload=N failed_other=N avatar=ok|fail|none duration_ms=N
```
No `product_events`, no URLs in logs.

### 4. Build-report mapper

`src/lib/report/snapshot-to-report-data.ts` (and the post-aggregates pipeline that feeds `EnrichedPost`): propagate `thumbnail_storage_url` alongside `thumbnail_url`.

### 5. Rendering — single helper

Add `src/lib/report/pick-thumbnail.ts`:
```ts
export function pickThumbnailUrl(p: {
  thumbnail_storage_url?: string | null;
  thumbnail_url?: string | null;
  thumbnailUrl?: string | null;
}): string | null {
  return p.thumbnail_storage_url || p.thumbnail_url || p.thumbnailUrl || null;
}
```
Use it in:
- `report-post-comparison.tsx` (replace `thumbUrl = ...thumbnailUrl` line)
- `caption-diagnostics-card.tsx`
- `visual-cover-analysis-card.tsx`
- `overview/format-card.tsx`
- `report-diagnostic-card.tsx`
- `pdf/report-document.tsx`

All existing `<img onError>` → fallback icon behavior is preserved unchanged.

### 6. Legacy proxy

No file exists. Update the stale comment in `report-post-comparison.tsx:912` to point at the new storage URL flow. Nothing to delete.

### 7. Tests

New `src/lib/report-snapshots/__tests__/persist-thumbnails.test.ts`:
- 403 from upstream → `thumbnail_storage_url = null`, `thumbnail_url` preserved, counter `failed_403 = 1`.
- `content-type: text/html` → rejected, `failed_invalid_content_type = 1`.
- 2xx image → uploaded, returns public storage URL, original preserved.
- Throw inside fetch → caught, counters incremented, no rethrow.

New `src/lib/report/__tests__/pick-thumbnail.test.ts`:
- Prefers `thumbnail_storage_url` over `thumbnail_url`.
- Falls back to `thumbnail_url` when storage is `null`.
- Returns `null` when both missing (component then shows icon).

### 8. Validation

- `bunx tsc --noEmit`
- `bunx vitest run src/lib/report-snapshots/__tests__/persist-thumbnails.test.ts src/lib/report/__tests__/pick-thumbnail.test.ts src/lib/report-snapshots/__tests__/build-report-snapshot-payload.test.ts`
- **No Apify call** in this implementation step. Task 9 (one fresh controlled run + browser Network check for `storage/v1/object/public/post-thumbnails/...` 200s) requires explicit go-ahead in a follow-up message.
- No backfill of existing snapshots (Task 10). Decide after live success-rate is measured.

## Files touched

- `src/lib/analysis/normalize.ts` — add `thumbnail_storage_url`, `avatar_storage_url` fields
- `src/lib/report-snapshots/schema.ts` — add optional field
- `src/lib/report-snapshots/persist-thumbnails.server.ts` — rewrite to be additive + counters
- `src/lib/analysis/cache.ts` — structured log line
- `src/lib/report/snapshot-to-report-data.ts` + `src/lib/report/post-aggregates.ts` — propagate field
- `src/lib/report/pick-thumbnail.ts` — new helper
- 6 render sites listed in §5 — switch to `pickThumbnailUrl`
- 2 new test files

## Not touched

Apify limits, scoring, OpenAI, prompts, pricing, gates, emails, leads, report layout, existing fallback icons, bucket migration.

## Open question (one decision needed)

Right now persistence runs only when `storeSnapshot` writes a fresh snapshot. **Existing cached snapshots will keep raw IG CDN URLs until they expire (~15 days)** and naturally rotate. Three options for handling them in the same loop:

1. **Do nothing.** Wait for natural cache rotation. Lowest risk, slowest fix.
2. **Lazy on-read.** When `report-snapshot.by-id` reads a snapshot missing `thumbnail_storage_url`, kick off persistence asynchronously. Adds a code path and needs care to avoid duplicate uploads.
3. **One-off backfill script** later (Task 10), gated on live success rate.

I recommend **option 1** for this PR (matches user's "do not backfill yet") and revisit after Task 9 measurements. Confirm or override before I implement.
