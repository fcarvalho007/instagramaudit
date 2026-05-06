
# Fix Fresh Analysis Worker Timeout

## 1. Root Cause

The `POST /api/analyze-public-v1` handler runs **everything sequentially in a single Worker request**: Apify fetch (~10-60s) → DataForSEO (~5-20s) → OpenAI insights v1 (~5-15s) → OpenAI insights v2 (~5-15s) → visual cover analysis (~5-15s) → caption semantic (~5-10s) → comment job creation. Total wall time can exceed 90s, but Cloudflare Workers enforce a ~30s CPU / ~60s wall-clock limit. The Worker is killed mid-enrichment; only the Apify call and base snapshot survive.

## 2. Current Pipeline Sequence (all synchronous)

```text
1. Parse input, dedup competitors
2. Cache lookup → serve if fresh
3. Execution mode / allowlist / kill-switch gates
4. Apify profile+posts (primary + competitors, parallel)     ~10-60s
5. Normalize, compute summaries, benchmark positioning
6. DataForSEO market signals (if enabled+allowed)            ~5-20s
7. storeSnapshot (BASE — Apify + DFS only)
8. recordAnalysisEvent → analysisEventId
9. OpenAI insights v1                                        ~5-15s
10. OpenAI insights v2                                       ~5-15s
11. Visual cover analysis (OpenAI Vision)                    ~5-15s
12. Caption semantic analysis (OpenAI)                       ~5-10s
13. storeSnapshot (ENRICHED — with AI layers)
14. linkProviderCallsToEvent
15. Comment intelligence job creation + fire-and-forget
16. storeSnapshot (with comment placeholder)
17. Return response
```

Steps 9-16 routinely exceed the remaining Worker budget after Apify + DFS.

## 3. Proposed Pipeline Sequence

### Phase 1 — Synchronous (stays in the POST handler, target <25s)

```text
1. Parse input, dedup competitors
2. Cache lookup → serve if fresh
3. Execution mode / allowlist / kill-switch gates
4. Apify profile+posts (primary + competitors, parallel)
5. Normalize, compute summaries, benchmark positioning
6. storeSnapshot (BASE — Apify only, enrichment_status: "pending")
7. recordAnalysisEvent → analysisEventId
8. Create enrichment_jobs rows for each pending enrichment
9. Fire-and-forget POST to /api/public/enrich-snapshot
10. Return response with enrichment_status: "pending"
```

### Phase 2 — Async (separate Worker invocation via `/api/public/enrich-snapshot`)

```text
1. Read enrichment_jobs for the given snapshot
2. For each pending job (in priority order):
   a. DataForSEO market signals
   b. OpenAI insights v1
   c. OpenAI insights v2
   d. Visual cover analysis
   e. Caption semantic analysis
   f. Comment intelligence (already async, keep as-is)
3. Each completed enrichment:
   - Patches snapshot.normalized_payload (JSON merge)
   - Updates its job row status → success/error
   - Logs provider_call with analysis_event_id
4. linkProviderCallsToEvent at the end
```

The enrichment endpoint processes jobs sequentially within its own Worker budget. If it times out mid-way, completed enrichments are already persisted. A pg_cron sweep (like the existing comment sweep) retries remaining jobs.

## 4. Required Database Changes

### New table: `enrichment_jobs`

```sql
CREATE TABLE public.enrichment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  analysis_event_id uuid,
  handle text NOT NULL,
  enrichment_type text NOT NULL,  -- 'dataforseo' | 'insights_v1' | 'insights_v2' | 'visual_cover' | 'caption_semantic'
  status text NOT NULL DEFAULT 'pending',  -- pending | running | success | error | skipped
  priority integer NOT NULL DEFAULT 50,    -- lower = runs first
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  input_hash text,                         -- for idempotency/cache check
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_enrichment_jobs_pending ON public.enrichment_jobs (status, priority) WHERE status = 'pending';
CREATE INDEX idx_enrichment_jobs_snapshot ON public.enrichment_jobs (snapshot_id);
```

No RLS needed (server-only table, accessed via supabaseAdmin).

### Priority mapping

