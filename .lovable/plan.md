
# Report Lab — Admin Variant Preview Page

## Readiness Assessment: PASS

All prerequisites are in place:
- Variant system (`report-variant.ts`) with `ReportVariantProvider` context
- `ReportShellV2` accepts `variant` prop
- Existing admin snapshot API (`/api/admin/snapshot/$username`)
- Existing admin auth gate and layout (`admin.tsx`)
- Existing admin preview route provides a proven pattern for loading snapshots

---

## Architecture

A new admin sub-route `/admin/report-lab` renders inside the admin layout (`admin.tsx`). It contains:

1. **Profile selector** — dropdown with known test profiles + manual input
2. **Variant switcher** — 3 segmented pills (Public MVP / Internal Lab / Pro Preview)
3. **Mode label** — contextual banner below the switcher
4. **Admin actions** — Open/copy public and internal links
5. **Module visibility table** — small reference grid showing feature visibility per variant
6. **Report render area** — `ReportShellV2` wrapped in `ReportThemeWrapper`, variant driven by switcher state

The report renders inside the admin layout chrome. No duplicate report components. The `ReportVariantProvider` in `ReportShellV2` handles all downstream feature gating.

---

## Existing Components to Reuse

| Component | Purpose |
|---|---|
| `ReportShellV2` | Full report renderer |
| `ReportThemeWrapper` | Light-theme wrapper |
| `ReportVariantProvider` | Context for variant features |
| `snapshotToReportData` | Snapshot-to-report adapter |
| `adminFetch` | Auth-aware admin API fetch |
| `AdminAuthShell` / admin layout | Auth gate (already in `admin.tsx`) |
| Snapshot API `/api/admin/snapshot/$username` | Loads latest cached snapshot |

---

## Module Visibility Reference Table

Static data derived from `VARIANT_FEATURES` in `report-variant.ts` + block-level logic:

| Module | public_mvp | internal_lab | pro_preview |
|---|---|---|---|
| Overview (Hero + KPIs) | Full | Full | Full |
| Diagnostic (Q01-Q07) | Full | Full | Full |
| P05 Conversa (post-level) | Full | Full | Full |
| P05 Comment Intelligence | Hidden | Full | Teaser |
| Captions (P04) | Lightweight | Full | Lightweight |
| Market Signals | Full | Full | Full |
| Benchmark Gauge | Full | Full | Full |
| Methodology | Full | Full | Full |
| Beta Feedback | Full | Hidden | Hidden |
| Debug labels | Hidden | Full | Hidden |

This table will be rendered as a small collapsible section on the Report Lab page.

---

## Files to Create

| File | Description |
|---|---|
| `src/routes/admin.report-lab.tsx` | New route — Report Lab page with switcher, profile selector, module table, report area |

## Files to Modify

| File | Change |
|---|---|
| `src/components/admin/v2/admin-tabs-nav.tsx` | Add "Report Lab" tab to the nav (type union + TABS array) |

## Files NOT to Touch

- `src/lib/report/report-variant.ts` (locked foundation)
- `src/components/report-redesign/v2/report-shell-v2.tsx`
- `src/components/report-redesign/v2/report-diagnostic-block.tsx`
- `src/components/report-redesign/v2/report-comment-intelligence.tsx`
- `src/styles/tokens.css`, `src/styles.css`
- Any provider/scraper/PDF/cost/revenue files
- Supabase schema — no changes needed

---

## Implementation Order

1. **Create `src/routes/admin.report-lab.tsx`** — profile selector (dropdown with frederico.m.carvalho, martimsilvai, and custom input), variant switcher (segmented control), mode label, admin action buttons, module visibility table, snapshot loading (reuse pattern from existing admin preview route), report render area with `ReportShellV2` inside `ReportThemeWrapper`.

2. **Update `src/components/admin/v2/admin-tabs-nav.tsx`** — add `/admin/report-lab` to the `TabDef` type union and `TABS` array as "Report Lab".

3. **Validate** — `tsc --noEmit` + `vitest run`. Confirm public route `/analyze/$username` still uses `public_mvp` only.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Report Lab accidentally visible to public users | Route lives under `/admin` layout which has auth gate; `noindex, nofollow` meta |
| Variant switcher leaks into public report | Switcher is local state in the admin route, never touches `ReportShellV2` internals |
| Light theme CSS conflicts with admin dark chrome | `ReportThemeWrapper` scopes `data-theme="light"` to the report container only |
| Snapshot loading duplicates code from admin preview | Extract the snapshot-loading pattern into the route directly (same pattern, not shared abstraction yet — avoids touching locked/existing files) |
