
## Fix: Dark flash before loader appears

### Problem

When navigating from the homepage (dark theme) to `/analyze/$username`, there's a visible dark page flash before the loader appears. This happens because:

1. The route has `ssr: false` — component only mounts after client hydration
2. `ReportThemeWrapper` sets `data-theme="light"` inside a `useEffect`, which runs after mount
3. Between navigation start and effect execution, the dark shell is visible

### Fix

**File:** `src/routes/analyze.$username.tsx`

Add a `beforeLoad` hook that sets `data-theme="light"` on `<body>` immediately on navigation — before the component mounts:

```typescript
export const Route = createFileRoute("/analyze/$username")({
  ssr: false,
  beforeLoad: () => {
    if (typeof document !== "undefined") {
      document.body.setAttribute("data-theme", "light");
    }
  },
  // ... rest unchanged
```

`beforeLoad` runs synchronously during route transition, before the component renders. This eliminates the dark gap entirely. The `typeof document` guard prevents SSR crashes.

### What remains untouched

- Backend, Apify, cache — zero changes
- Report UI, PDF, share — zero changes
- `ReportThemeWrapper` — kept as safety net (still restores dark on unmount)
- `AnalysisSkeleton` component — no changes
- Locked files — no changes

### Validation

- TypeScript check
- Vitest (103 tests)
- Visual QA: navigate from homepage to `/analyze/frederico.m.carvalho` — confirm no dark flash