| enrichment_type   | priority |
|-------------------|----------|
| dataforseo        | 10       |
| insights_v1       | 20       |
| insights_v2       | 21       |
| visual_cover      | 30       |
| caption_semantic  | 31       |

Comment intelligence keeps its existing `comment_enrichment_jobs` table unchanged.

## 5. Files to Edit

| File | Change |
|------|--------|
| `src/routes/api/analyze-public-v1.ts` | Remove OpenAI/DFS/visual/caption inline calls. After base snapshot, create enrichment_jobs rows and fire-and-forget to new endpoint. (~400 lines removed, ~60 added) |
| `src/routes/api/public/enrich-snapshot.ts` | **NEW** — Job-driven enrichment endpoint. Reads pending enrichment_jobs for a snapshot, runs each in order, patches snapshot, updates job status. Protected by INTERNAL_API_TOKEN. |
| `src/lib/enrichment/run-enrichment.server.ts` | **NEW** — Core enrichment runner. Contains the per-type logic extracted from analyze-public-v1 (DFS, insights v1/v2, visual cover, caption semantic). Each returns a payload patch + provider call log. |
| `src/lib/enrichment/types.ts` | **NEW** — EnrichmentType, EnrichmentJobRow, EnrichmentResult types. |
| `src/lib/analysis/cache.ts` | Add `patchSnapshotPayload(snapshotId, patch)` helper (JSON merge, like existing `patchSnapshot` in enrich-comments). |

## 6. Files NOT to Touch

- P01-P07 report components
- `src/components/report/*`
- `src/styles/tokens.css`, `src/styles/tokens-light.css`
- `src/integrations/supabase/client.ts`, `types.ts`
- Auth/admin permission logic
- PDF pipeline
- `src/routes/api/public/enrich-comments.ts` (keep as-is)
- Public report UI pages
- LOCKED_FILES.md entries

## 7. Risks

| Risk | Mitigation |
|------|-----------|
| Enrichment endpoint also times out | Each enrichment patches independently; partial completion is preserved. pg_cron sweep retries remaining. |
| Race condition on snapshot payload | Use read-then-merge-then-update (same pattern as enrich-comments `patchSnapshot`). Single writer per enrichment type. |
| DataForSEO needs snapshot data for keyword derivation | Pass minimal context (profile + summary) via enrichment_jobs.input or re-read from snapshot. |
| Report renders without enrichments briefly | Already happens today when OpenAI fails. UI shows "pending" gracefully. No UI change needed. |
| Cost attribution gap during async window | Each enrichment passes `analysisEventId` to provider calls. Final `linkProviderCallsToEvent` in enrichment endpoint. |

## 8. Implementation Prompts (ordered)

### Prompt 1: Database migration
Create `enrichment_jobs` table with indexes. No code changes.

### Prompt 2: Extract enrichment runner
Create `src/lib/enrichment/types.ts` and `src/lib/enrichment/run-enrichment.server.ts`. Extract DFS, insights v1/v2, visual cover, caption semantic logic from analyze-public-v1 into standalone functions that accept snapshot context and return a payload patch.

### Prompt 3: Create enrich-snapshot endpoint
Create `src/routes/api/public/enrich-snapshot.ts`. Job-driven, INTERNAL_API_TOKEN protected. Processes pending enrichment_jobs for a given snapshot_id.

### Prompt 4: Add patchSnapshotPayload helper
Add to `src/lib/analysis/cache.ts` a generic JSON-merge patch function for snapshot payloads.

### Prompt 5: Slim down analyze-public-v1
Remove inline enrichment calls (lines ~804-1339). Replace with enrichment_jobs creation + fire-and-forget trigger. Keep Apify fetch, base snapshot, and analysis event recording.

### Prompt 6: pg_cron sweep
Add a cron job (like the existing comment sweep) to POST to `/api/public/enrich-snapshot?sweep=true` every 2 minutes, picking up any orphaned pending jobs.

### Prompt 7: Validation
Run `bunx tsc --noEmit` and `bunx vitest run`. Trigger a fresh analysis and verify enrichment_jobs complete asynchronously. Check provider_call_logs linkage and admin cost card.
