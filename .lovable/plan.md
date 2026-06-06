# Runtime validation — Free/Public enrichment gate

Objective: prove that a fresh Free/Public analysis on one allowlisted handle runs **Apify only**, marks all paid enrichments as `skipped_free`, and enqueues zero paid `enrichment_jobs`.

## Scope guard

- Allowed: 1 Apify primary scrape, real DB rows in `analysis_snapshots`, `provider_call_logs`, `analysis_events`.
- Forbidden: payments, Pro unlock, paid enrichment enqueue, OpenAI calls, DataForSEO calls.
- No code changes. Read-only validation + one HTTP call to the public analyze endpoint.

## Step 1 — Pre-checks (read-only)

1. Confirm `APIFY_ALLOWLIST` contains the target handle (read secret).
2. Pick handle (default candidate: `frederico.m.carvalho` from project knowledge — confirm it's allowlisted; if not, ask which allowlisted handle to use).
3. Confirm no fresh snapshot in last 24h:
   ```sql
   SELECT id, created_at, expires_at, analysis_status
   FROM analysis_snapshots
   WHERE instagram_username = '<handle>' AND created_at > now() - interval '24 hours'
   ORDER BY created_at DESC;
   ```
   If a fresh row exists → STOP and ask user to pick another handle (we must not skip the gate via cache).
4. Record `T0 = now()` (UTC) before triggering.

## Step 2 — Trigger Free/Public analysis

One call to the public analyze endpoint with the chosen handle, no competitors, no auth. Exact path/method discovered from `src/routes/api/analyze-public-v1.ts` (POST `/api/analyze-public-v1`). Use `stack_modern--invoke-server-function` against the preview build.

## Step 3 — Validate snapshot

```sql
SELECT id, instagram_username, created_at,
       normalized_payload->'enrichment_status' AS enrichment_status
FROM analysis_snapshots
WHERE instagram_username = '<handle>' AND created_at >= T0
ORDER BY created_at DESC LIMIT 1;
```

Expected `enrichment_status`:

| key             | expected      |
|-----------------|---------------|
| dataforseo      | skipped_free  |
| insights_v1     | skipped_free  |
| insights_v2     | skipped_free  |
| visual_cover    | skipped_free  |
| caption_semantic| skipped_free  |

Any other value → FAIL.

## Step 4 — Validate no paid jobs enqueued

```sql
SELECT enrichment_type, status, created_at
FROM enrichment_jobs
WHERE snapshot_id = '<new_snapshot_id>';
```

Expected: **0 rows** for `dataforseo`, `insights_v1`, `insights_v2`, `visual_cover`, `caption_semantic`. Ideally 0 rows total (since `FREE_ENRICHMENT_TYPES = []`). Any paid row → FAIL.

## Step 5 — Validate provider calls

```sql
SELECT provider, actor, status, created_at, source_context
FROM provider_call_logs
WHERE handle = '<handle>' AND created_at >= T0
ORDER BY created_at;
```

Expected:
- ≥1 row with `provider = 'apify'`.
- **0 rows** with `provider IN ('openai','dataforseo')`.

Also confirm no comment scraper rows (`comment_enrichment_jobs` for new snapshot_id should be empty unless explicitly free-scope).

## Step 6 — Validate UI render (optional, browser)

Open `/analyze/<handle>` in preview and confirm:
- Visão geral renders
- Engagement renders
- 5 locked premium teaser cards visible
- No Pro AI cards rendered (insights v2, visual cover, caption semantic, comment intelligence, market signals)

## Step 7 — Regression check

```sql
SELECT count(*) AS modified_pre_gate
FROM analysis_snapshots
WHERE updated_at >= T0 AND created_at < T0;
```

Expected: 0. Any non-zero → investigate which pre-gate snapshot was touched.

## Step 8 — Report

Produce final output table:
- Handle used
- Snapshot ID + created_at
- Enrichment status table (5 keys)
- Enrichment jobs found (count + types)
- Provider calls found (provider, count, status)
- PASS/FAIL per validation step
- Overall verdict + any regression

## Open questions before running

1. Confirm target handle. Default: `frederico.m.carvalho` (project test profile). Override if you want a different allowlisted handle.
2. Confirm we may invoke against the **preview** deployment (`id-preview--…lovable.app`) rather than production (`instagramaudit.lovable.app`). Preview is safer for test scrapes; production is what real users hit. Default: preview.
