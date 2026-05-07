
# Fullscreen Admin Report Preview — Readiness Assessment

## PASS — Already Implemented (95%)

The fullscreen admin-protected report preview **already exists** at:

```
/admin/report-preview/{username}?variant=public_mvp&draft=false
```

### What exists today

| Requirement | Status |
|------------|--------|
| Fullscreen route outside admin layout | Done — `admin.report-preview.$username.tsx` |
| Uses `ReportShellV2` + `ReportThemeWrapper` | Done |
| Uses existing snapshot loading logic | Done |
| Supports `?variant=` param (public_mvp, internal_lab, pro_preview) | Done |
| Supports `?draft=` param for visibility overrides | Done |
| Admin auth gate (simple-gate localStorage) | Done |
| No admin nav/tabs/container | Done |
| `noindex, nofollow` | Done |
| Snapshot-by-ID route | Done — `admin.report-preview.snapshot.$snapshotId.tsx` |
| "Open fullscreen current variant" button in Report Lab | Done |
| "Copy fullscreen URL" button in Report Lab | Done |
| "Open public report" button | Done |
| "Copy public report URL" button | Done |

### What is missing

One small gap: the Report Lab has a single "Open fullscreen" button for the **currently selected** variant. The request asks for **separate buttons per variant** (Public MVP, Internal Lab, Pro Preview) so the admin can jump to any variant without switching the selector first.

### Proposed change

In `src/routes/admin.report-lab.tsx`, replace the single "Abrir fullscreen" button (line ~320-323) with three per-variant buttons:

- "Fullscreen · Public MVP" -> opens `/admin/report-preview/{profile}?variant=public_mvp`
- "Fullscreen · Internal Lab" -> opens `/admin/report-preview/{profile}?variant=internal_lab`
- "Fullscreen · Pro Preview" -> opens `/admin/report-preview/{profile}?variant=pro_preview`

Keep the existing "Copy fullscreen URL" button (copies the currently selected variant).

### Files to touch

- `src/routes/admin.report-lab.tsx` — replace single fullscreen button with three per-variant buttons

### Files NOT to touch

Everything else. No new routes needed. No component changes. No backend changes.

### Risks

None. This is a UI-only change to add two extra buttons.
