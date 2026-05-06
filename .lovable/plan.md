
# Audit: Bloco 04 — Diagnóstico de Legendas

## Readiness Assessment: PASS

Both profiles (`frederico.m.carvalho` and `martimsilvai`) have all caption-related payload areas fully populated. The UI component (`caption-diagnostics-card.tsx`) already consumes every field from both the deterministic layer (`CaptionIntelligence`) and the semantic layer (`CaptionSemanticAnalysis`). No data is being silently dropped.

---

## Payload-to-UI Mapping

### A. `caption_semantic_analysis` (OpenAI semantic layer)

| # | Field path | Both profiles? | Rendered? | Where in UI | Notes |
|---|-----------|----------------|-----------|-------------|-------|
| 1 | `.source` | Yes (`openai`) | No | — | Internal metadata. **Ignore.** |
| 2 | `.schemaVersion` | Yes | No | — | Internal metadata. **Ignore.** |
| 3 | `.analyzedCaptions` | Yes (12 each) | Indirectly | Header shows `sampleSize` from deterministic layer, same value | Already covered. |
| 4 | `.dominantThemes[]` (5 each) | Yes | Yes (top 3) | "Assuntos mais recorrentes" section | Only top 3 shown; 4-5 intentionally trimmed. OK. |
| 5 | `.contentIntent.primary` | Yes | Yes | "Intenção principal" KPI card | |
| 6 | `.contentIntent.secondary` | Yes | Yes | "Intenção principal" KPI card (2nd bullet) | |
| 7 | `.contentIntent.explanation` | Yes | **No** | — | See recommendation below. |
| 8 | `.commentEngagement.asksForCommentsPct` | Yes | Yes | "Pede comentários nos posts?" section | |
| 9 | `.commentEngagement.strategyLabel` | Yes | Yes | Badge (ATIVA/OCASIONAL/PASSIVA) | |
| 10 | `.commentEngagement.examples[]` | Yes | Yes | Pill tags below % | |
| 11 | `.commentEngagement.explanation` | Yes | Yes | Summary paragraph | |
| 12 | `.recurringExpressionsInterpretation[]` | Yes (6 each) | Yes | "Expressões recorrentes" panel | Shows `.expression`, `.count`, `.meaning`, `.risk` |
| 13 | `.diagnostic.main` | Yes | Yes | "Diagnóstico editorial" blue box | |
| 14 | `.diagnostic.works` | Yes | Yes | "Funciona" micro | |
| 15 | `.diagnostic.critical` | Yes | Yes | "Ponto crítico" micro | |
| 16 | `.diagnostic.watch` | Yes | Yes | "A observar" micro | |
| 17 | `.hookQuality.rating` | Yes (`strong`) | Yes | "Qualidade do hook" pill | |
| 18 | `.hookQuality.explanation` | Yes | Yes | Pill description | |
| 19 | `.brandVoice.rating` | Yes (`consistent`) | Yes | "Voz da marca" pill | |
| 20 | `.brandVoice.explanation` | Yes | Yes | Pill description | |
| 21 | `.formulaicPatterns.hasFormulas` | Yes (`true`) | Yes | "Padrões repetitivos" pill | |
| 22 | `.formulaicPatterns.examples[]` | Yes | Yes | Italic quotes in pill | |
| 23 | `.formulaicPatterns.explanation` | Yes | Yes | Pill description | |

### B. `ai_insights_v2.sections.language`

| # | Field path | Both profiles? | Rendered? | Where | Notes |
|---|-----------|----------------|-----------|-------|-------|
| 24 | `.text` | Yes | Yes (indirectly) | Fed into `buildCaptionIntelligence()` as `aiLanguageText` for editorial reading fallback | Already consumed. |
| 25 | `.emphasis` | Yes (`default`) | No | — | Only value is `default`. **Ignore.** |

### C. Post-level caption fields (`posts[].caption`, `posts[].caption_length`)

| # | Field path | Both profiles? | Rendered? | Where | Notes |
|---|-----------|----------------|-----------|-------|-------|
| 26 | `posts[].caption` | Yes (12 each) | Yes (indirectly) | Raw text feeds `buildCaptionIntelligence()` for all deterministic metrics | |
| 27 | `posts[].caption_length` | Yes | Yes (indirectly) | Used for length distribution, avgWords calculation | |

### D. `content_summary` (no caption-specific fields)

| # | Field | Caption-relevant? | Notes |
|---|-------|-------------------|-------|
| 28 | `posts_analyzed`, `average_engagement_rate`, etc. | No | These are engagement/format metrics, not caption data. |

---

## Fields Already Covered (17 rendered)

All core semantic and deterministic caption fields are rendered:
- Dominant themes (top 3 of 5)
- Content intent (primary + secondary)
- Comment engagement (%, strategy, examples, explanation)
- Recurring expressions (with meaning + risk)
- Opening patterns distribution
- Ending patterns distribution
- Length distribution
- Editorial diagnostic (main + 3 sub-diagnostics)
- Hook quality
- Brand voice
- Formulaic patterns
- Avg words per caption
- Avg emojis per post
- Sample size + total words (header)
- Knowledge base sources (footer)

## Fields Not Rendered But Present (3)

| Field | Current status | Recommendation | Risk |
|-------|---------------|----------------|------|
| `.contentIntent.explanation` | Available in both profiles | **Add as small inline detail** — a single line of muted text below the intent bullets in the KPI card | Very low. Pure text addition, no layout shift. |
| `.dominantThemes[3-4]` (themes 4-5) | Available (5 total, only 3 shown) | **Reserve for later** — expandable "Ver mais" toggle | Low, but adds visual noise. Better as optional expansion. |
| `.source` / `.schemaVersion` | Internal | **Ignore** — no user value | N/A |

## Fields That Should Remain Hidden

- `source`, `schemaVersion` — internal metadata
- `ai_insights_v2.sections.language.emphasis` — only holds `default`, no semantic value
- Raw `posts[].caption` text — already consumed by deterministic extraction; showing raw captions would bloat the card

---

## Recommended Next Safe UI Improvements

1. **Show `contentIntent.explanation`** — one line of muted text (`text-content-tertiary text-[12px]`) under the intent KPI card bullets. Zero layout risk.

2. **Expandable themes (4-5)** — a "Mostrar todos" link at the bottom of the themes section. Only if there's user demand. Reserve for now.

3. No other caption fields are missing or underutilized.

---

## Files Involved (if changes are approved)

- `src/components/report-redesign/v2/caption-diagnostics-card.tsx` — only file that would change (for intent explanation)

## Files NOT to Touch

- `src/lib/report/caption-intelligence.ts`
- `src/lib/report/caption-semantic-types.ts`
- `src/lib/report/caption-semantic-analysis.server.ts`
- `src/lib/report/caption-semantic-prompt.ts`
- `src/components/report-redesign/v2/report-diagnostic-block.tsx`
- `src/lib/pdf/report-document.tsx`
- Any admin, cost, or snapshot files
- Any server function or provider logic
