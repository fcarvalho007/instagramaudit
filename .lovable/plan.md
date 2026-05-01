
# QA Visual Review · Report V2

**Limitation**: The V2 report (`ReportShellV2`) only renders on `/analyze/$username`, which requires the full Apify analysis pipeline. The admin preview requires localStorage auth. Neither route could be rendered in the browser. The `/report/example` uses the old `ReportPage` component and does **not** reflect V2 changes. This audit is therefore **code-level only**, supplemented by a design regression check on `/report/example`.

**Confirmation**: No files were edited during this QA.

---

## Verdict: **PASS WITH MINOR REFINEMENTS**

---

## A. Bloco 02 Structure

| Check | Status | Notes |
|-------|--------|-------|
| New numbering correct? | **Issue** | Audience card renders `number="05"` but uses `key="q06"` (stale key from before renumber). Integration renders `number="06"` / `key="q07"`. Objective renders `number="07"`. The **visible numbers** are correct (01-07 after Caption Intelligence as Q04), but the React keys still use old numbering — cosmetic only, no user impact. |
| Q03 clearly covers hashtags? | PASS | `number="03"`, `label="Hashtags"`, question "Que hashtags aparecem mais vezes?", body clarifies hashtags ≠ topics. |
| Q04 clearly covers caption text only? | PASS | Header says "Leitura das legendas", subtitle says "Baseado na leitura das legendas públicas dos posts analisados — não inclui transcrição do que é dito em vídeo." |
| Q05/Q06/Q07 correctly renumbered? | PASS | Audience=05, Integration=06, Objective=07. No duplication. |
| Group counter correct? | **Minor** | `block-config.ts` L34 still says "Oito perguntas" but there are now 7 diagnostic cards + Caption Intelligence = 8 items total. Technically accurate if Caption Intelligence counts as a question, but ambiguous. |

## B. Caption Intelligence

| Check | Status | Notes |
|-------|--------|-------|
| One of the strongest sections? | PASS | 5 sub-blocks (themes, content type, expressions, CTAs, editorial reading) + snapshot row + action bridge + premium teaser. Well-structured. |
| Clear it analyses public captions only? | PASS | Header subtitle + `ScopeTransparencyNote` both state this explicitly. |
| Clear what it does NOT analyse? | PASS | "Não inclui áudio, vídeo, texto dentro das imagens ou transcrição dos Reels." |
| Badges clear and not overused? | **Minor** | Each sub-block has its own `SourceBadge` + the snapshot row has 3 badges. With 5 sub-blocks + 3 snapshot cards = 8 badges total on screen. Risk of badge fatigue. |
| Real caption excerpts readable? | PASS | Themes show `it.evidence` with italic styling and "excerto real" label. |
| Distinction between hashtags/themes/expressions/CTAs/editorial? | PASS | Each has its own `BlockHeader` with distinct label. |
| Premium teaser visible but not intrusive? | PASS | Amber-toned card with Lock icon and PRO badge. Minimal copy. |

## C. UX/UI

| Check | Status | Notes |
|-------|--------|-------|
| Scannable in 10 seconds? | PASS | Snapshot row provides instant summary, sub-blocks are well-separated. |
| Layout too dense? | **Minor** | The 3/5 + 2/5 column grid packs themes + content type + expressions in the left column. With long theme lists, left column could become very long vs short right column. |
| Too many badges/chips? | **Minor** | See badge fatigue note above. |
| Typography hierarchy strong? | PASS | `font-display` for main heading, `text-eyebrow-sm` for labels, consistent sizing. |
| Cards feel premium/editorial? | PASS | `ring-1`, rounded-xl, subtle bg tints, no generic dashboard look. |
| AI reading has consistent visual identity? | PASS | Blue tint + left border + Sparkles icon + italic text for AI source. |

## D. Mobile

| Check | Status | Notes |
|-------|--------|-------|
| No horizontal overflow at 375px? | **Cannot verify visually** | Grid uses `grid-cols-1 sm:grid-cols-3` for snapshot row and `grid-cols-1 md:grid-cols-5` for main layout. Should stack correctly. |
| Badges wrap? | Likely OK | `flex-wrap` on header. Badges use `shrink-0`. |
| Caption excerpts readable? | PASS | `leading-relaxed`, `text-[13px]`, `max-w-xl`. |
| Visually overwhelming? | **Risk** | On mobile, all sub-blocks stack vertically = very long scroll. No collapsible sections. |

## E. Global Design Regression

| Check | Status | Notes |
|-------|--------|-------|
| Typography sweep caused issues? | **Minor** | `report-caption-intelligence.tsx` L1-2 has duplicate `lucide-react` imports (both `{ AlertTriangle, Lightbulb, MessageSquareQuote, Sparkles }` and `{ Crown, Lock }`). Works but untidy. |
| Surface/border changes? | PASS | `/report/example` renders cleanly with light theme. Cards have subtle borders. |
| Gold/cyan rules coherent? | PASS | Premium teaser uses amber (gold) family exclusively. No cyan mixing in the same card. |

## F. Data Safety

| Check | Status | Notes |
|-------|--------|-------|
| No claims about unavailable metrics? | PASS | No reach, saves, shares, impressions, profile visits, follower growth, demographics, or video transcripts referenced. |
| No technical terms in UI? | **Minor** | `sourceType="calculation"` renders as "CÁLCULO" via `ReportSourceLabel` — acceptable. `key="q06"` is React internal only. No payload/JSON/classifier terms visible. |
| Audience unavailable state correct? | PASS | Shows "Dados insuficientes" with neutral explanation, no contradictory classification. |

---

## Findings Table

| Severity | Finding | File |
|----------|---------|------|
| Minor | Duplicate `lucide-react` imports (L1-2) | `report-caption-intelligence.tsx` |
| Minor | React keys use old numbering (`key="q06"` for card numbered "05") | `report-diagnostic-block.tsx` |
| Minor | Badge count (8 per section) risks visual fatigue | `report-caption-intelligence.tsx` |
| Minor | `block-config.ts` says "Oito perguntas" — verify this is still accurate | `block-config.ts` |
| Minor | Mobile: long vertical scroll without collapse affordance | `report-caption-intelligence.tsx` |

---

## Screenshots Reviewed

1. `/report/example` desktop 1440px — top fold (Bloco 01): PASS, clean light theme.
2. `/report/example` desktop 1440px — temporal chart + AI insights: PASS.
3. V2 report (code review only): Could not screenshot.

---

## Refinement Prompt (if approved)

> 1. Consolidate the two `lucide-react` imports on L1-2 of `report-caption-intelligence.tsx` into one.
> 2. Update React `key` props in `report-diagnostic-block.tsx` to match visible numbering: audience `key="q05"`, integration `key="q06"`, objective `key="q07"`.
> 3. Verify "Oito perguntas" in `block-config.ts` L34 is accurate after renumbering — update if needed.

These are all Minor-level. No Critical or Medium issues found.
