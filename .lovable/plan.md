
# Finalize Public Analysis Mode (Apify outside allowlist)

## Diagnosis

`nasa` test returned `PROFILE_NOT_ALLOWED`, which means at runtime `APIFY_TESTING_MODE` is being treated as truthy (likely `"true"`, empty/undefined, or any non-`"false"` string). The allowlist gate only opens when the env var is exactly the string `"false"`. Other guards (`APIFY_ENABLED`, caps, rate limits) are already in place.

## Plan

### Step 1 — Reapply secrets (Lovable Cloud)
Update via `secrets--update_secret` for the 6 keys, with these exact string values:

| Secret | Value |
|---|---|
| APIFY_TESTING_MODE | `false` |
| APIFY_ENABLED | `true` |
| APIFY_HARD_CAP_USD | `10` |
| APIFY_DAILY_CAP_USD | `5` |
| PUBLIC_MAX_FRESH_PER_IP_DAY | `10` |
| PUBLIC_MAX_FRESH_PER_HANDLE_DAY | `5` |

All already exist in the project — this is a re-set, not a new secret. The user will be prompted by the secrets form; they must confirm exact values (no spaces, no quotes, lowercase `false`/`true`).

### Step 2 — Wait for runtime
After secrets update, wait briefly (poll readiness) so the Worker picks up new env values before the test.

### Step 3 — Single controlled paid test
One call only:

```
POST /api/analyze-public-v1
Body: { "username": "natgeo" }
```

Captured: HTTP status, full JSON response body.

### Step 4 — Read-only DB verification
Three `supabase--read_query` reads scoped to handle `natgeo`, ordered by `created_at desc limit 1`:

1. `analysis_events` → outcome, data_source, error_code, estimated_cost_usd, analysis_snapshot_id, provider_call_log_id
2. `provider_call_logs` → status, http_status, actual_cost_usd, estimated_cost_usd, posts_returned, duration_ms, error_excerpt (truncated)
3. `analysis_snapshots` → existence + id matching event

### Step 5 — Sanitization audit on response body
Grep response JSON for forbidden leaks:
- raw Apify error strings
- stack traces (`at `, file paths)
- `run_id` / `apify_run_id`
- token-like strings (`apify_api_`, `Bearer `, `sk-`)
- internal error codes beyond the documented public set

### Step 6 — GO/NO-GO report
Single table with:
- HTTP status
- `data_source` (expect `fresh`)
- Apify called? (Y/N)
- estimated / actual cost USD
- `analysis_events.outcome`
- `provider_call_logs.status`
- Sanitization: PASS/FAIL with details
- Final verdict: GO or NO-GO

## Constraints respected
- No UI changes
- No analysis logic changes
- No OpenAI / DataForSEO manual calls
- Exactly 1 paid Apify run
- All budget + rate-limit guards remain active (not touched)

## Risks / Stop conditions
- If `APIFY_HARD_CAP_USD` or `APIFY_DAILY_CAP_USD` already consumed → expect `provider_disabled` outcome, abort and report NO-GO with cost-cap reason.
- If response leaks any forbidden field → NO-GO, list offending keys, recommend sanitization fix as separate task.
- If `data_source` returns `cache` (snapshot for `natgeo` already exists) → still valid test, but reported as inconclusive for "fresh path"; suggest using a different handle for confirmation.

## Checkpoint
☐ Secrets reapplied with exact values
☐ Runtime restarted / env propagated
☐ One POST `/api/analyze-public-v1` with `natgeo`
☐ DB verified read-only (events + provider logs + snapshot)
☐ Response sanitization audited
☐ GO/NO-GO delivered
