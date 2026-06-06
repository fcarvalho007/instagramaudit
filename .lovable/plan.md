# Free/Public OpenAI Dependency Audit

## TL;DR

Free/Public (mode `free_with_engagement`, used when `lockBoundary === "engagement" && !premiumUnlocked`) renders **MethodologyLine + EngagementCardRefined + 5 PremiumTeaserCard**. It does **NOT** render `EditorialIdentityCard`. The earlier QA note conflated the `free` mode (used elsewhere) with the live `free_with_engagement` mode (used in production for public reports).

**Free needs Apify only. No OpenAI, no DataForSEO, no visual_cover, no caption_semantic.**

## 1. Current Free Visible Component Map

Source: `src/components/report-redesign/v2/report-shell-v2.tsx` (lines 233–253) → `ReportOverviewBlock mode="free_with_engagement"` (src/components/report-redesign/v2/report-overview-block.tsx lines 252–280).

Rendered for Free public:
- `MethodologyLine` (transparency line: sample size, days, exclusions)
- `EngagementCardRefined` (id="engagement")
- 5 × `PremiumTeaserCard` (static locked teasers for blocks 03–07)
- `ReportHeroV2` (hero, from shell)
- Sidebar / TopTabs nav

**Not rendered in Free public:**
- `EditorialIdentityCard` (only in modes `"all"` / `"free"`, which the live path does not use)
- Blocks 02–06 main bodies (guarded by `premiumUnlocked`)
- `ReportDiagnosticBlock`, `ReportTemporalChart`, `ReportThemesFeature`, `ReportCommentIntelligence`, `VisualCoverAnalysisCard`, `CaptionDiagnosticsCard`, `ReportDiagnosticPriorities` — all premium-only

## 2. Dependency Table by Visible Free Component

| Component | Apify | insights_v1 | insights_v2 | DataForSEO | visual_cover | caption_semantic |
|---|---|---|---|---|---|---|
| `ReportHeroV2` | yes (profile + posts) | no | no | no | no | no |
| `MethodologyLine` | yes (count/days/exclusions) | no | no | no | no | no |
| `EngagementCardRefined` | yes (engagement, benchmark) | no | no | no | no | no |
| `PremiumTeaserCard` (×5) | no (static copy) | no | no | no | no | no |
| Sidebar / TopTabs | no | no | no | no | no | no |

`renderInsight(...)` is passed down but every Free component path ignores it (no `renderInsight` call inside the `free_with_engagement` branch).

## 3. Answers to Audit Questions

1. **Does `free_with_engagement` render `EditorialIdentityCard`?** — **No.** The Identity Card lives in the `(mode === "all" || mode === "free")` branch (report-overview-block.tsx line 193). The `free_with_engagement` branch (line 252) renders only MethodologyLine + Engagement + Teasers.
2. **Does `EditorialIdentityCard` require `ai_insights_v1`/`v2`?** — It consumes `enriched.aiInsightsV2?.editorialVerdict ?? null` (optional). It has a deterministic fallback (`src/lib/report/editorial-verdict-fallback.ts`). But it is moot — the card is not rendered in Free public.
3. **Deterministic fallback without OpenAI?** — Yes, via `editorial-verdict-fallback.ts`. (Again, not exercised in Free.)
4. **Does Engagement need OpenAI/DFS/visual/caption?** — **No.** `EngagementCardRefined` consumes only `result` (Apify-derived metrics).
5. **Do locked PremiumTeaserCard items need enrichment?** — **No.** Static i18n copy + CTA only.
6. **Strictly necessary enrichments for Free:** **Apify only.**
7. **Safely skippable for Free:** `dataforseo`, `insights_v1`, `insights_v2`, `visual_cover`, `caption_semantic`, `comments` — none are read in the Free render path.

## 4. Verdicts

- **`insights_v1` required in Free?** No.
- **`insights_v2` required in Free?** No.
- **Can Free be Apify-only?** **Yes.**
- **QA note status:** Incorrect for the live path. EditorialIdentityCard is only reachable if the report ever runs in `mode="free"` (legacy/lab) — not the production public flow.

## 5. Recommended Enrichment Policy (no implementation in this turn)

| Tier | Apify | insights_v1 | insights_v2 | DataForSEO | visual_cover | caption_semantic | comments |
|---|---|---|---|---|---|---|---|
| **Free / Public** | run | skip | skip | skip | skip | skip | skip |
| **Pro (unlocked)** | run (cached) | run | run | run | run | run | gated by post count |
| **Internal Lab** | run | run | run | run | run | run | run |

This matches the current `FREE_ENRICHMENT_TYPES` (empty) / `PAID_ENRICHMENT_TYPES` split already wired in `src/lib/enrichment/types.ts` and the webhook top-up in `src/lib/enrichment/enqueue-paid.server.ts`. **No code change is needed to remove an OpenAI dependency from Free — there is none.**

## 6. Follow-up (not part of this audit)

- Consider deleting or renaming the unused `mode="free"` branch in `ReportOverviewBlock` to remove the ambiguity that caused the QA confusion.
- Add a unit test asserting `free_with_engagement` does not render `EditorialIdentityCard` to prevent regression.
