## Goal

Eliminate the race condition where concurrent enrichment jobs overwrite each other's `enrichment_status` entries via the read-merge-write pattern in `patchSnapshotPayload`.

## Race condition explained

1. Job A (insights_v1) reads `normalized_payload` — sees `{enrichment_status: {dataforseo: "success", insights_v1: "pending", ...}}`
2. Job B (insights_v2) reads `normalized_payload` — same snapshot, same state
3. Job A writes merged payload with `insights_v1: "success"`
4. Job B writes merged payload with `insights_v2: "success"` — but its copy didn't have Job A's update, so `insights_v1` reverts to `"pending"`

## Solution

Create a PostgreSQL function `set_enrichment_status(p_snapshot_id, p_key, p_value)` that uses a single atomic `jsonb_set` UPDATE. Call it via `supabaseAdmin.rpc()` from a new helper `setEnrichmentStatusAtomic()` in `cache.ts`.

## Changes

### 1. Database migration — create `set_enrichment_status` RPC

```sql
CREATE OR REPLACE FUNCTION public.set_enrichment_status(
  p_snapshot_id uuid,
  p_key text,
  p_value text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE analysis_snapshots
  SET normalized_payload = jsonb_set(
        jsonb_set(normalized_payload, '{enrichment_status}', COALESCE(normalized_payload->'enrichment_status', '{}'::jsonb)),
        ARRAY['enrichment_status', p_key],
        to_jsonb(p_value)
      ),
      updated_at = now()
  WHERE id = p_snapshot_id;
$$;
```

### 2. `src/lib/analysis/cache.ts` — add `setEnrichmentStatusAtomic`

```ts
export async function setEnrichmentStatusAtomic(
  snapshotId: string,
  key: string,
  value: string,
): Promise<boolean>
```

Calls `supabaseAdmin.rpc('set_enrichment_status', { p_snapshot_id, p_key, p_value })`.

### 3. `src/routes/api/public/enrich-snapshot.ts` — replace enrichment_status patches

Replace the two `patchSnapshotPayload` calls for `enrichment_status` (success on line 179 and error on line 201) with `setEnrichmentStatusAtomic`.

## Files changed

| File | Change |
|------|--------|
| Migration | New `set_enrichment_status` function |
| `src/lib/analysis/cache.ts` | Add `setEnrichmentStatusAtomic` helper |
| `src/routes/api/public/enrich-snapshot.ts` | Use atomic helper for enrichment_status updates |
