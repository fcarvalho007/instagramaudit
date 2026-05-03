
# Fix: "Rendered more hooks than during the previous render" in /admin

## Bug

`ExpenseSection` in `src/components/admin/v2/visao-geral/expense-section.tsx` has two `useMemo` calls (lines 118, 137) placed **after** early returns for loading/error states (lines 76-111). This violates React's rules of hooks — the number of hooks changes between renders, causing a crash.

This crashes both `/admin/visao-geral` and `/admin/receita` (which also renders `ExpenseSection`).

## Fix

Move the two `useMemo` hooks (lines 118-133 and 137-152) **before** the early returns, right after the two `useQuery` calls. The `useMemo` computations will receive `undefined` data during loading but that's fine — they won't be used because of the early returns.

### Changes

**File: `src/components/admin/v2/visao-geral/expense-section.tsx`**

1. Move `allActorKeys` useMemo to right after the `caps` useQuery (line 74), using `expense.data?.daily ?? []` instead of `data.daily`
2. Move `chartData` useMemo to right after `allActorKeys`, using `expense.data?.daily ?? []` instead of `data.daily`
3. Derive `hasActorBreakdown` from `allActorKeys` right after the memo (no hook, just a const)
4. Keep the early returns exactly as they are
5. After the early returns, `data` and `c` destructuring remain unchanged

No other files need changes. No new dependencies.
