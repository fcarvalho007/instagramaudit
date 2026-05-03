
# Async Comment Enrichment — Architecture Plan

## Audit Answers

### 1. Where comment enrichment runs inline
Lines 1043-1101 of `src/routes/api/analyze-public-v1.ts` — `enrichCommentsInline()` is awaited directly inside the POST handler, blocking the response.

### 2. Why the previous production test failed
The Apify comment scraper needs 60-120s. The Cloudflare Worker has a ~30s wall-clock limit. The inline `await enrichCommentsInline(...)` was killed mid-flight. No `provider_call_logs` entry was recorded, no `comment_intelligence` was stored, and no error was surfaced because the Worker died silently.

### 3. Budget constants verification
All confirmed at correct values — no `$0.25` path remains:
- `COMMENT_SCRAPER_TARGET_COST_USD = 0.15` (line 47)
- `HARD_MAX_CHARGE_CEILING = 0.20` (line 50)
- `maxTotalChargeUsd` is derived from these, capped at `$0.20`

### 4. New DB table required: YES
A `comment_enrichment_jobs` table is needed to track async enrichment lifecycle, enable idempotency, prevent duplicate runs, and give admin visibility.

### 5. Existing endpoint reuse
`/api/public/enrich-comments` (src/routes/api/public/enrich-comments.ts) already exists with the right structure. It will be refactored to read from the jobs table and become idempotent.

### 6. Risks of using only `waitUntil`
- `ctx.waitUntil` extends Worker lifetime by ~30s max on Cloudflare Workers — not enough for 60-120s scraper runs.
- If the extended lifetime is exceeded, the promise is killed silently with no error callback.
- No retry mechanism, no state tracking, no admin visibility.
- **Verdict**: Unsafe as sole mechanism. The job table + separate HTTP trigger is required.

---

## Implementation Plan

### Step 1 — Migration: `comment_enrichment_jobs` table

```sql
CREATE TABLE public.comment_enrichment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  analysis_event_id uuid,
  handle text NOT NULL,
  post_urls jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for polling/admin queries
CREATE INDEX idx_cej_status ON public.comment_enrichment_jobs (status);
CREATE INDEX idx_cej_snapshot ON public.comment_enrichment_jobs (snapshot_id);

-- Prevent duplicate pending jobs for the same snapshot
CREATE UNIQUE INDEX idx_cej_snapshot_pending
  ON public.comment_enrichment_jobs (snapshot_id)
  WHERE status IN ('pending', 'processing');

-- Auto-update timestamp
CREATE TRIGGER set_updated_at_cej
  BEFORE UPDATE ON public.comment_enrichment_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.comment_enrichment_jobs ENABLE ROW LEVEL SECURITY;
```

No RLS policies needed (admin-only, accessed via `supabaseAdmin`).

### Step 2 — Add `comment_scraper_timeout` to type

In `src/lib/analysis/types.ts`, add `"comment_scraper_timeout"` to the `CommentIntelligence.reason` union.

### Step 3 — Refactor `/api/analyze-public-v1.ts`

Replace lines 1043-1101 (inline enrichment block) with:

1. Build the `comment_intelligence` placeholder: `buildUnavailableCommentIntelligence(primary, "processing")` with `samplePosts` set to the known post count.
2. Include placeholder in the snapshot payload before the final persist.
3. Insert a row into `comment_enrichment_jobs` with status `"pending"`, the snapshot_id, analysis_event_id (from `logEvent`), handle, and post_urls.
4. Fire-and-forget HTTP call to `/api/public/enrich-comments` using `fetch()` without awaiting (best-effort trigger). If `waitUntil` is available, wrap in it for extended lifetime. The job table guarantees delivery even if this call fails.
5. Return the response immediately.

Remove `enrichCommentsInline` import — that module can be deleted or kept as reference.

### Step 4 — Refactor `/api/public/enrich-comments`

Rewrite to be job-table-driven and idempotent:

1. Accept `{ job_id }` or `{ snapshot_id }` in body (auth via `INTERNAL_API_TOKEN`).
2. Look up the job row. If status is already `completed`, return early (idempotent).
3. Set status to `processing`, increment `attempts`, set `started_at`.
4. Run `fetchCommentsForPosts()` with the stored `post_urls`.
5. On success: aggregate, patch snapshot, set status `completed`, record `provider_call_logs` with `analysis_event_id` from the job.
6. On failure/timeout: patch snapshot with appropriate unavailable reason (`comment_scraper_failed` or `comment_scraper_timeout`), set job status to `failed`, store `last_error`.
7. This endpoint runs in its own Worker invocation with its own 30s budget. If the Apify actor still exceeds this, the `runActorWithMetadata` timeout parameter must be set to ~25s with `maxTotalChargeUsd: 0.20`. Partial results are accepted.

