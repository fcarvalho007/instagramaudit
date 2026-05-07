
# Public MVP Lock Plan

## 1. Current `public_mvp` module visibility (static defaults)

| Module | Visibility | Status |
|---|---|---|
| overviewHeroKpis | **full** | Ready, locked `full` on all variants |
| diagnosticQ01Q07 | **full** | Ready, locked `full` on all variants |
| conversationPostLevel | **full** | Ready (post-level metrics only, no comment scraper) |
| commentIntelligence | **hidden** | Pro candidate, comment scraper disabled |
| captionsDiagnostics | **lightweight** | Needs review (simplified version) |
| marketSignals | **full** | Needs review (DataForSEO fallback) |
| benchmarkGauge | **full** | Needs review (reference data fallback) |
| methodology | **full** | Ready, locked `full` on public_mvp + pro_preview |
| betaFeedbackBanner | **full** | Ready (remove post-beta) |
| debugLabels | **hidden** | Locked `hidden` on public_mvp + pro_preview |

## 2. Modules hidden from `public_mvp`

| Module | Reason |
|---|---|
| commentIntelligence | Comment scraper disabled; Pro-only feature |
| debugLabels | Internal diagnostics; hard-locked hidden |

## 3. Modules shown as lightweight

| Module | Variant |
|---|---|
| captionsDiagnostics | public_mvp, pro_preview |

## 4. Modules shown as Pro teaser

| Module | Variant |
|---|---|
| commentIntelligence | pro_preview (teaser) |

## 5. Verification checklist

| # | Check | Result |
|---|---|---|
| 5 | Advanced comment intelligence is Pro/internal only | PASS — `hidden` in public_mvp, `teaser` in pro_preview, `full` only in internal_lab |
| 6 | P05 public uses only lightweight post-level metrics | PASS — `conversationPostLevel` is `full` (post-level metrics without comment scraper); `commentIntelligence` is `hidden` |
| 7 | No debug/internal strings in public_mvp | PASS — `debugLabels` is `hidden` and hard-locked |
| 8 | No admin controls can appear publicly | PASS — admin routes are under `/admin` with gate; public route is `/analyze/$username` |
| 9 | Public route fixed to `variant="public_mvp"` | PASS — hardcoded in `analyze.$username.tsx` line 282 |
| 10 | Public route consumes published overrides only, never draft | PASS — calls `getPublishedFeatures` (not `getDraftFeatures`) at line 271 |
| 11 | Locked modules cannot be accidentally changed | PASS — `effective-features.ts` enforces lock rules AFTER merge; `debugLabels` locked hidden on public_mvp; `overviewHeroKpis` and `diagnosticQ01Q07` locked full on all variants; `methodology` locked full on public_mvp |

## 6. Recommended published visibility configuration

Publish these exact values to `report_variant_overrides` for `public_mvp` (matches current static defaults — establishes an explicit baseline):

```
overviewHeroKpis:      full
diagnosticQ01Q07:      full
conversationPostLevel: full
commentIntelligence:   hidden
captionsDiagnostics:   lightweight
marketSignals:         full
benchmarkGauge:        full
methodology:           full
betaFeedbackBanner:    full
debugLabels:           hidden
```

This makes the public MVP deterministic — even if static defaults change in code, the published override holds.

## 7. Files to protect

Add a **PUBLIC_MVP_LOCK** section to `LOCKED_FILES.md` (preferred over a new doc — single source of truth):

```
## Public MVP Lock (pre-beta freeze)
- /src/lib/report/report-variant.ts (already locked)
- /src/lib/report/effective-features.ts
- /src/routes/analyze.$username.tsx (variant="public_mvp" hardcoded)
- /src/server/admin/variant-overrides.functions.ts
```

Also lock `effective-features.ts` — it contains the lock rules that prevent accidental exposure.

## 8. Future change workflow

```text
1. Develop in internal_lab
   └─ Toggle modules freely in Module Visibility Manager
   └─ Preview via fullscreen internal_lab preview

2. When satisfied, switch to public_mvp in Report Lab
   └─ Save draft override
   └─ Preview draft in fullscreen public_mvp preview
   └─ Confirm no debug strings, no Pro-only content leaking

3. Publish override
   └─ Confirm dialog in Module Visibility Manager
   └─ /analyze/$username immediately reflects the change

4. Rollback
   └─ Discard published override → reverts to static defaults
   └─ Or publish a new override that restores previous values
```

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| `marketSignals` depends on DataForSEO — may show empty state publicly | Verify fallback UI renders cleanly when DataForSEO is blocked/empty |
| `benchmarkGauge` without reference data | Verify gauge shows graceful "sem dados de referência" state |
| `captionsDiagnostics` lightweight mode has unreviewed copy | Review before launch; safe to iterate in internal_lab first |
| Future code change to static defaults could silently alter behavior if no published override exists | Mitigated by publishing the explicit baseline (step 6) |
| `betaFeedbackBanner` left visible post-beta | Add a reminder to hide it via override when exiting beta |

## 10. Recommended implementation prompt

Once approved, a single prompt should:

1. Add the `PUBLIC_MVP_LOCK` section to `LOCKED_FILES.md`
2. Lock `effective-features.ts` in that section
3. Publish the baseline `public_mvp` override via Module Visibility Manager (manual admin action, not code)
4. No code changes to report components, provider logic, PDF pipeline, or cost tracking

No code changes are included in this plan — it is a documentation and operational freeze only.
