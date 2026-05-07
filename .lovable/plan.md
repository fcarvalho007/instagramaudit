
# Report Lab: Shareable URLs + Remembered Selection

## Readiness: PASS

The route already uses local `useState` for `profile`, `customProfile`, and `variant`. Adding `validateSearch` and localStorage persistence is straightforward with no risk to other routes.

## Proposed Implementation

### 1. Add `validateSearch` to the route config

```ts
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

const labSearchSchema = z.object({
  profile: fallback(z.string(), "").default(""),
  variant: fallback(
    z.enum(["public_mvp", "internal_lab", "pro_preview"]),
    "internal_lab",
  ).default("internal_lab"),
});

export const Route = createFileRoute("/admin/report-lab")({
  validateSearch: zodValidator(labSearchSchema),
  component: ReportLabPage,
});
```

### 2. Initialize state from: query params > localStorage > defaults

On mount, `Route.useSearch()` provides validated params. If `profile` is empty, check localStorage key `admin.report-lab.last` (JSON `{ profile, variant }`). If still empty, fall back to `"frederico.m.carvalho"` / `"internal_lab"`.

### 3. Sync state changes back to URL + localStorage

When profile or variant changes, call `navigate({ search: ... })` with the new values (no reload) and write to localStorage.

### 4. "Copy current lab URL" button

Already partially exists (there are copy buttons). Add a dedicated button that copies the full URL including current `?profile=...&variant=...` params to clipboard.

### 5. Distinguish preset vs custom profile

If the search param `profile` matches a `TEST_PROFILES` entry, set the dropdown. Otherwise treat it as a custom profile input.

## Files to Touch

| File | Change |
|------|--------|
| `src/routes/admin.report-lab.tsx` | Add `validateSearch`, replace `useState` init with search-param-aware logic, add localStorage read/write, add navigate calls on state change, add copy-lab-URL button |

## Files NOT to Touch

Everything else — no report components, no variant config, no provider/cost/PDF files, no public routes.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| URL update on every keystroke in custom profile input | Only update URL on blur/submit of custom input, not on every keystroke |
| localStorage SSR access | Guard with `typeof window !== "undefined"` |
| Stale localStorage pointing to deleted profile | The snapshot loader already handles missing profiles gracefully (shows "missing" state) |
