
# Auditoria P03 Hashtags — Data Readiness for "Ocean Map"

---

## 1. Current Component Architecture

| Question | Answer |
|----------|--------|
| Which component renders P03? | `renderHashtagsCard()` inside `report-diagnostic-block.tsx` (lines 362-456) |
| Which file contains the UI? | Same file + reuses `ReportDiagnosticCard` (span="full") from `report-diagnostic-card.tsx` |
| Custom or generic? | Uses generic `ReportDiagnosticCard` with inline cloud + frequency list as `children` |

P03 is currently in **Group B** ("Como comunica"), rendered as a full-width card with two panels: a hashtag cloud (left) and a frequency+engagement bar list (right).

---

## 2. Available Data per Hashtag

| Field | Status | Source | Details |
|-------|--------|--------|---------|
| `tag` (text) | **REAL** | `extractTopHashtags()` in `text-extract.ts` | Extracted from `posts[].hashtags`, normalised, prefixed with `#` |
| `uses` (count) | **REAL** | Same extractor | Number of posts where this hashtag appears |
| `avgEngagement` | **REAL** | Same extractor | Average `engagement_pct` across posts containing this tag |
| Share % | **DERIVABLE** | `uses / totalPosts` | Not computed today but trivial |
| Global post volume | **UNAVAILABLE** | Would need Instagram API or third-party | Not in payload, not in knowledge base, not in any enrichment |
| Competitive/saturation score | **UNAVAILABLE** | No external source configured | No Apify actor, no DataForSEO endpoint fetches this |
| Opportunity score | **UNAVAILABLE** | Would need global volume + engagement cross-reference | Cannot derive without external data |
| AI suggestion flag | **UNAVAILABLE** | No AI section generates hashtag suggestions | `AiInsightV2Section` has no "hashtags" key |
| AI suggested replacements | **UNAVAILABLE** | Same — no prompt section | Could be added to prompt-v2 but would be AI-generated, not factual |
| Best hashtag count bucket | **REAL (editorial_patterns)** | `editorial_patterns.hashtag_count` in AI insight context | Only says e.g. "5–10 hashtags = best engagement", not per-tag data |

---

## 3. Data Reliability Summary

| Data point | Classification |
|------------|----------------|
| Hashtag text | Real from payload |
| Usage count | Real from payload |
| Avg engagement per tag | Real from payload (derived deterministically) |
| Share % | Derivable deterministically |
| Global volume | **Unavailable** — no source exists |
| Competitiveness index | **Unavailable** |
| Opportunity score (x/y axes) | **Unavailable** |
| Zone classification (blue/warm/red) | **Unavailable** (needs external benchmark) |
| AI-suggested alternatives | **Unavailable** (no prompt section exists) |

---

## 4. PASS/FAIL Verdict

| Requirement | Verdict |
|-------------|---------|
| 2D ocean map with real x/y axes | **FAIL** — no global volume or competitive data exists |
| Colour zones (blue/warm/red) | **FAIL** — no saturation benchmark to classify against |
| AI-suggested alternatives | **FAIL** — no AI section produces these |
| Hashtag label + count + engagement | **PASS** — fully available |
| Qualitative heuristic classification | **CONDITIONAL PASS** — possible with internal rules only |

**Overall: FAIL for the full "Ocean Map" as described.**

The report has **5 hashtags with text + count + avgEngagement**. That is enough for a visual card but not for a 2D strategic map with real competitive axes.

---

## 5. Safe Fallback Options

### Option A — Heuristic "Ocean Map" (no backend changes)
- **X-axis**: "Frequência de uso" (0-100, normalised from `uses/maxUses`)
- **Y-axis**: "Engagement relativo" (0-100, normalised from `avgEngagement/maxEngagement`)
- **Zones**: Derived from quadrant position:
  - Blue (opportunity): low frequency + high engagement
  - Warm (established): high frequency + high engagement
  - Red (saturated): high frequency + low engagement
  - Grey (low signal): low frequency + low engagement
- **Labels**: Qualitative ("Oportunidade", "Território forte", "Saturado", "Pouco sinal")
- **No global volume numbers shown** — only relative position within the profile's own hashtags
- **Honest limitation**: State "Mapa relativo ao perfil — não reflete volumes globais"

