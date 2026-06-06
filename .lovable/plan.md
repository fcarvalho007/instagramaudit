# Visual QA — Free/Public vs Pro report (read-only)

## Goal
Confirm the Free/Public report is an honest, commercially strong preview of Pro, and that Pro is fully unlocked, using the existing `mariiana.ai` snapshot (`63c045bd-5608-412e-9cbf-68d70f56d079`). No provider calls, no payments, no DB writes.

## Why admin/report-lab and not /analyze/<handle>
`/analyze/<handle>` on production is hard-gated by the onboarding modal (lead capture), so the public route cannot be rendered without creating a real lead. `admin.report-lab` lets us render any snapshot under any `ReportVariant` (`public_mvp`, `pro_preview`, `internal_lab`) without onboarding, without provider calls, and without DB writes — same components, same `getVariantFeatures()` switch.

## Method
For each variant, render in admin/report-lab with `profile=mariiana.ai`, take desktop (1366×768) + mobile (390×844) screenshots of the full page, then crop the relevant blocks.

### URLs to render (browser only — read-only)
- Free: `/admin/report-lab?profile=mariiana.ai&variant=public_mvp`
- Pro:  `/admin/report-lab?profile=mariiana.ai&variant=pro_preview`
- (Reference) Internal: current `&variant=internal_lab`

## Free/Public checks
Block 01 — methodology line, deterministic "Leitura inicial do perfil" card, Engagement card.

Deterministic card audit:
- reads only deterministic fields (profile, posts, cadence, hashtags) — confirm via `report-overview-block.tsx` source path already wired to non-AI data.
- copy: no overclaim, no AI-derived adjectives.
- mobile: card fits 390-wide without horizontal scroll, no clipped numbers.

After Engagement — 5 teaser cards in this order with locked styling:
1. 03 Frequência editorial
2. 04 Mix de formatos
3. 05 Publicações-chave
4. 06 Diagnóstico editorial
5. 07 Prioridades de acção

Each teaser:
- visually mirrors corresponding Pro section header.
- shows no premium values (no real frequência number, no real diagnostic verdict).
- has eyebrow, title, value-prop, Premium badge, CTA.
- CTA price = dynamic from `pricing_plans` (not hardcoded).
- CTA opens existing unlock modal (do NOT click checkout; just confirm modal opens).

Sticky bar:
- appears once the first teaser intersects, hides at lead-magnet card (confirmed in code).
- copy mentions the 5 premium themes.
- opens the same unlock modal as teaser CTA.
- not present on Pro render.

## Pro checks
- All 7 sections render unlocked.
- No locked teaser cards visible.
- No sticky unlock bar.
- Section 06 includes diagnostic cards (Diagnóstico editorial).
- Section 07 includes Prioridades de acção.
- Pending enrichment placeholders appear where insights_v1/v2/visual_cover/caption_semantic are `skipped_free` (this snapshot is a Free snapshot — pro_preview against it should show the pending/placeholder state, which is itself a finding to report).

## Safety guard (verify after the pass)
- `SELECT count(*) FROM provider_call_logs WHERE created_at >= '<T_qa_start>'` = 0.
- No new rows in `lead_payments`, `lead_entitlements`, `credit_ledger`, `enrichment_jobs`, `analysis_snapshots`.

## Deliverable
PASS/FAIL checklist with the user's exact bullet structure, plus:
- Visual issues found (with cropped screenshot refs)
- Copy issues found
- Mobile issues found
- Final verdict: READY / NEEDS SMALL UI FIX / NEEDS TECHNICAL REVIEW
- Note on Free-snapshot vs pro_preview pending-enrichment caveat.

No code, no DB, no provider calls. Browser + read-only SQL only.
