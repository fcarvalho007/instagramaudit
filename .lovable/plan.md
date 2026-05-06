## Problem

`enrichment_status.comments` is always initialized as `"pending"` but never updated — neither when comment scraper is disabled, nor when the job completes/fails.

## Changes

### 1. `src/routes/api/analyze-public-v1.ts` — set correct initial comments status

After the comment job creation block (~line 876), use `setEnrichmentStatusAtomic` to set:
- `"disabled"` if `runComments` is false
- `"skipped"` if `postUrls.length === 0`
- keep `"pending"` only when a job is actually created

### 2. `src/routes/api/public/enrich-comments.ts` — update status on completion

Add `setEnrichmentStatusAtomic` calls:
- `"success"` when job completes successfully (after snapshot patch)
- `"error"` when max attempts exceeded or scraper fails
- `"skipped"` when no valid post URLs

### Files

| File | Change |
|------|--------|
| `src/routes/api/analyze-public-v1.ts` | Set initial comments status based on actual state |
| `src/routes/api/public/enrich-comments.ts` | Update comments status on job completion |
