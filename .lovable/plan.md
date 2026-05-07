
# Report Lab — Variant Differences Panel & Override Status

## What will be added

Three new UI sections in `/admin/report-lab`, all read-only, no behavior changes:

### 1. Variant mode explanation (enhance existing)

Replace the single-line `MODE_LABELS` banner with richer copy:
- **Public MVP:** "Isto é o que utilizadores públicos verão."
- **Internal Lab:** "Isto é a versão de trabalho, com módulos completos e experimentais."
- **Pro Preview:** "Isto simula funcionalidades futuras/pagas."

This already exists (lines 101-105). Will keep as-is since the copy matches the requirement.

### 2. Override source badge

Add a badge next to the mode label showing whether the active preview uses:
- **Defaults estáticos** — no override rows exist for this variant
- **Draft pendente** — a draft row exists (not yet published)
- **Override publicado** — a published row exists

This calls `getAllOverrides` (already imported via `ModuleVisibilityMatrix`) to check which rows exist for the current variant. Lightweight — reuses the same server function.

### 3. "Diferenças entre variantes" collapsible panel

New collapsible section (same accordion style as the readiness checklist) showing only modules where at least one variant differs. For each:

| Módulo | Public MVP | Internal Lab | Pro Preview | Interpretação |
|--------|-----------|-------------|-------------|---------------|

Interpretations are static strings derived from the visibility pattern. A small map of known interpretations for each module key, with a generic fallback.

## Files to edit

- `src/routes/admin.report-lab.tsx` — add the two new sections (override badge + differences panel)

## Files NOT to touch

- Report components, report-variant.ts, effective-features.ts, provider logic, PDF, cost, variant-overrides server functions

## Technical approach

1. Import `getAllOverrides` from the server functions file (already used by `ModuleVisibilityMatrix`).
2. Add a `useEffect` in `ReportLabPage` that calls `getAllOverrides()` once on mount to determine override status per variant.
3. Add a `VariantDiffPanel` component that computes diffs from static defaults (`getVariantFeatures` for each variant) and renders the table.
4. Add an `OverrideSourceBadge` component next to the mode label.
5. Both new sections are pure read-only, derived from existing data. No new server functions needed.
