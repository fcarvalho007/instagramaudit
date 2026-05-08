
# Block-Level Visibility by Report Variant

## Summary

Add 6 block-level visibility keys to `VariantFeatures`, gate each block in `ReportShellV2`, filter sidebar/mobile nav, and enhance the Report Lab variant selector with clearer labels and a block visibility summary.

## Files to change

### 1. `src/lib/report/report-variant.ts` — Add block keys

Add to `VariantFeatures`:
```
blockOverview: FeatureVisibility
blockDiagnosis: FeatureVisibility
blockPerformance: FeatureVisibility
blockContent: FeatureVisibility
blockSearch: FeatureVisibility
blockBenchmark: FeatureVisibility
```

Default values per variant:

| Block | public_mvp | internal_lab | pro_preview |
|-------|-----------|-------------|-------------|
| blockOverview | full | full | full |
| blockDiagnosis | full | full | full |
| blockPerformance | hidden | full | full |
| blockContent | hidden | full | full |
| blockSearch | hidden | full | full |
| blockBenchmark | hidden | full | full |

Add to `FEATURE_LABELS` and `MODULE_READINESS` accordingly.

### 2. `src/components/report-redesign/v2/block-config.ts` — Map block IDs to feature keys

Add a `featureKey` field to `BlockConfig` linking each block's `id` to its `VariantFeatures` key:
- `overview` → `blockOverview`
- `diagnostico` → `blockDiagnosis`
- `performance` → `blockPerformance`
- `conteudo` → `blockContent`
- `procura` → `blockSearch`
- `benchmark` → `blockBenchmark`

### 3. `src/components/report-redesign/v2/report-shell-v2.tsx` — Gate blocks

- Import `useVariantFeatures` (already available via context).
- Before each `<ReportBlockSection>`, check `features[block.featureKey] !== "hidden"`.
- Compute a `visibleBlocks` array and pass only visible blocks to the nav components.

### 4. `src/components/report-redesign/v2/report-block-nav.tsx` — Filter nav

- Accept an optional `visibleBlockIds` prop (or read features from context).
- Sidebar and mobile bottom nav only render blocks whose feature key is not `hidden`.
- `useActiveBlock` receives filtered IDs.

### 5. `src/routes/admin.report-lab.tsx` — Improve variant selector + block summary

**Variant selector improvements:**
- Change labels from `"Public MVP"` → `"Público"`, `"Internal Lab"` → `"Trabalho/Admin"`, `"Pro Preview"` → `"Pro (simulação)"`
- Add descriptions under each variant:
  - Público: "O que o público geral vê — apenas blocos 01 e 02"
  - Trabalho/Admin: "Versão completa com todos os blocos e módulos experimentais"
  - Pro (simulação): "Simulação de relatório avançado/pago — todos os blocos"

**Block visibility summary:**
- Below the variant selector, show a compact grid:
  - `Bloco 01 Visão geral — ✓ visível` / `Bloco 03 Desempenho — oculto`
- Derived from the active variant's resolved features.

### 6. `src/components/admin/v2/module-visibility-matrix.tsx` — Include block keys

The matrix already iterates `FEATURE_LABELS`. Since block keys will be added there, they'll appear automatically. No code change needed unless the matrix needs grouping — in which case add a simple "Blocos" / "Módulos" separator.

## Not changed

- No data/scoring/provider changes
- No Supabase schema changes
- No PDF pipeline changes
- No design changes to visible blocks
- Public route already uses `variant="public_mvp"` — gating is purely additive

## Validation

- `bunx tsc --noEmit`
- `/analyze/frederico.m.carvalho` renders only blocks 01 + 02
- Report Lab with `internal_lab` renders all 6 blocks
- Sidebar/mobile nav only shows visible blocks
- Block numbering stays correct (01, 02 for public; 01–06 for internal)
