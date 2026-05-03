
# Admin Cost Transparency — Apify Actor Breakdown

## Audit Findings

### 1. Files that compute `/admin` expenses
- **`src/components/admin/v2/visao-geral/expense-section.tsx`** — renders the Despesas section (4 provider columns + chart)
- **`src/lib/admin/system-queries.server.ts`** — `fetchExpense30d()` (line 469) aggregates from `provider_call_logs`, plus `aggregateCostsFromLogs()` (line 308) which groups by provider only (no actor-level)
- **`src/routes/api/admin/sistema.expense-30d.ts`** — API route that calls `fetchExpense30d()`

### 2. Files that compute `/admin/sistema` cost details
- **`src/components/admin/v2/sistema/costs-detail-section.tsx`** — renders KPIs (24h costs), recent calls table, alerts, and imports `CommentScraperCard`
- **`src/components/admin/v2/sistema/comment-scraper-card.tsx`** — standalone card with different visual style from the KPIs
- **`src/lib/admin/system-queries.server.ts`** — `fetchCostMetrics24h()` (line 359), `fetchCommentScraperMetrics()` (line 622)
- **`src/routes/api/admin/sistema.comment-scraper.ts`** and `sistema.cost-metrics-24h.ts` — API routes

### 3. Where Apify calls are grouped
- `aggregateCostsFromLogs()` groups by `provider` only — no `actor` column is read
- `fetchExpense30d()` has a separate sub-query for `apify/instagram-comment-scraper` but returns it as a flat sub-object, not a general actor breakdown
- `fetchCommentScraperMetrics()` queries only the comment scraper actor

### 4. Actor-level aggregation
Does NOT exist as a general mechanism. Comment scraper is hard-coded as a special case. No general "Apify actors" breakdown.

### 5. `actual_cost_usd` and `estimated_cost_usd` availability
Both columns exist in `provider_call_logs` and are already selected. The cost formula `actual_cost_usd ?? estimated_cost_usd` is used consistently. However, the UI does not distinguish between actual and estimated — it just shows a single number.

### 6. Files that need to change
- `src/lib/admin/system-queries.server.ts` — add actor-level aggregation
- `src/routes/api/admin/sistema.expense-30d.ts` — expose new data (or modify existing response)
- `src/components/admin/v2/visao-geral/expense-section.tsx` — add actor breakdown under Apify column
- `src/components/admin/v2/sistema/costs-detail-section.tsx` — replace standalone comment card with unified actor breakdown
- `src/components/admin/v2/sistema/comment-scraper-card.tsx` — refactor into the new actor breakdown (may keep for config display)

### 7. Locked files
None of the files above appear in LOCKED_FILES.md. Safe to proceed.

### 8. Tests to add/update
- No existing tests for these admin components or queries
- Add unit test for the actor aggregation function (pure logic, testable without DB)

---

## Implementation Plan

### Step 1 — Server: Actor-level aggregation

In `system-queries.server.ts`:

Add a new exported function `aggregateApifyActorBreakdown(sinceIso)` that queries `provider_call_logs` for `provider = 'apify'` and groups by `actor`. For each actor, compute:

```
{
  actor: string,           // e.g. "apify/instagram-scraper"
  label: string,           // Portuguese label
  total_cost_usd: number,  // actual ?? estimated
  actual_total_usd: number,
  estimated_total_usd: number,
  unavailable_count: number, // rows where both are null
  run_count: number,        // success/ok count
  error_count: number,
  total_results: number,    // sum of posts_returned
  avg_cost_per_run: number | null,
  cost_per_1k_results: number | null,
  last_run_at: string | null,
  last_run_status: string | null,
  last_run_cost_usd: number | null,
  cost_source: "actual" | "estimated" | "mixed" | "unavailable",
  included_in_free_report: boolean
}
```

The function returns `ApifyActorBreakdown[]` with one entry per known actor (always include profile scraper, comment scraper; post scraper only if present). Comment scraper always appears even with 0 runs.

Add this to `Expense30d` interface as `apify_actors: ApifyActorBreakdown[]`, replacing the flat `comment_scraper` sub-object.

Update `fetchExpense30d()` to call this function and include the result.

### Step 2 — API: Expose actor breakdown

`sistema.expense-30d.ts` already returns `Expense30d` — no route change needed, just the type grows.

Also update `sistema.cost-metrics-24h.ts` to include a 24h actor breakdown (same structure, shorter window).

### Step 3 — `/admin` Despesas: Actor breakdown under Apify column

In `expense-section.tsx`, under the existing Apify `ExpenseColumn`, replace the current `comment_scraper` conditional block with a general actor breakdown:

- Render a compact list of actor rows inside the Apify column
- Each row: actor label, cost (with source indicator), run count, status dot
- Comment scraper always visible (show "Sem execucoes" if 0 runs)
- Visual style: same `rounded-md border border-admin-border bg-admin-surface-muted/40 px-3 py-2.5` pattern already used
- On mobile: stack vertically, full width, no horizontal overflow

### Step 4 — `/admin/sistema` Costs: Unified actor breakdown

In `costs-detail-section.tsx`:

- Add a new "Apify — decomposicao por actor" section between the KPIs and the recent calls table
- Use the same `KPICard` visual language for consistency
- Each actor gets a sub-card with: cost (actual vs estimated clearly labelled), runs, errors, results, avg cost, last run info
- The comment scraper config section (actor name, hard max, target, posts, resultsLimit, replies, timeout, flag) stays but moves inside the actor's expandable area
- Fix the `resultsLimit` wording: "Limite total alvo: X comentarios", "Limite por post calculado: Y", "Posts por analise: ate 12", "Hard max: $0.20/run", "Alvo: $0.15/analise"
- Remove `CommentScraperCard` as a standalone import; absorb its content into the unified breakdown

### Step 5 — Cost source clarity

Everywhere a cost is displayed in the actor breakdown:

- Show the primary number as `displayCostUsd = actual ?? estimated ?? null`
- Next to it, a small badge or label: "Real" (green), "Estimado" (amber), "Indisponivel" (grey)
- If mixed (some runs actual, some estimated), show "Misto" with tooltip/breakdown

### Step 6 — Mobile

- Actor breakdown uses `grid grid-cols-1` on mobile
- Expandable details for each actor (chevron pattern, same as `AnalysisCostBreakdown`)
- No horizontal overflow on 375px
- Actor name and cost never truncated

### Step 7 — Validation

- `tsc --noEmit` passes
- `vitest run` — 78+ tests pass
- Visual QA via browser tools at 375px and 1460px on both `/admin` and `/admin/sistema`

---

## Files Changed (summary)

| File | Change |
|------|--------|
| `src/lib/admin/system-queries.server.ts` | Add `ApifyActorBreakdown` type + `aggregateApifyActorBreakdown()` function; update `Expense30d` and `Cost24hMetrics` interfaces |
| `src/routes/api/admin/sistema.cost-metrics-24h.ts` | No change (type auto-updates) |
| `src/routes/api/admin/sistema.expense-30d.ts` | No change (type auto-updates) |
| `src/components/admin/v2/visao-geral/expense-section.tsx` | Replace comment_scraper block with general actor breakdown |
| `src/components/admin/v2/sistema/costs-detail-section.tsx` | Add unified actor breakdown section, remove standalone CommentScraperCard import |
| `src/components/admin/v2/sistema/comment-scraper-card.tsx` | Keep file but refactor — config section becomes a reusable sub-component used inside the unified breakdown |

No locked files are touched.
