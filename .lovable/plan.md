
# Fullscreen Admin Report Preview with Variant Support

## Discovery

The route `/admin/report-preview/$username` already exists as a fullscreen admin-protected preview **outside the admin layout**. It renders `ReportShellV2` inside `ReportThemeWrapper` with its own auth gate (localStorage `simple-gate`), admin banner, and coverage strip. It currently hardcodes `variant="internal_lab"`.

No new route is needed. We extend the existing one.

## Readiness: PASS

The architecture is already in place. This is a small, low-risk enhancement.

---

## What changes

### 1. Add `variant` search param to `admin.report-preview.$username.tsx`

- Add `validateSearch` with zod schema: `{ variant: fallback(z.enum(["public_mvp","internal_lab","pro_preview"]), "public_mvp") }`
- Pass the validated variant to `ReportShellV2` instead of hardcoded `"internal_lab"`
- Update the admin banner to show which variant is active (reuse `MODE_LABELS`/`MODE_TONES` pattern from report-lab)

### 2. Add fullscreen preview links to `admin.report-lab.tsx`

- Add a "Fullscreen preview" section in the control panel with three links:
  - Public MVP → `/admin/report-preview/{activeProfile}?variant=public_mvp`
  - Internal Lab → `/admin/report-preview/{activeProfile}?variant=internal_lab`
  - Pro Preview → `/admin/report-preview/{activeProfile}?variant=pro_preview`
- Add a "Copy fullscreen URL" button for the current variant
- Links open in new tab (`target="_blank"`)

---

## Files to touch

| File | Change |
|------|--------|
| `src/routes/admin.report-preview.$username.tsx` | Add `validateSearch` for variant, pass to `ReportShellV2`, update banner label |
| `src/routes/admin.report-lab.tsx` | Add fullscreen preview links section |

## Files NOT to touch

- `ReportShellV2`, `ReportThemeWrapper`, any report component
- `report-variant.ts`, `snapshot-to-report-data.ts`
- Public route `/analyze/$username`
- PDF pipeline, provider logic, cost logic
- Admin layout (`admin.tsx`)
- `admin.report-preview.snapshot.$snapshotId.tsx` (separate scope)

## Auth approach

Reuses existing `simple-gate` auth in `admin.report-preview.$username.tsx` (localStorage email + `AdminGate` component). No change needed — already works independently from the admin layout gate.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Search param not validated → wrong variant | Zod schema with `fallback` defaults to `public_mvp` |
| Existing bookmarks break | No — current route has no search params, adding optional ones is backward-compatible; default changes from hardcoded `internal_lab` to `public_mvp` but this is intentional |
| Snapshot route (`snapshot.$snapshotId`) not updated | Out of scope; can be done in a follow-up if needed |

## Proposed URL format

```
/admin/report-preview/frederico.m.carvalho?variant=public_mvp
/admin/report-preview/frederico.m.carvalho?variant=internal_lab
/admin/report-preview/frederico.m.carvalho?variant=pro_preview
```
