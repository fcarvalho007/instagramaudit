# QA Audit — Competitor colour fix + Phase 1 regression

Read-only. Zero code edits, zero UI actions on real data, zero provider calls.

## Constraints (locked in)
- Preview/mock only for competitor visual states.
- Scenario 3 (2 competitors) → code-level reasoning only, no real adds.
- Published site touched **only** for: (a) Free/Public regression, (b) network panel sanity (zero Apify/OpenAI/DataForSEO).
- QA entitlement `7ae71c27…` → **kept** (still required for the pending PR1 30d B/C/D fetches). Rollback happens at the end of the PR1 stream, not this audit.

## Test matrix

| # | Scenario | Source | Method |
|---|----------|--------|--------|
| 1 | Pro, 0 competitors | code | `firstCompetitor = competitorBreakdown[0] ?? null` → 3 blocks return `null`. PASS by inspection |
| 2 | Pro, 1 competitor | **mock** via `/admin/report-preview/frederico.m.carvalho?variant=pro_preview` (fixture has exactly 1: `marketing.digital.pt`) | Screenshot desktop + 375px. Verify: 3 compare blocks render; primary dot = ocean blue; competitor dot = indigo `#7664E4`; "Concorrente em janela baseline." hint visible (mock has `windowAligned:false`) |
| 3 | Pro, 2 competitors | code | `competitorBreakdown[0]` only is consumed (line 120 + TODO Fase 1.5 at line 118). Second entry ignored, no layout break possible. PASS by inspection |
| 4 | Free/Public regression | **published** `auditprofiles.com` Free report | Confirm zero compare blocks render (gated by `mode === "all"` / `(mode === "all" \|\| "locked")`). Locked teasers visually unchanged |
| 5 | Mobile 375px | mock (scenario 2 viewport) | No horizontal overflow; `grid-cols-1 sm:grid-cols-[1fr_auto_1fr]` stacks cleanly |
| 6 | Provider-call sanity | published Free + mock Pro | Network panel filtered to `apify\|openai\|dataforseo` → zero requests during render |
| 7 | Colour distinction | mock | Primary blue vs competitor indigo visually distinct AND `@handle` text present beside each dot (redundant signal, a11y safe) |

## Handoff
The admin preview route requires the user's admin session; the agent browser tool cannot log in. The agent will:
1. Re-confirm the code-level scenarios (1, 3, 4 gating) by grep.
2. Hit the published Free/Public path for scenarios 4 + 6 (no login needed).
3. Ask the user to open the admin preview URL with their session and paste a screenshot OR a quick PASS/FAIL for scenarios 2, 5, 7 (60-second check).

## Deliverable
Single PASS/FAIL table + screenshot from published Free path + agent confirmation of:
- `--accent-secondary` token unchanged.
- `bg-compare-competitor` only present in compare/Phase 1 files.
- Entitlement `7ae71c27…` still present (not rolled back, justification logged).
- Go/No-go for Phase 2.
