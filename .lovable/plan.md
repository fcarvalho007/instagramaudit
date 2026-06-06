# Free overview: deterministic "Leitura inicial do perfil" card

## Goal

Add a small, AI-free overview card right above `EngagementCardRefined` in the `free_with_engagement` branch of `ReportOverviewBlock`. Uses only deterministic data already available from `result.data.keyMetrics`, `result.enriched.cadence`, and `result.data.topHashtags`.

## Files changed

1. **New** `src/components/report-redesign/v2/overview/free-initial-reading-card.tsx`
   - Pure presentational + deterministic logic component.
   - Props: `engagementRate`, `engagementBenchmark`, `postingFrequencyWeekly`, `cadenceSufficient`, `dominantFormat`, `dominantFormatShare`, `hasRecurringHashtags`.
   - Renders:
     - Eyebrow `VISÃO GERAL` (`.text-eyebrow-sm`)
     - H3 `Leitura inicial do perfil` (Inter SemiBold, no Fraunces — this is a supporting card, not a hero)
     - Verdict line (one of the 5 strings below)
     - Short explanatory paragraph (1–2 sentences, derived from the same booleans)
     - 3-up compact metric row: cadência (posts/sem), taxa de envolvimento (%), formato dominante (label + share%)
     - Two columns (stack on mobile, side-by-side from `md:`):
       - "O que funciona" — bullet list of green-tick items from positives
       - "O que limita" — bullet list of amber items from negatives
   - All copy in pt-PT, sentence case, no uppercase tracking except eyebrow.
   - Visual treatment: white card on `bg-surface-card`, `border-default`, subtle padding, lighter shadow than Engagement card. No gradients, no glow.

2. **Edit** `src/components/report-redesign/v2/report-overview-block.tsx`
   - Import the new card.
   - Inside the `mode === "free_with_engagement"` branch, render `<FreeInitialReadingCard …/>` immediately before the `<div id="engagement">` wrapper, after `<MethodologyLine />`.
   - All props derived from already-computed `k` (`keyMetrics`), `enriched.cadence`, `formatEntries`, and `topHashtags`. No new data fetches.

No other files touched.

## Deterministic rules

Inputs (already on `keyMetrics`/`enriched`):

- `engagementOk = engagementRate >= engagementBenchmark` (when both present)
- `cadenceOk = cadenceSufficient && postingFrequencyWeekly >= 3`
- `formatOverdependent = dominantFormatShare >= 70`
- `formatDiversified = dominantFormatShare > 0 && dominantFormatShare < 60`
- `hasRecurringHashtags = topHashtags.some(h => (h.uses ?? 0) >= 2)`

Verdict matrix:

| cadenceOk | engagementOk | Verdict |
|---|---|---|
| true  | true  | "Perfil consistente, envolvimento alinhado" |
| true  | false | "Cadência forte, sinal fraco" |
| false | true  | "Boa resposta, ritmo irregular" |
| false | false | "Perfil pouco activo, envolvimento baixo" |
| unknown (missing benchmark or cadence) | — | "Leitura preliminar do perfil" |

Explanatory paragraph templated from the same booleans (no AI). Example:
> "Este perfil publica X vezes por semana e tem uma taxa de envolvimento de Y%, [acima/abaixo] do benchmark de Z%. O formato dominante é {Reels|Carrosséis|Imagens} ({share}%)."

"O que funciona" candidates (deterministic):
- cadenceOk → "Ritmo de publicação consistente"
- engagementOk → "Envolvimento acima do benchmark"
- formatDiversified → "Mistura equilibrada de formatos"
- hasRecurringHashtags → "Uso recorrente de hashtags próprias"

"O que limita" candidates:
- !cadenceOk → "Ritmo irregular ou pouco frequente"
- engagement defined && !engagementOk → "Envolvimento abaixo do benchmark"
- formatOverdependent → "Dependência excessiva de um formato"
- !hasRecurringHashtags → "Sem hashtags recorrentes identificáveis"

Always render both columns; if a list is empty, show a single muted line ("Sem sinais positivos claros nesta amostra." / "Sem sinais negativos claros nesta amostra.").

## Fallbacks (missing data)

- `engagementBenchmark == null` → drop engagement-related bullets and use "Leitura preliminar".
- `postingFrequencyWeekly == null` or `!cadenceSufficient` with `sampleSize < 3` → drop cadence metric, show "Amostra reduzida" microcopy under the metric row.
- `dominantFormat == null` → drop format metric and format bullets.

## Not changed

Provider calls, enrichment jobs (`visual_cover`, `caption_semantic`, `insights_v1/v2`), payment/checkout/EuPago, entitlements/credits, snapshot generation, schema, Pro report (`mode === "all"`), Internal Lab (separate variant path), `EngagementCardRefined`, the 5 premium teaser cards.

No new imports from `enriched.aiInsightsV2`, `enriched.commentIntelligence`, `visual_cover_analysis`, or `caption_semantic_analysis`.

## Manual validation

1. `/analyze/<free handle>` shows, in order: Editorial Identity → Methodology Line → **Leitura inicial do perfil** → Engagement → 5 premium teasers.
2. Verdict line changes when toggling test handles with high vs low engagement / cadence.
3. With a handle missing benchmark, card falls back to "Leitura preliminar" and hides engagement bullets without crashing.
4. Network tab during render shows no new OpenAI / DataForSEO / Apify calls.
5. `/analyze/<pro handle>` (premiumUnlocked) renders the full Pro overview unchanged — new card is NOT inserted.
6. `/admin/report-preview/<h>?variant=internal_lab` unchanged.
7. Mobile (≤375px) shows the two columns stacked, metrics row wraps cleanly.