### Step 5 — Fallback: pg_cron sweep for stuck jobs

A pg_cron job (every 5 minutes) calls `/api/public/enrich-comments` for any jobs stuck in `pending` status for >60s. This guarantees delivery even if the fire-and-forget trigger from Step 3 was killed.

```sql
SELECT cron.schedule(
  'sweep-pending-comment-jobs',
  '*/5 * * * *',
  $$ SELECT net.http_post(
    url := 'https://project--b554ee82-2f67-4f5a-895d-cd69f2867df7.lovable.app/api/public/enrich-comments',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer INTERNAL_TOKEN"}'::jsonb,
    body := '{"sweep":true}'::jsonb
  ) $$
);
```

The endpoint, when receiving `{"sweep": true}`, queries for oldest pending job and processes it. Max 1 per sweep to avoid overload.

### Step 6 — Snapshot patching

Same as current `enrich-comments-inline.server.ts` logic:
1. Read snapshot's `normalized_payload`.
2. Merge `comment_intelligence` into it.
3. Update the row.

The `analysis_event_id` is stored in the job row and passed to `recordProviderCall` so cost tracking links correctly.

### Step 7 — Frontend: processing state (already done)

The `CommentIntelligenceUnavailable` component already handles `reason: "processing"` with a spinner and appropriate copy. Add the missing `comment_scraper_timeout` reason to the `UNAVAILABLE_REASONS` map:

```
comment_scraper_timeout: {
  title: "Análise excedeu o tempo limite",
  body: "A análise de comentários excedeu o tempo disponível. Tenta novamente mais tarde.",
}
```

No polling. The user refreshes manually — the snapshot will already be patched by then.

### Step 8 — Admin visibility

In `src/lib/admin/system-queries.server.ts`, add `fetchCommentEnrichmentJobs()` that queries `comment_enrichment_jobs` with counts by status, recent failures, and pending jobs.

In `src/components/admin/v2/sistema/costs-detail-section.tsx`, add a "Enrichment Jobs" section showing:
- Pending / Processing / Completed / Failed counts
- Recent failed jobs with `last_error`
- Cost from linked `provider_call_logs` (labelled Real/Estimado/Indisponivel)

### Step 9 — `analysis_event_id` preservation

The main analysis route already calls `logEvent()` (line 912) which returns the event ID. This ID is stored in `comment_enrichment_jobs.analysis_event_id`. When the enrichment endpoint records the provider call, it passes this ID so costs are linked to the original analysis event.

### Step 10 — Tests

- Unit test for `buildUnavailableCommentIntelligence` with `"processing"` and `"comment_scraper_timeout"` reasons.
- Update existing comment-intelligence tests if any reference the reason union.
- Integration test: verify the enrichment endpoint is idempotent (calling twice with same job returns early on second call).

### Step 11 — Validation

- `tsc --noEmit` (run by harness)
- `bunx vitest run` — all tests pass
- Manual: verify no `$0.25` references remain via `rg "0\.25" src/`

---

## Files to change

| File | Change |
|------|--------|
| `src/lib/analysis/types.ts` | Add `"comment_scraper_timeout"` to reason union |
| `src/routes/api/analyze-public-v1.ts` | Replace inline enrichment with job creation + fire-and-forget trigger |
| `src/routes/api/public/enrich-comments.ts` | Rewrite: job-table-driven, idempotent, with timeout handling |
| `src/lib/analysis/enrich-comments-inline.server.ts` | Delete or deprecate |
| `src/components/report-redesign/v2/report-comment-intelligence.tsx` | Add `comment_scraper_timeout` to UNAVAILABLE_REASONS |
| `src/lib/admin/system-queries.server.ts` | Add `fetchCommentEnrichmentJobs()` |
| `src/components/admin/v2/sistema/costs-detail-section.tsx` | Add enrichment jobs section |
| New migration | `comment_enrichment_jobs` table + pg_cron sweep |

No locked files are touched.
