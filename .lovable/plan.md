## PR1 Window Validation — Rollback & Final D Test

### Step 1: Remove temporary manual entitlement
Target: `lead_entitlements` table.
Criteria:
- `lead_id` = `01bf861c-6a17-4b36-81b7-130ef2f143da`
- `product_code` = `report_full_9`
- `payment_id` is null
- `metadata->>'source'` = `manual_pr1_validation`

Action: single-row delete.

### Step 2: Confirm removal
Query the same row by the entitlement id (`7ae71c27-1c3e-4eec-9618-7be990fe6115`) and by the composite criteria above. Expect zero rows.

### Step 3: Provide browser snippet for test D
```js
await fetch("/api/analyze-public-v1", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    instagram_username: "frederico.m.carvalho",
    competitor_usernames: [],
    window: "30d"
  })
}).then(r => r.json()).then(console.log);
```

### Expected D results
- `success: false`
- `error_code: "WINDOW_REQUIRES_PRO"`
- No new entry in `credit_ledger`
- No new entry in `provider_call_logs`

### Out of scope
No code edits, schema changes, credit/payment/provider/ui changes.
