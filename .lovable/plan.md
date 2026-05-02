
# Consistent Insight Card System

## Overview

Create two reusable shared components and refine the PremiumCard primitive with a subtle status accent. Apply selectively to improve comprehension without visual noise.

No changes to: calculations, copy logic, AI prompts, providers, schema, routes, pricing, PDF, auth, or locked files.

---

## TASK 1 — Status accent on PremiumCard

Add an optional `accentTone` prop to the existing `PremiumCard` in `report-overview-cards.tsx`. When set, renders a subtle 2px top border.

- `"blue"` → `border-t-blue-400/60` (market reference / neutral calculation)
- `"green"` → `border-t-emerald-400/60` (positive signal)
- `"rose"` → `border-t-rose-400/60` (warning / below reference)
- `"gold"` → `border-t-amber-400/60` (premium / PRO)
- `"slate"` → `border-t-slate-300/60` (extracted data)
- `undefined` → no accent (default, most cards)

Apply selectively:
- Engagement rate card: `accentTone="blue"` (market reference)
- Posting rhythm card: dynamic based on gap tone (green/amber/rose)
- Dominant format card: no accent (neutral)

Add the same accent support to `ReportDiagnosticCard` via the existing `tone` prop — a 2px top border matching the existing tone color.

---

## TASK 2 — InsightCallout component

Create `src/components/report-redesign/v2/insight-callout.tsx`:

```
InsightCallout({ label?, icon?, children, tone? })
```

Visual: soft blue/rose/amber background, subtle border, small icon, 2-3 line body text.

Tones:
- `"editorial"` (default): `bg-blue-50/50 ring-blue-100/60`, Lightbulb icon, label "Leitura editorial"
- `"suggestion"`: `bg-blue-50/40 ring-blue-100/50`, Cpu icon, label "O que isto sugere"
- `"warning"`: `bg-rose-50/50 ring-rose-100/60`, AlertTriangle icon, label "Atenção"

Apply to:
- Audience response interpretation (Q05) — replace the inline `<p>` editorial text
- Caption Intelligence editorial reading (already has its own styled box — leave as-is, it's already close)
- Conversation prompt strip in Q05 — wrap with InsightCallout `"suggestion"` tone

---

## TASK 3 — PremiumCallout component

Create `src/components/report-redesign/v2/premium-callout.tsx`:

```
PremiumCallout({ title, description, children? })
```

Standardized visual:
- `bg-amber-50/30 ring-1 ring-amber-200/50 rounded-xl`
- 2px top border `border-t-amber-400/50`
- Lock icon (amber-600/60)
- Inline PRO badge: `bg-amber-100/60 text-amber-700 ring-amber-300/50`
- Title + description
- Optional children slot for CTA

Replace:
- `PremiumTeaserStrip` in `report-caption-intelligence.tsx` (2 usages)
- Competitor PRO slot in `report-engagement-benchmark-chart.tsx` (adapt to use PremiumCallout, keeping the button wrapper)

Gold-island rule: no cyan accents inside this component.

---

## TASK 4 — Standardize source badges

Update `ReportSourceLabel`:
- Add two missing types: `"pro"` and `"mercado"` (mercado already exists)
- Add `"pro"` type with label `"◆ PRO"` and amber styling
- Keep the visual style: 10px, metadata-tier, no pill, no ring

Ensure one badge per card at header level. No repeated badges for the same source.

---

## TASK 5 — Selective application

Only apply accents where they improve comprehension:

| Card/Section | Accent | Reason |
|---|---|---|
| Engagement rate (overview) | blue | Market reference |
| Posting rhythm (overview) | dynamic (gap tone) | Gap signal |
| Dominant format (overview) | none | Neutral |
| Q05 Audience response | dynamic (status) | Response quality |
| Q04 Caption Intelligence shell | blue | AI/editorial reading |
| Premium teasers | gold | PRO callout |
| Engagement benchmark chart | none | Already has chart visual |

---

## TASK 6 — Accessibility and mobile

- All accent lines have text labels (interpretation chip already exists)
- InsightCallout icon uses `aria-hidden`
- PremiumCallout PRO badge is text-based
- Test badge wrapping at 375px
- No truncated words in callout text

---

## Files to change

1. `src/components/report-redesign/v2/insight-callout.tsx` — NEW
2. `src/components/report-redesign/v2/premium-callout.tsx` — NEW
3. `src/components/report-redesign/v2/report-overview-cards.tsx` — add accent to PremiumCard
4. `src/components/report-redesign/v2/report-diagnostic-card.tsx` — add top accent to card
5. `src/components/report-redesign/v2/report-caption-intelligence.tsx` — replace PremiumTeaserStrip with PremiumCallout
6. `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` — replace inline PRO slot with PremiumCallout
7. `src/components/report-redesign/v2/report-source-label.tsx` — add "pro" type

## Files NOT changed

- Locked files (tokens, shell, hero, etc.)
- Schema, routes, auth, providers, pricing, PDF
- Data logic, calculations, AI prompts
