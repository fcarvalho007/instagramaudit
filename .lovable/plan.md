
# Free/Public Report — Real Dependency Audit

## 1. Current Free visible section map

In `report-shell-v2.tsx` with `lockBoundary === "engagement" && !premiumUnlocked` (the public/lead-captured flow), the body that actually renders is:

```text
Hero v2 (ReportHeroV2)                              ← always
└─ ReportBlockTopTabs / ReportBlockSidebar          ← always (nav UI)
01 · Visão geral (ReportBlockSection)
   └─ ReportOverviewBlock mode="free_with_engagement"
        ├─ MethodologyLine                          ← deterministic
        ├─ EngagementCardRefined  (id="engagement") ← deterministic
        └─ 5 × PremiumTeaserCard                    ← static teaser UI
              03 Frequência / 04 Formatos / 05 Publicações-chave /
              06 Diagnóstico (com 7 sub-itens) / 07 Prioridades
02 · Diagnóstico  → gated by `premiumUnlocked` → NOT rendered
03..06             → gated by `premiumUnlocked` → NOT rendered
ReportEndOfFreeBlock + EndFeedbackStrip             ← CTA, static
ReportMethodology                                   ← static informational
StickyUnlockBar                                     ← static CTA
```

Note: `EditorialIdentityCard` (which would use `aiInsightsV2.editorialVerdict`) is **only** rendered when `mode === "all" | "free"` — it is **not** rendered in `free_with_engagement` (the live Free path). All five teaser sections render via `PremiumTeaserCard`, which has zero data dependencies.

## 2. Free component dependency table

| Component (Free path)        | Apify | DataForSEO | OpenAI v1 | OpenAI v2 | Visual cover | Caption semantic |
| ---------------------------- | :---: | :--------: | :-------: | :-------: | :----------: | :--------------: |
| ReportHeroV2                 |  yes  |     no     |    no     |    no     |      no      |       no         |
| EngagementCardRefined        |  yes  |     no     |    no     |    no     |      no      |       no         |
| MethodologyLine              |  yes  |     no     |    no     |    no     |      no      |       no         |
| PremiumTeaserCard × 5 (03–07)|  no   |     no     |    no     |    no     |      no      |       no         |
| ReportEndOfFreeBlock / Sticky|  no   |     no     |    no     |    no     |      no      |       no         |
| ReportMethodology            |  no   |     no     |    no     |    no     |      no      |       no         |

The only `renderInsight(...)` call sites (`evolutionChart`, `heatmap`, `daysOfWeek`, `formats`, `language`, `marketSignals`, `benchmark`, `topPosts`) live inside premium-only blocks (02–06). In `free_with_engagement` the overview block never calls `renderInsight`.

## 3. Is `insights_v1` still required for Free?

**No.** Nothing rendered in the Free flow reads `ai_insights_v1`. References to `ai_insights_v1` remain in:

- `src/lib/pdf/render.ts` and `src/lib/pdf/report-document.tsx` — PDF (premium artifact)
- `src/lib/report/snapshot-to-report-data.ts` (maps `ai_insights_v1` → `ReportData.aiInsights`) — consumed only by premium diagnostic block + PDF
- `report-pending-ai-notice.tsx` / `report-shell.tsx` (legacy v1 shell, not the active v2 shell)
- `enrichment` runner + admin diagnostics

`insights_v2.editorialVerdict` is used by `EditorialIdentityCard`, but that card is **skipped** in `free_with_engagement` mode and has a deterministic fallback even when rendered.

## 4. Enrichment jobs that can be skipped for Free without regression

Today `analyze-public-v1.ts` enqueues **all** `ALL_ENRICHMENT_TYPES` jobs unconditionally for every snapshot (no plan/variant gate). For a snapshot that will only be shown in the Free flow until purchase, all of the following are safe to skip:

| Job                | Needed for Free? | Needed if user upgrades to Pro? | Recommendation                     |
| ------------------ | :--------------: | :-----------------------------: | ---------------------------------- |
| `dataforseo`       |        no        | yes (market signals 05, benchmark 06) | Skip on Free, run on unlock |
| `insights_v1`      |        no        | yes (02 Diagnóstico cards, PDF) | Skip on Free, run on unlock |
| `insights_v2`      |        no\*      | yes (Identity verdict, hero copy) | Skip on Free, run on unlock |
| `visual_cover`     |        no        | yes (cover diagnostics)         | Skip on Free, run on unlock |
| `caption_semantic` |        no        | yes (caption diagnostics)       | Skip on Free, run on unlock |
| `comments`         |        no        | gated by separate flag (off)    | Already conditional — leave as is  |

\* `insights_v2` is currently consumed only by the Identity Card, which the live Free flow does not render. If product decides later to also show the Identity Card to Free, `insights_v2` becomes "nice-to-have" (still has deterministic fallback).

Net effect for an Apify-only Free snapshot: **eliminates 1× DataForSEO call, 2× OpenAI calls (v1+v2), and 2× thumbnail/caption analysis passes per Free analysis** — i.e. every AI enrichment cost goes to zero until conversion.

## 5. Recommended cost gate policy

| Plan / context           | Enrichments to run                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------- |
| **Free / Public**        | Apify only. Skip `dataforseo`, `insights_v1`, `insights_v2`, `visual_cover`, `caption_semantic`. Comments stay off. |
| **Pro (post-purchase)**  | Run all enrichments on the existing snapshot (top-up enrichment on entitlement grant). |
| **Internal Lab**         | Run all enrichments unconditionally (current behaviour for admin previews).             |

Trigger model: at lead capture / public render, enqueue only the Free set; on entitlement upgrade (EuPago webhook → `lead_entitlements`), enqueue the missing enrichment jobs against the same `snapshot_id` (the runner already short-circuits when a payload key is already present, e.g. `if (ctx.previousPayload.ai_insights_v1) skip`).

## 6. Files likely to edit in the implementation step

Read-only audit — no edits in this turn. When approved, the implementation will touch:

- `src/lib/enrichment/types.ts` — add `FREE_ENRICHMENT_TYPES` / `PAID_ENRICHMENT_TYPES` subsets next to `ALL_ENRICHMENT_TYPES`.
- `src/routes/api/analyze-public-v1.ts` (~line 1178) — replace `ALL_ENRICHMENT_TYPES.map(...)` with the Free subset; pre-mark the skipped types as `"skipped"` in `enrichment_status` so admin diagnostics stay accurate.
- New helper or extend `src/lib/payments/entitlements.functions.ts` / EuPago webhook handler — on entitlement grant, enqueue the missing `PAID_ENRICHMENT_TYPES` jobs for the snapshot and re-trigger `/api/public/enrich-snapshot`.
- `src/lib/admin/execution-mode.functions.ts` + `src/components/admin/v2/sistema/analysis-cost-breakdown.tsx` — surface "skipped (free)" vs "skipped (budget)" so admin cost view distinguishes the two.
- No changes to: report UI, snapshot schema, payments, entitlements logic, credits, providers.

## 7. Open question for next prompt (not executed)

> Implement a Free vs Paid enrichment gate: in `analyze-public-v1.ts` enqueue only Apify-derived jobs for the public/Free path (mark `dataforseo`, `insights_v1`, `insights_v2`, `visual_cover`, `caption_semantic` as `skipped` in `enrichment_status`); on entitlement grant (post-purchase), enqueue the missing Paid set against the same `snapshot_id` and re-trigger `/api/public/enrich-snapshot`. Do not touch UI, schema, payments, or credits.
