
# Public Readiness Checklist for Report Lab

## Proposed Config Structure

Add a static readiness map to `report-variant.ts`, co-located with the existing `FEATURE_LABELS` and `VARIANT_FEATURES`. This keeps all module metadata in one file.

```ts
export type ReadinessStatus =
  | "ready"
  | "needs_review"
  | "internal_only"
  | "pro_candidate"
  | "hidden";

export type RiskLevel = "low" | "medium" | "high";

export interface ModuleReadiness {
  status: ReadinessStatus;
  risk: RiskLevel;
  note: string;
}

export const MODULE_READINESS: Record<keyof VariantFeatures, ModuleReadiness> = {
  overviewHeroKpis:      { status: "ready",         risk: "low",    note: "Estável. KPIs derivados do scraper principal." },
  diagnosticQ01Q07:      { status: "ready",         risk: "low",    note: "Cards Q01–Q07 validados com dados reais." },
  conversationPostLevel: { status: "ready",         risk: "low",    note: "Métricas de conversa por post, sem comment scraper." },
  commentIntelligence:   { status: "pro_candidate", risk: "low",    note: "Depende do comment scraper (desativado). Pro teaser ativo." },
  captionsDiagnostics:   { status: "needs_review",  risk: "medium", note: "Lightweight em MVP. Rever copy e fallback sem dados." },
  marketSignals:         { status: "needs_review",  risk: "medium", note: "Depende de DataForSEO. Verificar fallback quando bloqueado." },
  benchmarkGauge:        { status: "needs_review",  risk: "medium", note: "Funcional, mas rever labels e fallback sem reference data." },
  methodology:           { status: "ready",         risk: "low",    note: "Secção informativa estática." },
  betaFeedbackBanner:    { status: "ready",         risk: "low",    note: "Banner de feedback. Remover quando sair de beta." },
  debugLabels:           { status: "hidden",         risk: "low",    note: "Interno. Nunca visível em public_mvp." },
};
```

## Report Lab UI

Add a collapsible "Checklist de prontidão pública" section in `admin.report-lab.tsx`, below the existing module visibility table. It renders a compact table derived from `MODULE_READINESS` + `getVariantFeatures("public_mvp")`:

| Módulo | MVP | Estado | Risco | Nota |
|--------|-----|--------|-------|------|
| Overview | Full | Ready | Low | ... |
| Captions | Lightweight | Needs review | Medium | ... |

Status badges use color coding (green/amber/blue/purple/gray). Risk uses dot indicators (green/amber/red).

## Files to Touch

| File | Change |
|------|--------|
| `src/lib/report/report-variant.ts` | Add `ReadinessStatus`, `RiskLevel`, `ModuleReadiness` types and `MODULE_READINESS` map |
| `src/routes/admin.report-lab.tsx` | Add collapsible readiness checklist table importing from central config |

## Files NOT to Touch

Report components, providers, cost/revenue, PDF, Supabase schema, tokens CSS.

## Implementation Order

1. Add types + `MODULE_READINESS` to `report-variant.ts`.
2. Add `ReadinessChecklist` component to `admin.report-lab.tsx`.
3. Validate: `tsc --noEmit` + `vitest run`.
