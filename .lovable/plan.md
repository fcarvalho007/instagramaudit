
# Centralize Report Lab Module Visibility Table

## Assessment: FAIL — duplication exists

### Current Duplication Risk

`report-variant.ts` defines `VARIANT_FEATURES` with 3 keys: `commentIntelligence`, `betaFeedbackBanner`, `debugLabels`.

`admin.report-lab.tsx` defines a separate `MODULE_VISIBILITY` array with 10 rows, using free-form strings ("Full", "Lightweight", "Hidden", "Teaser"). Only 3 of the 10 rows map to features in the central config. The other 7 rows (Overview, Diagnostic, Captions, Market Signals, Benchmark, Methodology, P05 post-level) are hardcoded as "Full" or "Lightweight" with no backing config — if a future change hides one of these modules in `public_mvp`, the table would show stale data.

Additionally, "Lightweight" is used for Captions but is not a value in `FeatureVisibility` (`"full" | "teaser" | "hidden"`), meaning the type system does not cover it.

### Proposed Central Config Shape

**1. Expand `VariantFeatures` in `report-variant.ts`** to cover all reportable modules:

```ts
export type FeatureVisibility = "full" | "lightweight" | "teaser" | "hidden";

export interface VariantFeatures {
  overviewHeroKpis: FeatureVisibility;
  diagnosticQ01Q07: FeatureVisibility;
  conversationPostLevel: FeatureVisibility;
  commentIntelligence: FeatureVisibility;
  captionsDiagnostics: FeatureVisibility;
  marketSignals: FeatureVisibility;
  benchmarkGauge: FeatureVisibility;
  methodology: FeatureVisibility;
  betaFeedbackBanner: FeatureVisibility;
  debugLabels: FeatureVisibility;
}
```

**2. Add a display-name map** (exported, for the admin table):

```ts
export const FEATURE_LABELS: Record<keyof VariantFeatures, string> = {
  overviewHeroKpis: "Overview (Hero + KPIs)",
  diagnosticQ01Q07: "Diagnostic (Q01–Q07)",
  conversationPostLevel: "P05 Conversa (post-level)",
  commentIntelligence: "P05 Comment Intelligence",
  captionsDiagnostics: "Legendas (P04)",
  marketSignals: "Market Signals",
  benchmarkGauge: "Benchmark Gauge",
  methodology: "Metodologia",
  betaFeedbackBanner: "Beta Feedback",
  debugLabels: "Debug labels",
};
```

**3. Update `VARIANT_FEATURES`** to include all keys (new keys are `"full"` or `"lightweight"` matching current actual behavior).

**4. Rewrite `ModuleVisibilityTable` in `admin.report-lab.tsx`** to import `VARIANT_FEATURES`, `FEATURE_LABELS`, and iterate over the keys — no local `MODULE_VISIBILITY` array.

### Files to Touch

| File | Change |
|------|--------|
| `src/lib/report/report-variant.ts` | Add `"lightweight"` to `FeatureVisibility`, expand `VariantFeatures` interface, expand `VARIANT_FEATURES` map, export `FEATURE_LABELS` |
| `src/routes/admin.report-lab.tsx` | Remove `MODULE_VISIBILITY` array and `ModuleRow` interface, rewrite `ModuleVisibilityTable` to derive from central config |

### Files NOT to Touch

- `report-shell-v2.tsx`, `report-comment-intelligence.tsx`, `caption-diagnostics-card.tsx`, `visual-cover-analysis-card.tsx` — no behavior change
- Any provider, cost, PDF, or Supabase files
- `tokens.css`, `styles.css`, `admin-tokens.css`

### Behavior Unchanged

The new keys (`overviewHeroKpis`, `diagnosticQ01Q07`, etc.) will all be `"full"` for every variant in this step — no rendering logic reads them yet. Existing keys (`commentIntelligence`, `betaFeedbackBanner`, `debugLabels`) keep their current values. Components that already check `useVariantFeatures()` continue to work identically.

### Implementation Order

1. Update `report-variant.ts`: add `"lightweight"` to union, expand interface + map, export `FEATURE_LABELS`.
2. Update `admin.report-lab.tsx`: delete local `MODULE_VISIBILITY`, rewrite table to iterate `FEATURE_LABELS` keys and read from `getVariantFeatures()`.
3. Validate: `tsc --noEmit` + `vitest run`.
