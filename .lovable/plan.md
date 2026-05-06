
## What exists

The async enrichment pipeline is already implemented:
- Base snapshot is persisted **before** enrichments (line ~706)
- `enrichment_jobs` rows are created per type (line ~768)
- `/api/public/enrich-snapshot` processes jobs and patches the snapshot via `patchSnapshotPayload`

**Missing**: there is no `enrichment_status` object in the snapshot payload, so the report UI has no way to know which enrichments are pending vs complete.

## Changes

### 1. Add `enrichment_status` to base snapshot payload (`analyze-public-v1.ts`)

When the base snapshot is persisted (~line 689), add:

```ts
enrichment_status: {
  insights_v1: "pending",
  insights_v2: "pending",
  visual_cover: "pending",
  caption_semantic: "pending",
  dataforseo: "pending",
  comments: "pending",
}
```

This tells any consumer that enrichments are queued but not yet complete.

### 2. Update `enrichment_status` after each job completes (`enrich-snapshot.ts`)

After a successful enrichment job patches the snapshot, also patch `enrichment_status.<type>` to `"done"`. On failure (max attempts), patch it to `"error"`.

The patch will use the existing `patchSnapshotPayload` with a nested merge for the `enrichment_status` key.

### 3. Update `patchSnapshotPayload` for nested merge (`cache.ts`)

Currently does a shallow `{ ...existing, ...patch }`. Need to deep-merge one level for `enrichment_status` so individual keys aren't lost. Simple: if both existing and patch have `enrichment_status` as objects, merge them.

### 4. Also set `enrichment_status.comments` when comment job completes

In `enrich-snapshot.ts` the comment jobs use a separate table (`comment_enrichment_jobs`), so we won't change that flow. Instead, when the comment enrichment job is created in `analyze-public-v1.ts`, it's already tracked. The comment enrichment endpoint would need a similar one-line patch -- but since the user said "do not implement all enrichments yet", we'll set comments to `"pending"` in the base and leave it for a future step.

### 5. Pass `enrichment_status` through to API response

In `buildCachedResponse`, forward the `enrichment_status` from the stored payload so cached responses also expose it.

## Files changed

| File | Change |
|------|--------|
| `src/routes/api/analyze-public-v1.ts` | Add `enrichment_status` to `baseNormalizedPayload`; forward in response |
| `src/routes/api/public/enrich-snapshot.ts` | Patch `enrichment_status.<type>` on job success/error |
| `src/lib/analysis/cache.ts` | Deep-merge `enrichment_status` in `patchSnapshotPayload` |
| `src/lib/enrichment/types.ts` | Export `EnrichmentStatusMap` type |

## Files NOT touched

- P01-P07 cards, report UI, admin UI, pricing logic, PDF pipeline, auth, design tokens, locked files

## Validation

- `bunx tsc --noEmit` -- pass
- `bunx vitest run` -- pass
- Cache-only analysis: no provider calls, returns existing snapshot (with or without `enrichment_status`)
- Fresh analysis: base snapshot persisted with all statuses as `"pending"`, enrichment endpoint updates them to `"done"`
