## Current state

The API (`/api/admin/analysis-cost-breakdown`) already groups by enrichment_type and picks the latest job status (line 125-133: ordered DESC by `created_at`, first-wins per type). This is correct.

What's missing: visibility into historical failures when the latest job succeeded.

## Changes

### 1. API — add `enrichment_history` to response

In `src/routes/api/admin/analysis-cost-breakdown.ts`, after building `enrichmentSummary`, also compute a `enrichment_history` map: `Record<string, { total_attempts: number; failed_attempts: number }>`.

Count all jobs per type and how many had `status = 'error'`. Only include types where `failed_attempts > 0`.

### 2. UI — show history indicator in `EnrichmentDots`

In `src/components/admin/v2/sistema/analysis-cost-breakdown.tsx`:

- Accept `enrichment_history` as optional prop on `EnrichmentDots`
- For each type with previous failures, show a small superscript number (e.g. `×2`) or tooltip text like "2 tentativas falhadas anteriores"
- Use `text-foreground-muted` for the indicator so it doesn't compete with the current status dot

### Files changed

| File | Change |
|------|--------|
| `src/routes/api/admin/analysis-cost-breakdown.ts` | Add `enrichment_history` field |
| `src/components/admin/v2/sistema/analysis-cost-breakdown.tsx` | Display history indicator in EnrichmentDots |
