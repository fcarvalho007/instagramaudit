## Phase 1 competitor comparison — already implemented

A prior round of this session already shipped Phase 1 exactly to the spec in this prompt. No new code changes are required. Below is the verification, with file/line citations.

### Files already in place

- `src/components/report-redesign/v2/overview/competitor-overview-compare.tsx`
- `src/components/report-redesign/v2/competitor-engagement-compare.tsx`
- `src/components/report-redesign/v2/competitor-cadence-compare.tsx`
- `src/components/report-redesign/v2/report-overview-block.tsx` (wiring)
- `src/components/report-redesign/v2/compare/` primitives — already used (`CompareStatBlock`, `buildDelta`, compare types)

### Wiring confirmed in `report-overview-block.tsx`

- Line 120: `const firstCompetitor = result.data.competitorBreakdown[0] ?? null;` — only the first competitor is used (second is ignored; TODO for multi-competitor lives there).
- Lines 266–277: `<CompetitorOverviewCompare … />` inserted into the Overview block, guarded by `mode === "all" && firstCompetitor`.
- Lines 372–381: `<CompetitorEngagementCompare … />` inserted into the Engagement block, guarded by the same condition.
- Lines 400–407: `<CompetitorCadenceCompare … />` inserted into the Cadence/Frequency block, guarded by the same condition.

### Spec → implementation mapping

| Requirement | Status |
| --- | --- |
| Cards wired: Overview, Engagement, Cadence | ✅ (3 blocks) |
| Metrics: followers, posts analysed, engagement rate | ✅ Overview |
| Metrics: avg engagement, avg likes/post, avg comments/post | ✅ Engagement (rows hidden when null/0) |
| Metric: estimated posts per week | ✅ Cadence |
| Format Mix / Hashtags / Captions / Comments etc. | ❌ Deliberately deferred to Phase 2 |
| `averageEngagementRate` already in pp — no re-scaling | ✅ Components format as `%` directly |
| `windowAligned === false` → neutral hint | ✅ "Concorrente em amostra recente/baseline." shown when primary window is 30d/90d |
| `competitorBreakdown.length === 0` → cards unchanged | ✅ Guard returns no compare block |
| Missing metric row hidden, no invented zeros | ✅ `isPositive(...)` filter in Overview; Engagement/Cadence return `null` when no data |
| Empty comparison block never rendered | ✅ All three components return `null` early when no comparable rows |
| Primary left/blue, competitor right/secondary | ✅ via existing compare primitives |
| Free/Public report unchanged | ✅ All three blocks gated behind `mode === "all"` |
| `ReportCompetitors` legacy gauge untouched | ✅ Not imported or modified in this work |
| Mobile 375px no overflow | ✅ `CompareStatBlock` uses `grid-cols-1 sm:grid-cols-[1fr_auto_1fr]` (stacks on mobile); `<main>` has `overflow-x-clip` |
| Values readable as text | ✅ Numeric + labelled handles, not colour-only |
| No backend / Apify / OpenAI / DataForSEO changes | ✅ Pure presentation, reads already-loaded `competitorBreakdown` |
| No checkout / EuPago / credits / entitlements / schema / pricing changes | ✅ |

### Recommended action

No edits needed. If you want me to verify visually in the preview at 375px and desktop, I can do that next. Otherwise this can be closed as already-done and we can move to Phase 2 (Format Mix + Posting Rhythm), whose payload extension (Fase 2B) is also already merged.

### Side note (not part of this task)

The temporary QA entitlement `7ae71c27…` granted to lead `01bf861c…` (PR1 validation) is still in `lead_entitlements`. The B/C/D browser-console results were never pasted back, so the rollback step is still pending. Let me know when you want to either complete that validation or roll it back without running B/C/D.
