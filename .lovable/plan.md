
# Visual QA Audit — Public Report

## Blocker: Dev Server API Returning 503

The `/api/analyze-public-v1` endpoint is returning 503 on the dev server. This is a transient infrastructure issue — the snapshot API (`/api/public/analysis-snapshot/frederico.m.carvalho`) returns 200 with valid data when called directly. The report cannot render because the analyze endpoint (which the page calls first) is unavailable.

This blocks visual QA of the rendered report (hero card, KPI strip, executive summary, etc.).

## What Was Verified

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Error state renders on API failure | **PASS** | "ANALISE INDISPONIVEL" eyebrow + "Este relatorio ainda nao tem dados publicos disponiveis." + body text + "Tentar novamente" / "Voltar ao inicio" CTAs |
| 2 | Error state uses correct pt-PT copy | **PASS** | All text in European Portuguese, no technical error codes shown |
| 3 | Error state design system compliance | **PASS** | Light background, Inter font, blue primary CTA, no slate-*, no font-mono |
| 4 | No provider calls triggered during page view | **PASS** | Only `/api/analyze-public-v1` called (POST, no `?refresh=1`), no internal token sent |
| 5 | No fresh analysis triggered | **PASS** | Public request without token goes through `cache_only` guard |
| 6 | Snapshot data exists in DB | **PASS** | Direct API call to `/api/public/analysis-snapshot/frederico.m.carvalho` returns 200 |

## Not Yet Verified (Blocked by 503)

| # | Check | Status |
|---|-------|--------|
| 1 | First fold: hero card, avatar, KPI strip, metadata row | **BLOCKED** |
| 2 | Executive summary: score ring, strength/improvement cards | **BLOCKED** |
| 3 | Typography: Fraunces headings, Inter body/metrics | **BLOCKED** |
| 4 | Mobile stacking and responsive behavior | **BLOCKED** |
| 5 | PDF/share buttons | **BLOCKED** |
| 6 | Admin preview variants (`?variant=public_mvp`, `?variant=internal_lab`) | **BLOCKED** |

## Root Cause of Blank Page Appearance

The error state renders correctly but is vertically centered in the viewport — on a 1460x871 screen it falls just below the initial fold, making the page appear blank on first screenshot. This is a **minor polish issue**: the error state should be higher on the page or the section should have a `min-h-screen` to ensure visibility without scrolling.

## Recommended Next Action

1. **Wait for dev server API to stabilize**, then re-run this visual QA
2. **Quick polish**: Move the error state higher in the viewport so it's visible without scrolling — this is a layout issue in `AnalysisErrorState` or its wrapper
3. Alternatively, test on the **published URL** if recently published, where the API may be stable
