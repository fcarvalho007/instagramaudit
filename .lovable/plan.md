
## Audit: Instagram Comment Intelligence Feature

### Summary Table

| # | Area | Verdict | Detail |
|---|------|---------|--------|
| 1 | Apify input schema | **PASS** | `directUrls`, `resultsLimit`, `includeNestedComments`, `isNewestComments` all match the official actor input schema exactly. |
| 2 | Output parser fields | **WARN** | Fields `id`, `text`, `ownerUsername`, `timestamp`, `likesCount`, `repliesCount`, `replies[]` all match official output. However, the output does **not** include `postUrl`, `inputUrl`, or `url` per comment — see risk #1 below. |
| 3 | Owner reply detection | **PASS** | Checks both top-level comments and nested replies against `normalizeUsername(profileUsername)`. Owner top-level comments are correctly excluded from `audienceCommentsCount`. |
| 4 | Disabled by default | **PASS** | `(process.env.COMMENT_SCRAPER_ENABLED ?? "false").toLowerCase() === "true"` — defaults to `false`. Entire block wrapped in `try/catch` that swallows all errors. Base analysis never breaks. |
| 5 | Plan-gating (PRO only) | **FAIL** | No plan/tier check exists. When `COMMENT_SCRAPER_ENABLED=true`, the scraper runs for **every** analysis — free or paid. There is no `is_free_request` or tier guard. |
| 6 | Cost logging | **WARN** | Logs `actor`, `runId`, `actualCostUsd`, `status`, `handle`. But `durationMs: 0` is hardcoded (no timing). `postsReturned` is set to total comments count (misnomer vs column name). Failure paths don't log at all. Admin card is already mounted. |
| 7 | GDPR / privacy | **PASS** | Raw `text` and `ownerUsername` are never persisted. Only `CommentIntelligence` aggregates are stored in `normalized_payload.comment_intelligence`. `ownerProfilePicUrl` is discarded. Limitations disclaimers are shown in UI. |

---

### Critical Code Risks

**Risk #1 — Post-URL grouping will fail in production (HIGH)**

`comment-scraper.server.ts` lines 111-118 try to match each comment to a post bucket via `raw.postUrl`, `raw.inputUrl`, or `raw.url`. The official Apify output schema does **not** include any of these fields — comments are returned as a flat list with no post back-reference.

**Impact**: All comments go to no bucket. Every `PostCommentBatch` stays empty. `aggregateCommentIntelligence` returns zeros. The feature appears to work but produces no useful data.

**Fix**: Since comments are grouped per-input-URL in the Apify dataset, and the actor processes URLs sequentially, the safest approach is to run **one actor call per post URL** (up to 12 calls). Alternatively, investigate whether the actor adds a hidden `#inputUrl` or `postUrl` field not shown in the documentation (would require a real test run to confirm).

**Risk #2 — No PRO/plan gate (MEDIUM)**

The comment scraper runs for every analysis when enabled. This means free users trigger the extra Apify cost ($1-2.50 per analysis). There is no `is_free_request`, `tier`, or plan check.

**Fix**: Add a simple guard: only run if the analysis is tagged as PRO (or add a second env var like `COMMENT_SCRAPER_PRO_ONLY=true`).

**Risk #3 — `durationMs: 0` hardcoded (LOW)**

The `recordProviderCall` receives `durationMs: 0` instead of the real elapsed time. This makes performance monitoring and cost-per-second analysis impossible.

**Fix**: Capture `Date.now()` before the call and compute elapsed ms after.

**Risk #4 — Failures are not logged (LOW)**

If `fetchCommentsForPosts` throws, the `catch` block on line 1100 logs to console but does **not** call `recordProviderCall` with `status: "failure"`. This means the admin cost view never shows failed comment scraper runs.

**Fix**: Add a `recordProviderCall` in the catch block with `status: "failure"`.

**Risk #5 — `sampleComments` counting inconsistency (LOW)**

`totalComments` increments only for top-level comments (line 76) but `totalAudienceComments` includes both top-level and reply-level audience comments (lines 73, 87). This means `sampleComments` in the output understates the true total. Not a bug per se but misleading.

---

### Recommended Fix Plan (ordered prompts)

**Prompt 1 — Fix post-URL grouping (blocks activation)**
Run a test call to `apify/instagram-comment-scraper` with a single post URL to confirm the actual output fields. If no `postUrl` field exists per comment, refactor to either: (a) run one actor call per post, or (b) batch all URLs but assign all results to a single aggregated bucket (losing per-post granularity but preserving overall metrics).

**Prompt 2 — Add PRO-only gate**
Add a plan check before the comment scraper block. If no plan system exists yet, gate behind `COMMENT_SCRAPER_PRO_ONLY` env var (default `true`) and only run when the request is marked as PRO/premium.

**Prompt 3 — Fix cost logging gaps**
- Capture real `durationMs` around the `fetchCommentsForPosts` call.
- Add `recordProviderCall` with `status: "failure"` in the catch block.
- Rename `postsReturned` usage to reflect it's actually comments count (or add a separate field).

**Prompt 4 — Fix `sampleComments` counting**
Include reply-level comments in `totalComments` for accurate `sampleComments` output.

**Prompt 5 — Validate with real data**
Enable `COMMENT_SCRAPER_ENABLED=true` temporarily on the test profile, run one analysis, and verify the full pipeline end-to-end: Apify call → grouping → aggregation → snapshot persistence → report UI rendering → admin cost card.
