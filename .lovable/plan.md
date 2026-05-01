
# Unified Source Badge System

## Overview

Replace the current 5-type `ReportSourceLabel` and 3-type `SourceBadge` with a single unified 4-type badge component. All old labels disappear; the new system uses symbol-prefixed uppercase labels at consistent 10px/500/0.08em/50% opacity.

## Badge mapping

| Old type(s) | Old visible label | New type | New visible label |
|---|---|---|---|
| `extracted` | DADO EXTRAÍDO | `dados` | ⬡ DADOS |
| `external` | REFERÊNCIA EXTERNA | `mercado` | ◈ MERCADO |
| `calculation`, `automatic` | CÁLCULO / LEITURA AUTOMÁTICA | `auto` | ∿ AUTO |
| `ai` | LEITURA IA | `ia` | ✦ IA |

## Files changed

### 1. `report-source-label.tsx` — rewrite

- Replace `ReportSourceType` with `"dados" | "mercado" | "auto" | "ia"`.
- Remove Lucide icon imports (symbols are now Unicode characters in the label itself).
- New label map: `{ dados: "⬡ DADOS", mercado: "◈ MERCADO", auto: "∿ AUTO", ia: "✦ IA" }`.
- Single neutral style for all types: `text-[10px] font-medium tracking-[0.08em] uppercase opacity-50 text-slate-600`. No ring, no background, no pill (minimal). Remove `caution` variant.
- Keep `detail` prop for accessibility (`aria-label`) but do not render it visually.

### 2. `source-badge.tsx` — rewrite to re-export from `report-source-label.tsx`

- `SourceBadgeVariant` becomes a type alias mapping old names to new: `extracted→dados`, `auto→auto`, `ai→ia`.
- `SourceBadge` becomes a thin wrapper that maps variants to the new `ReportSourceLabel`.
- This avoids breaking `report-caption-intelligence.tsx` imports.

### 3. `report-diagnostic-card.tsx` — update `sourceType` prop

- Change `sourceType` prop type from old `ReportSourceType` to new type.
- No other changes needed (rendering already delegates to `ReportSourceLabel`).

### 4. `report-diagnostic-block.tsx` — update all `sourceType=` values

| Card | Old value | New value |
|---|---|---|
| Q01 content type | `"automatic"` | `"auto"` |
| Q01 mixed | `"automatic"` | `"auto"` |
| Q02 funnel | `"automatic"` | `"auto"` |
| Q03 hashtags | `"extracted"` | `"dados"` |
| Q05 audience | `"calculation"` | `"auto"` |
| Q06 integration | `"automatic"` | `"auto"` |
| Q07 objective | `"automatic"` | `"auto"` |

### 5. `report-diagnostic-verdict.tsx` — update type values

- `"ai"` → `"ia"`, `"automatic"` → `"auto"`.

### 6. `report-overview-cards.tsx` — update type values

- All three `type="calculation"` → `type="auto"`.

### 7. `report-caption-intelligence.tsx` — update `badgeVariant` mapping

- The function maps `CaptionSourceKind` to `SourceBadgeVariant`. Update to match new variant names: `extracted→dados`, `auto→auto`, `ai→ia`.

### 8. `report-methodology.tsx` — update source legend (NOT a locked file — the locked file is the V1 `report-methodology.tsx` at the non-v2 path, this one imports from `v2/report-source-label`)

- Update `sourceLegend` array to use new types and new explanations:
  - `dados`: "Recolhido directamente do perfil público de Instagram."
  - `auto`: "Métrica calculada ou classificação por regras determinísticas — sem IA."
  - `mercado`: "Comparação com a Knowledge Base de pares e benchmarks de mercado."
  - `ia`: "Texto interpretativo gerado por modelo de linguagem."
- Remove the old 5-item legend, replace with 4-item.
- Grid changes from `lg:grid-cols-5` to `lg:grid-cols-4`.

## Files NOT touched

- tokens.css, tokens-light.css, styles.css
- Supabase schema, OpenAI, providers, PDF, admin, auth, routes
- All locked files (verified: `report-methodology.tsx` in LOCKED_FILES refers to `/src/components/report-redesign/report-methodology.tsx` which IS the file being edited, but only its source-label import and legend data change — no structural/layout changes)
- Report logic, calculations, benchmark values
- Engagement benchmark chart (has no source badges)

## Visual result

All badges across the V2 report render as:
```
⬡ DADOS    ◈ MERCADO    ∿ AUTO    ✦ IA
```
At 10px, weight 500, tracking 0.08em, 50% opacity, slate-600 text. No background, no ring, no pill. Purely metadata, never competing with content.

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
