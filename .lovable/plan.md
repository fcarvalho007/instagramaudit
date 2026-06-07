# QA Audit — Phase 1 Competitor Comparison (Pro Report)

Chat-only audit. No code edits, no schema/payments/credits/entitlements touched. No new provider calls (rendering only — Apify/OpenAI/DataForSEO are not triggered by mounting these components).

## Scope under test

Files exercised by the audit:
- `src/components/report-redesign/v2/overview/competitor-overview-compare.tsx`
- `src/components/report-redesign/v2/competitor-engagement-compare.tsx`
- `src/components/report-redesign/v2/competitor-cadence-compare.tsx`
- `src/components/report-redesign/v2/report-overview-block.tsx` (insertion points)
- `src/components/report-redesign/v2/compare/*` (primitives)

Out of scope (must remain untouched): checkout, EuPago, credits, entitlements, schema, Add Competitor consume flow, `ReportCompetitors` legacy gauge, `/report.example`.

## Test matrix

Run each scenario against `auditprofiles.com` (lead `01bf861c...`, already on Pro window via existing data; no new credit spend needed — use cached 30d if available, otherwise baseline-only is enough since the compare components key off `competitorBreakdown`, not window).

| # | Scenario | Route / state | Expected |
|---|----------|---------------|----------|
| 1 | Pro, 0 competitors | `/analyze/<u>` Pro view, `competitorBreakdown=[]` | Overview / Engagement / Cadence cards render identically to pre-Phase-1; no compare block, no empty container |
| 2 | Pro, 1 competitor | same, `competitorBreakdown.length===1` | 3 compare blocks render (Overview, Engagement, Cadence). Primary left/blue, competitor right/secondary. Values match `competitorBreakdown[0]` numbers |
| 3 | Pro, 2 competitors | same, `length===2` | Only `competitorBreakdown[0]` used. Second competitor not rendered in Phase 1 blocks. No layout break |
| 4 | Free / Public | unauth or `mode!=="all"` | Zero compare UI. Locked teaser cards unchanged |
| 5 | Mobile 375px | viewport 375 | No horizontal overflow. Rows stack `grid-cols-1 → sm:grid-cols-[1fr_auto_1fr]`. Numeric values readable as text |
| 6 | Window alignment | competitor `windowAligned===false` | Neutral hint "Concorrente em amostra recente/baseline." visible |
| 7 | Missing metric | row value null/0 | Row hidden, no invented zero, no empty block rendered |
| 8 | No provider calls on render | DevTools Network during scenarios 1–5 | Zero requests to apify.com, openai.com, dataforseo.com triggered by render. Only cached report fetch + static assets |

## How I'll run it

I'll drive the browser tool against the **published** site (`auditprofiles.com`) since the QA entitlement context lives on that lead. For each scenario I'll:

1. `view_preview` / `navigate_to_url` to the analyze route.
2. `set_viewport_size` 1280 then 375.
3. `screenshot` the relevant cards.
4. `list_network_requests` filtered to non-self origins to confirm no provider calls.
5. Cross-check rendered numbers vs `competitorBreakdown[0]` payload from the report fetch response.

For scenarios 2 and 3, if the current production lead has 0 or 1 competitor saved, I'll ask you before adding any — adding a competitor goes through the consume flow, which is out of scope.

## Deliverable

A single report containing:

- **PASS/FAIL table** keyed to the 8 rows above.
- **Verified cards / screenshots** per scenario (desktop + 375px where relevant).
- **Bugs found** (if any) with file + repro.
- **Provider-call audit**: explicit confirmation of zero Apify/OpenAI/DataForSEO requests during render.
- **Untouched-surfaces confirmation**: checkout, EuPago, credits, entitlements, schema, Add Competitor flow, legacy `ReportCompetitors`, `/report.example`, Free/Public locked teasers.
- **Go/No-go for Phase 2** (data extension to Format Mix / Hashtags / Captions / Comments).

## Questions before I start

1. The production lead `01bf861c...` — how many competitors does it currently have saved? If 0 or 1, do I have permission to read-only inspect, or should I ask you to add a second one via the normal UI before I screenshot scenario 3?
2. Run against `auditprofiles.com` (published) or the Lovable preview? Phase 1 code is in both, but published matches the lead/session you've been validating.
3. The temporary QA entitlement `7ae71c27...` (`metadata.source = 'manual_pr1_validation'`) on lead `01bf861c...` — leave in place for the duration of this audit and roll back after, or roll back first and run audit against a non-entitled session?