### Option B — Enhanced heuristic with AI layer (requires prompt change)
- Same as A, plus add a new AI insight section "hashtags" to prompt-v2
- AI generates: 2-3 suggested alternative hashtags + brief strategic note
- Classification: AI-generated, clearly labelled

### Option C — Defer until external data source
- Keep current cloud+bars layout
- Add a "coming soon" placeholder for the ocean map
- Wait for an Apify actor or API that provides global hashtag volumes

---

## 6. Recommended Data Model (Option A)

```ts
type HashtagOceanPoint = {
  tag: string;
  count: number;            // real — from payload
  sharePct: number;         // derived — count / totalPosts
  avgEngagement: number;    // real — from payload
  frequencyScore: number;   // 0–100, normalised uses
  engagementScore: number;  // 0–100, normalised avgEngagement
  zone: "blue" | "warm" | "red" | "grey";  // derived from quadrant
  isSuggestion: false;      // always false in Option A
};
```

---

## 7. Proposed Visual Architecture (if approved)

```text
┌─────────────────────────────────────────────────────┐
│  PERGUNTA 03 · HASHTAGS                             │
│                                                     │
│  "Que território de hashtags ocupa?"                 │
│                                                     │
│  ┌─ answer box ──────────────────────────────────┐  │
│  │  Resposta: #hashtag1 · #hashtag2              │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ ocean map (SVG/canvas) ──────────────────────┐  │
│  │  Y: Engagement ↑                              │  │
│  │       ● #tag1                                 │  │
│  │            ● #tag2                            │  │
│  │                 ● #tag3                        │  │
│  │  X: Frequência de uso →                       │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ 3 mini summary cards ────────────────────────┐  │
│  │  Oportunidade │ Território forte │ Saturado   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ diagnostic callout ─────────────────────────┐   │
│  │  DIAGNÓSTICO: strategic summary               │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 8. Files to Edit (if implementing Option A)

| File | Change |
|------|--------|
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` | Replace `renderHashtagsCard()` with new ocean map component call |
| `src/components/report-redesign/v2/report-diagnostic-card.tsx` | Add `HashtagOceanMap` component (or new file) |
| New file: `src/components/report-redesign/v2/hashtag-ocean-map.tsx` | Ocean map SVG visualization + mini-cards |

---

## 9. Files NOT to Touch

- Block 1 components
- Groups C, D card builders
- `src/lib/report/block02-diagnostic.ts` (classifier — data is sufficient)
- `src/lib/report/text-extract.ts`
- Backend / Supabase / Auth / Admin
- PDF generation
- Global tokens (`tokens.css`, `tokens-light.css`)
- Locked files
- AI prompt files (Option A)

---

## 10. Implementation Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Only 5 hashtags — map may feel sparse | Medium | Use larger dots, add quadrant labels, ensure 5 points feel intentional |
| No real competitive data — user may assume axes are absolute | High | Add explicit disclaimer: "Posição relativa ao perfil" |
| SVG scatter plot complexity on mobile | Low | Use simple positioned divs instead of SVG; or responsive SVG with viewBox |
| Zone colours may clash with card tone system | Low | Use muted fills (rgba) consistent with existing tint tokens |

---

## 11. Constraints Confirmation

| Constraint | Safe? |
|------------|-------|
| No backend changes | Yes |
| No API calls | Yes |
| No Apify calls | Yes |
| No Supabase changes | Yes |
| No global token changes | Yes |
| No Block 1 changes | Yes |
| No Groups C/D changes | Yes |
| No locked files | Yes |

---

## 12. Recommendation

**Proceed with Option A** — heuristic ocean map using only existing data (count + avgEngagement), with honest qualitative labels and no fabricated global volumes. The 2D scatter uses relative axes within the profile's own hashtags.

Before implementing, choose between:
1. **Option A only** (pure deterministic, no AI, no prompt changes)
2. **Option A + B** (add AI hashtag suggestions via new prompt section — requires `prompt-v2.ts` edit)

No code was changed during this audit.
