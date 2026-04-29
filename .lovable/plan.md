## Smoke Test Plan — `frederico.m.carvalho`

Read-only Plan Mode blocks the destructive `DELETE` and the `POST` call. Approving this plan switches to default mode so I can execute the steps below exactly as specified — no code changes, no retries, single fresh call.

### Step 1 — Invalidate cached snapshot (single-shot migration)
Apply exactly:
```sql
DELETE FROM public.analysis_snapshots
WHERE instagram_username = 'frederico.m.carvalho';
```

### Step 2 — Verify deletion
```sql
SELECT count(*) FROM public.analysis_snapshots
WHERE instagram_username = 'frederico.m.carvalho';
```
Abort if result ≠ 0.

### Step 3 — Capture baseline log IDs
Record the latest `provider_call_logs.id` per provider (`apify`, `dataforseo`, `openai`) BEFORE the call, so I can isolate rows created by this run.

### Step 4 — Single fresh call (no retry)
```
POST /api/analyze-public-v1
Body: { "instagram_username": "frederico.m.carvalho" }
```
Using `stack_modern--invoke-server-function` against the published URL. Exactly one invocation. If it fails, stop and report.

### Step 5 — Collect evidence
Read-only SQL only:
- New snapshot row → `snapshot_id`, `created_at`, `data_source`, presence + content of `normalized_payload.market_signals_free` and `normalized_payload.ai_insights_v1`, evidence paths.
- `provider_call_logs` rows created after baseline IDs, grouped by provider (apify, dataforseo, openai).

### Step 6 — Report
Emit the exact reporting format from the prompt and a final SAFE / NOT SAFE classification.

### Constraints honored
- No UI / PDF / `/report/example` / locked-files changes.
- No code changes.
- No second smoke test, no extra provider calls.
- Stop immediately on any provider failure or validator rejection.

### Technical notes
- Migration tool will request user approval automatically — that is the only write.
- Endpoint call uses production deployment (where DataForSEO inline pipeline is live).
- Evidence-path extraction walks `ai_insights_v1[].evidence` if the shape exists; otherwise reports "shape not found".
