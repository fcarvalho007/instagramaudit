
# Module Visibility Manager — Architecture Plan

## Readiness: PASS

The current system is clean, centralized, and has only 4 consumer files. The `app_config` table already exists for key-value settings. The architecture supports a safe override layer with minimal risk.

---

## Current State

- 10 modules defined in `VariantFeatures` interface
- 3 variants: `public_mvp`, `internal_lab`, `pro_preview`
- Static config in `VARIANT_FEATURES` constant
- 4 component files read via `useVariantFeatures()` hook
- 1 shell file reads via `getVariantFeatures(variant)` directly
- React context `ReportVariantProvider` already wraps the tree

## Answers to Planning Questions

| Question | Recommendation |
|----------|---------------|
| Global or per-report? | **Global.** Overrides apply to all reports of a given variant. Per-report overrides add complexity with no current use case. |
| Draft/published states? | **Yes.** Critical safety layer. Admin edits a draft; previews it fullscreen; publishes when confident. |
| Which modules editable now? | All 10. The matrix should show all rows. |
| Which modules locked? | `debugLabels` should be locked to "hidden" for `public_mvp` (hard constraint, not overridable). `overviewHeroKpis` locked to "full" for all variants (report breaks without it). |
| Prevent invalid combinations? | Validation rules: locked modules cannot be changed; `commentIntelligence: "full"` blocked when comment scraper is disabled (show warning). |
| How to rollback? | "Reset to defaults" button per variant that deletes the override row, falling back to static config. |

---

## Recommended Architecture

```text
┌─────────────────────────────────────────┐
│         report-variant.ts               │
│  VARIANT_FEATURES (static fallback)     │
└──────────────┬──────────────────────────┘
               │ fallback
┌──────────────▼──────────────────────────┐
│    report_variant_overrides (Supabase)  │
│  variant | features_json | is_draft    │
│  ────────┼───────────────┼────────────  │
│  public_mvp | {...}      | false        │  ← published
│  public_mvp | {...}      | true         │  ← draft (admin preview)
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    getEffectiveFeatures(variant, opts)  │
│  opts.useDraft: boolean (admin only)    │
│  1. Try load override from DB/cache     │
│  2. Merge with static fallback          │
│  3. Apply lock rules                    │
│  4. Return VariantFeatures              │
└─────────────────────────────────────────┘
```

### Data Flow

- **Public report** (`/analyze/$username`): calls `getEffectiveFeatures("public_mvp", { useDraft: false })` via a server function. Returns published override or static fallback.
- **Admin fullscreen preview**: calls `getEffectiveFeatures(variant, { useDraft: true })` to preview draft changes before publishing.
- **Report Lab matrix**: reads both draft and published states for all variants.

---

## Storage: New Supabase Table

A dedicated table (not `app_config`) because the data is structured JSON with draft/published semantics.

```sql
CREATE TABLE public.report_variant_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant text NOT NULL,          -- 'public_mvp' | 'internal_lab' | 'pro_preview'
  is_draft boolean NOT NULL DEFAULT true,
  features_json jsonb NOT NULL,   -- partial VariantFeatures (only overridden keys)
  updated_by text,                -- admin email
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variant, is_draft)
);

ALTER TABLE public.report_variant_overrides ENABLE ROW LEVEL SECURITY;
-- No RLS policies needed: table accessed only via server functions (supabaseAdmin).
```

**Why a new table instead of `app_config`?**
- `app_config` is flat key-value (`key text, value text`). Visibility config is structured JSON with draft/published dimension.
- Separate table = cleaner queries, no JSON parsing of a text column, and independent audit trail.

---

## Draft vs Published Lifecycle

```text
1. Admin opens Report Lab → Module Matrix
2. Matrix loads: published overrides (or static defaults)
3. Admin changes a cell → creates/updates DRAFT row
4. Admin clicks "Preview draft" → opens fullscreen with ?draft=true
5. Admin reviews → clicks "Publish"
6. System copies draft → published row (UPSERT)
7. Public report now reads published override
8. Admin can "Discard draft" to delete the draft row
9. Admin can "Reset to defaults" to delete both draft and published rows
```

Confirmation dialog on publish: "Isto altera o que os utilizadores públicos veem. Continuar?"

---

## Module Lock Rules (Hardcoded, Not Overridable)

| Module | Lock | Reason |
|--------|------|--------|
| `debugLabels` | `hidden` for `public_mvp` | Never expose internal labels publicly |
| `overviewHeroKpis` | `full` for all variants | Report structure depends on it |

These are enforced in `getEffectiveFeatures()` after merging overrides, so even a bad DB value cannot break the report.

---

## File-by-File Implementation Plan

### New files

