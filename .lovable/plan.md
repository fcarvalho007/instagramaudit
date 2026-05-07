
# Track module visibility publishing

## What changes

Add a fire-and-forget `product_events` insert inside the `publishDraft` function in `src/lib/report/variant-overrides.server.ts`. This is the single server-side publish point -- no UI or rendering changes needed.

## Event shape

```json
{
  "event_type": "module_visibility_published",
  "metadata": {
    "variant": "mvp_baseline",
    "admin_email": "admin@example.com",
    "published_at": "2026-05-07T...",
    "changed_modules": { "show_kpi_grid": true, "show_ai_insights": false }
  }
}
```

`changed_modules` = the features_json content being published (the draft snapshot). This is already loaded during publish so no extra DB read is needed.

## Files to modify

| File | Change |
|---|---|
| `src/lib/report/variant-overrides.server.ts` | After successful publish (upsert + delete), insert product_event. Wrapped in try/catch so failures never block publishing. |

## Files NOT to touch

- `src/server/admin/variant-overrides.functions.ts` (no changes needed, it delegates to the server helper)
- `src/components/admin/v2/module-visibility-matrix.tsx`
- Report rendering files
- Provider/analysis files

## Implementation detail

After line 110 (draft delete), add:

```ts
// Track publish event (fire-and-forget)
try {
  await supabaseAdmin.from("product_events").insert([{
    event_type: "module_visibility_published",
    metadata: {
      variant,
      admin_email: adminEmail,
      published_at: new Date().toISOString(),
      changed_modules: draft,
    },
  }]);
} catch { /* non-critical */ }
```

No schema changes. No new files.
