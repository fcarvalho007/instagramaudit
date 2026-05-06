## Goal

Strip `_thumbnail_base64` from `analysis_snapshots.normalized_payload` immediately after `visual_cover` enrichment completes successfully, reclaiming ~1.4 MB per snapshot.

## Changes

### 1. Add `removePayloadKey` helper to `src/lib/analysis/cache.ts`

A new exported function that removes a top-level key from a snapshot's `normalized_payload` using a direct SQL `jsonb - 'key'` operation (atomic, no read-merge-write needed):

```ts
export async function removePayloadKey(snapshotId: string, key: string): Promise<boolean>
```

Uses raw `.rpc` or a direct SQL update via supabaseAdmin:
```sql
UPDATE analysis_snapshots
SET normalized_payload = normalized_payload - '_thumbnail_base64',
    updated_at = now()
WHERE id = $1
```

### 2. Call cleanup in `src/routes/api/public/enrich-snapshot.ts`

After line 193 (where `visual_cover` job succeeds), add:

```ts
if (job.enrichment_type === "visual_cover") {
  await removePayloadKey(job.snapshot_id, "_thumbnail_base64");
}
```

### 3. Validation

- `bunx tsc --noEmit` passes
- `bunx vitest run` passes
- Query payload size before/after for both test profiles to confirm reduction

## Files changed

| File | Change |
|------|--------|
| `src/lib/analysis/cache.ts` | Add `removePayloadKey` function |
| `src/routes/api/public/enrich-snapshot.ts` | Call cleanup after visual_cover success |

## Risks

- None: `_thumbnail_base64` is only consumed by `run-enrichment.server.ts` during visual_cover processing, which has already completed before removal.
- `visual_cover_analysis` is persisted via `payloadPatch` before this cleanup runs.
- Cache-only report rendering does not use `_thumbnail_base64`.