| File | Purpose |
|------|---------|
| `src/lib/report/variant-overrides.server.ts` | Server-only: read/write overrides from Supabase using `supabaseAdmin` |
| `src/server/admin/variant-overrides.functions.ts` | Server functions: `getVariantOverrides`, `saveVariantDraft`, `publishVariantDraft`, `discardVariantDraft`, `resetVariantDefaults` |
| `src/lib/report/effective-features.ts` | Pure function `getEffectiveFeatures(variant, staticConfig, override?)` with lock rules. Shared by server and client. |
| `src/components/admin/v2/module-visibility-matrix.tsx` | Admin UI: matrix table with dropdowns per cell, draft indicator, publish/discard/reset buttons |

### Modified files

| File | Change |
|------|--------|
| `src/lib/report/report-variant.ts` | Export `VARIANT_FEATURES` as a named constant (already exported implicitly via `getVariantFeatures`). Add `LOCKED_MODULES` constant. Modify `getVariantFeatures` to accept optional override parameter. |
| `src/routes/admin.report-lab.tsx` | Import and render `ModuleVisibilityMatrix`. Add "Preview draft" button that opens fullscreen with `?draft=true`. |
| `src/routes/admin.report-preview.$username.tsx` | Add `draft` search param (boolean, default false). Pass to feature resolution. |
| `src/routes/analyze.$username.tsx` | Call server function to load published overrides; pass to `ReportShellV2`. |
| `src/components/report-redesign/v2/report-shell-v2.tsx` | Accept optional `featuresOverride?: VariantFeatures` prop. If provided, use it instead of calling `getVariantFeatures`. |

### Files NOT to touch

- Any V2 report block component (`report-diagnostic-block.tsx`, `caption-diagnostics-card.tsx`, etc.) — they read from `useVariantFeatures()` which will be fed the correct resolved features via context
- `report-variant.ts` context/provider system — stays as-is
- PDF pipeline, cost logic, provider logic
- Public route auth, admin layout

---

## Admin Matrix UI Sketch

```text
┌─────────────────────────────┬────────────┬──────────────┬──────────────┐
│ Module                      │ Public MVP │ Internal Lab │ Pro Preview  │
├─────────────────────────────┼────────────┼──────────────┼──────────────┤
│ Overview (Hero + KPIs)  🔒  │ full       │ full         │ full         │
│ Diagnostic (Q01–Q07)        │ [full ▾]   │ [full ▾]     │ [full ▾]     │
│ P05 Conversa (post-level)   │ [full ▾]   │ [full ▾]     │ [full ▾]     │
│ P05 Comment Intelligence    │ [hidden ▾] │ [full ▾]     │ [teaser ▾]   │
│ Legendas (P04)              │ [light ▾]  │ [full ▾]     │ [light ▾]    │
│ Market Signals              │ [full ▾]   │ [full ▾]     │ [full ▾]     │
│ Benchmark Gauge             │ [full ▾]   │ [full ▾]     │ [full ▾]     │
│ Metodologia                 │ [full ▾]   │ [full ▾]     │ [full ▾]     │
│ Beta Feedback               │ [full ▾]   │ [hidden ▾]   │ [hidden ▾]   │
│ Debug labels            🔒  │ hidden     │ [full ▾]     │ hidden       │
├─────────────────────────────┼────────────┼──────────────┼──────────────┤
│                             │ [Publish]  │              │ [Publish]    │
│                             │ [Discard]  │              │ [Discard]    │
│                             │ [Reset]    │              │ [Reset]      │
└─────────────────────────────┴────────────┴──────────────┴──────────────┘

🔒 = locked, not editable
[▾] = select dropdown: hidden / lightweight / teaser / full
Changed cells show a dot indicator (draft vs published)
```

`internal_lab` does not need publish/discard — it's admin-only and changes are immediate.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| DB override breaks report layout | Lock rules enforced in `getEffectiveFeatures()` after merge; static fallback if DB unreachable |
| Admin accidentally publishes | Confirmation dialog + draft/preview step |
| Network error loading overrides on public report | `try/catch` with static fallback; report renders with safe defaults |
| Override table doesn't exist yet (migration not run) | `getEffectiveFeatures` catches and falls back silently |
| Race condition: two admins editing same variant | Last-write-wins is acceptable for single-admin setup; `updated_by` + `updated_at` for audit |
| `internal_lab` changes affect admin preview | Intentional — internal_lab is the admin sandbox |

---

## Migration

Single migration creating the `report_variant_overrides` table. No RLS policies needed (server-only access via `supabaseAdmin`). No seed data — empty table means "use static defaults."

---

## Performance

- Public report: one additional DB query per page load (cacheable with `staleTime` in React Query)
- Admin matrix: loads all 6 rows (3 variants x 2 states) on mount
- No real-time subscription needed — admin refreshes manually or after save

---

## Summary

This adds a safe, auditable, draft-first override layer on top of the existing static config. The static `VARIANT_FEATURES` in `report-variant.ts` remains the source of truth for defaults and the guaranteed fallback. No report components change. The only new UI is the matrix in Report Lab.
