## Audit result

After tracing the full pipeline, all 7 functional requirements of this PR are already implemented in code today. The only real fix needed is two stale comments that contradict the actual behaviour. A small smoke test will lock the contract.

### What is already in place

1. **`persist-thumbnails.server.ts`** (lines 257–323) already iterates `payload.competitors[]`, persists the competitor `profile.avatar_url` into `post-thumbnails/<cacheKey>/competitors/<username>/avatar`, and persists up to the first 12 competitor `posts[*].thumbnail_url` into the same folder. On success it writes:
   - `competitors[i].profile.avatar_storage_url`
   - `competitors[i].posts[j].thumbnail_storage_url`

2. **`cache.ts` `storeSnapshot`** (line 234) calls `persistThumbnailsInPayload(cacheKey, normalizedPayload)` BEFORE the DB upsert, so the mutations land in `analysis_snapshots.normalized_payload`.

3. **`enrichPosts` (normalize.ts:595)** seeds `thumbnail_storage_url: null` on every competitor post, so the field exists and is preserved by the spread in `analyze-public-v1.ts` (lines 1169–1177) — that sanitiser only strips `coauthors`, `tagged_users`, `location_name`.

4. **Read side** already prefers the durable URL:
   - `pickAvatarUrl` (snapshot-to-report-data.ts:547) → `avatar_storage_url` before `avatar_url`.
   - `pickThumbnailUrl` (pick-thumbnail.ts) → `thumbnail_storage_url` before `thumbnail_url`.
   Used by `enrichedAvatarUrl`, `competitorBreakdown.avatarUrl`, `enrichedTopPosts`, `enrichedBottomPosts`, and the competitor compare cards.

5. **Schema** (`report-snapshots/schema.ts`) already allows both fields on profile and post — no migration needed.

6. Fallbacks (gradient initials, `CompareThumbPlaceholder`, missing-data notes, `avatarMissing` flag) are untouched and continue to fire when persistence fails for a given URL.

### The actual gap

Two comments are misleading and will cause the next reader to "fix" something that isn't broken:

- `src/routes/api/analyze-public-v1.ts:1148` — comment claims competitors strip `thumbnail_storage_url`; the destructure on line 1170 does not, and must not.
- `src/components/report/report-mock-data.ts:49` — same false claim in the `ReportData.competitorBreakdown.posts` doc comment.

### Changes in this PR (edit mode, very small)

1. **`src/routes/api/analyze-public-v1.ts`** — rewrite the comment block above the `sanitizedPosts` map (around lines 1145–1168) to state the truth:
   - Excludes only `coauthors`, `tagged_users`, `location_name`.
   - `thumbnail_storage_url` IS preserved (initialised by `enrichPosts`, populated later by `persistThumbnailsInPayload` inside `storeSnapshot`).
   - Avatar persistence for competitors also happens inside `storeSnapshot` and writes `competitors[i].profile.avatar_storage_url`.

2. **`src/components/report/report-mock-data.ts`** — update the same false claim in the `posts?: unknown[]` doc to match (`thumbnail_storage_url` is kept; only `coauthors`, `tagged_users`, `location_name` are excluded).

3. **New test `src/lib/report-snapshots/__tests__/persist-thumbnails.competitors.test.ts`** (1 file, no schema change, no network) — locks the contract:
   - Given a payload with one `success: true` competitor whose `profile.avatar_url` and two `posts[*].thumbnail_url` are IG CDN URLs, with a stubbed `persistOne` returning a fake public URL, assert that after `persistThumbnailsInPayload`:
     - `competitors[0].profile.avatar_storage_url` is set
     - `competitors[0].posts[0..1].thumbnail_storage_url` are set
     - original `avatar_url` / `thumbnail_url` are unchanged
     - failed competitors (`success: false`) and non-IG URLs are skipped
   - Most of this is already covered by the existing `persist-thumbnails.test.ts` (lines 109–142). We add a regression test that **also** confirms `analyze-public-v1`'s sanitiser shape (with `thumbnail_storage_url: null` initialised) survives the round-trip — i.e. feed it a post object identical to what `enrichPosts` + the competitor destructure produce.

4. **Typecheck** (`tsc`) + vitest run for `persist-thumbnails*.test.ts` and `pick-thumbnail.test.ts`.

### Explicitly NOT in this PR

- No schema change (`report-snapshots/schema.ts` already permits both fields).
- No provider calls; the test stubs `persistOne`.
- No change to fallback UI (gradient initials, `CompareThumbPlaceholder`, missing-data notes, `avatarMissing`).
- No change to free/public flow — `storeSnapshot` is on the same code path for free and paid.

### Validation checklist after merge

- Trigger a fresh competitor snapshot in dev: `analysis_snapshots.normalized_payload.competitors[0].profile.avatar_storage_url` is a `https://<storage-host>/...` URL; first 12 posts have `thumbnail_storage_url` populated when IG CDN responds.
- Old snapshots (no `*_storage_url`) still render via the `avatar_url` / `thumbnail_url` fallback.
- Competitor compare cards show real avatars / thumbnails; failed ones fall back to gradient initials / `CompareThumbPlaceholder`.
- `bun run typecheck` and the touched vitest specs pass.
