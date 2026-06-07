## PR1 window validation — setup for browser session

### Current state (confirmed)

- **Lead:** `01bf861c-6a17-4b36-81b7-130ef2f143da` — `frederico.carvalho@digitalfc.pt` (created 2026-06-06)
- **Credit balance:** `1` (≥ 1, so no top-up needed)
- **Existing `report_full_9` entitlement:** none
- **Latest snapshot for `frederico.m.carvalho`:** baseline (no `window_kind`), `cache_key = v1:frederico.m.carvalho|`, expires 2026-06-08 13:34Z — cached and reusable for the baseline A call

### Step 1 — Grant temporary QA entitlement (Edit mode)

```sql
INSERT INTO lead_entitlements (lead_id, product_code, payment_id, metadata)
VALUES (
  '01bf861c-6a17-4b36-81b7-130ef2f143da',
  'report_full_9',
  NULL,
  jsonb_build_object(
    'source', 'manual_pr1_validation',
    'session', 'auditprofiles_browser',
    't0', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )
);
```

Then re-read to confirm exactly one new row with `metadata.source = 'manual_pr1_validation'` and `payment_id IS NULL`.

### Step 2 — Hand off to user for browser calls (B & C)

The user runs these in the DevTools console on `auditprofiles.com` (same tab as the logged-in lead session). All use `credentials: "include"` so the session cookie is sent. No `INTERNAL_API_TOKEN`.

**A — Baseline (Free, no window) — should still work, no credit consumed:**
```js
await fetch('/api/analyze-public-v1', {
  method: 'POST', credentials: 'include',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ username: 'frederico.m.carvalho' })
}).then(r => r.json())
```

**B — First Pro 30d call — should succeed and consume 1 credit:**
```js
await fetch('/api/analyze-public-v1', {
  method: 'POST', credentials: 'include',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ username: 'frederico.m.carvalho', window: '30d' })
}).then(r => r.json())
```

**C — Repeat Pro 30d call — should hit cache, NOT consume another credit:**
```js
// Same call as B, run again immediately
await fetch('/api/analyze-public-v1', {
  method: 'POST', credentials: 'include',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ username: 'frederico.m.carvalho', window: '30d' })
}).then(r => r.json())
```

User pastes the three JSON responses back. I verify:
- A → `success: true`, baseline payload
- B → `success: true`, `data_source` fresh, credit ledger now `0` (1 debit appended with `reason` referencing 30d run)
- C → `success: true`, `data_source` cache/stale, ledger unchanged

### Step 3 — Rollback temporary entitlement (Edit mode, after B+C)

Once B+C are confirmed, delete ONLY the QA row, scoped by metadata so paid rows can never match:

```sql
DELETE FROM lead_entitlements
WHERE lead_id = '01bf861c-6a17-4b36-81b7-130ef2f143da'
  AND product_code = 'report_full_9'
  AND payment_id IS NULL
  AND metadata->>'source' = 'manual_pr1_validation';
```

Re-read and confirm 0 entitlements for the lead.

### Step 4 — Hand off for browser call D

**D — Free 30d after rollback — should return `WINDOW_REQUIRES_PRO`:**
```js
await fetch('/api/analyze-public-v1', {
  method: 'POST', credentials: 'include',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ username: 'frederico.m.carvalho', window: '30d' })
}).then(r => r.json())
```

Expected: HTTP 4xx with `error: "WINDOW_REQUIRES_PRO"` (or analogous code). No credit consumed.

### Out of scope (untouched)

Payments, checkout, EuPago, schema, Apify, OpenAI, DataForSEO, `INTERNAL_API_TOKEN`, 90d window. No code changes; only one row inserted then deleted in `lead_entitlements`.

### Pause points

- After Step 1 → ask user to run A, B, C and paste outputs.
- After Step 3 → ask user to run D and paste output.
