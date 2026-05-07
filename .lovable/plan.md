
# Module Visibility Manager — Readiness & Implementation Plan

## PASS — Infrastructure Already Built (90%)

An earlier implementation created the full stack but left it **disconnected**. No new architecture is needed — just wiring.

### What already exists

| Layer | Status |
|-------|--------|
| DB table `report_variant_overrides` (variant, is_draft, features_json) | Done |
| Server CRUD: saveDraft, publishDraft, discardDraft, resetToDefaults | Done |
| Server functions: getPublishedFeatures, getDraftFeatures, getAllOverrides, etc. | Done |
| `getEffectiveFeatures()` — merges static + override + LOCKED_MODULES | Done |
| `VariantFeaturesOverrideProvider` context | Done (exported, never used) |
| `ModuleVisibilityMatrix` interactive UI (draft/publish/discard/reset) | Done (never imported) |
| Fullscreen preview `?draft=true` support | Done |
| Read-only tables in Report Lab (ModuleVisibilityTable, VisibilityResolverTable) | Done |

### What is missing

1. **Report Lab**: `ModuleVisibilityMatrix` is not imported — the interactive editor is invisible.
2. **Public route**: `/analyze/$username` uses static `getVariantFeatures()` directly, never calls `getPublishedFeatures()` or wraps with `VariantFeaturesOverrideProvider`.
3. **ReportShellV2**: does not accept or pass `VariantFeaturesOverrideProvider`.

### Locked modules (enforced by `LOCKED_MODULES` in `effective-features.ts`)

| Module | Lock | Rationale |
|--------|------|-----------|
| `overviewHeroKpis` | All variants → `full` | Core identity, cannot hide |
| `debugLabels` | public_mvp + pro_preview → `hidden` | Internal only |

Additional modules to lock (to be added):

| Module | Lock | Rationale |
|--------|------|-----------|
| `diagnosticQ01Q07` | All variants → `full` | Core diagnostics, cannot hide |
| `methodology` | public_mvp + pro_preview → `full` | Credibility anchor |

### Editable modules

All others: `conversationPostLevel`, `commentIntelligence`, `captionsDiagnostics`, `marketSignals`, `benchmarkGauge`, `betaFeedbackBanner`.

### Module visibility lifecycle

```text
Static defaults (code)
  └─► Admin edits → local changes (unsaved)
        └─► "Guardar draft" → DB row (is_draft=true)
              └─► "Preview draft" → fullscreen ?draft=true
              └─► "Publicar" → confirmation → DB row (is_draft=false), draft deleted
                    └─► Public route serves published config
              └─► "Descartar" → deletes draft row, reverts to published or static
              └─► "Reset defaults" → deletes both draft + published rows
```

### Fallback behavior

- If DB query fails → `getEffectiveFeatures` catches and returns static defaults.
- If no published override exists → static defaults used.
- Public users never see broken state.

### Storage recommendation

**Supabase table `report_variant_overrides`** (already exists). No localStorage needed for production visibility. The existing table with `(variant, is_draft)` unique constraint is the correct model.

### Draft vs Published recommendation

Already implemented correctly:
- Draft: `is_draft=true` row, visible only in admin preview with `?draft=true`
- Published: `is_draft=false` row, served to public route
- Confirmation dialog already says "Isto altera o que os utilizadores públicos veem."

---

## File-by-file implementation plan

### 1. `src/lib/report/effective-features.ts`
Add two new lock rules:
- `diagnosticQ01Q07: { variants: "*", value: "full" }`
- `methodology: { variants: ["public_mvp", "pro_preview"], value: "full" }`

### 2. `src/routes/admin.report-lab.tsx`
- Import `ModuleVisibilityMatrix` from `@/components/admin/v2/module-visibility-matrix`
- Replace or augment the read-only "Visibilidade de módulos" collapsible section with the interactive `ModuleVisibilityMatrix`
- Pass `adminEmail` and `onPreviewDraft` (opens fullscreen with `?draft=true`)

### 3. `src/components/report-redesign/v2/report-shell-v2.tsx`
- Accept optional `featuresOverride?: VariantFeatures` prop
- Wrap children with `VariantFeaturesOverrideProvider` when override is provided

### 4. `src/routes/admin.report-preview.$username.tsx`
- When `?draft=true`, call `getDraftFeatures()` and pass result as `featuresOverride` to `ReportShellV2`

### 5. Public route integration (future, minimal)
- In the route/component that renders the public report, call `getPublishedFeatures({ variant: "public_mvp" })` and pass as `featuresOverride` to `ReportShellV2`
- Fallback: if fetch fails, static defaults apply (already handled in server function)

### Files NOT to touch
- `report-variant.ts` (static defaults stay as-is, only effective-features changes)
- Report card components (no design changes)
- Provider logic, cost tracking, PDF pipeline
- `client.ts`, `types.ts`, `.env`

### Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Accidental public publish | Confirmation dialog exists; locked modules prevent catastrophic changes |
| DB failure on public route | `getPublishedFeatures` catches errors and returns static defaults |
| Admin publishes then wants rollback | "Reset defaults" deletes overrides, restoring static config instantly |
| Module matrix confusing for non-technical admin | Labels, lock icons, and draft/pub badges already in the UI |
