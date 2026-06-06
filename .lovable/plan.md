# Audit — First Overview Card (Editorial Identity)

**Read-only audit. No code changes.**

The card the user describes (37/100, "Micro (10K–50K)", verdict "Cadência forte, sinal fraco", long paragraph, sample summary, 3 metric cards, "O que funciona / O que limita") is **`EditorialIdentityCard`**, NOT the small `FreeInitialReadingCard` added earlier. It is rendered in Free, Pro and Lab.

---

## 1. Files inspected

- `src/components/report-redesign/v2/report-overview-block.tsx` — mounts the card in all 3 modes (`all`, `free`, `free_with_engagement`).
- `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` — the card itself (IndexBlock, IndexRuler, MetricsStrip, BulletColumn, deriveSignals).
- `src/components/report-redesign/v2/overview/score-utils.ts` — `computeEnvolvimento`, `computeFrequencia`, `computeGlobalScore`.
- `src/lib/report/editorial-verdict.ts` — `deriveEditorialVerdict` guard (AI vs deterministic resolver).
- `src/lib/report/editorial-verdict-fallback.ts` — `buildFallbackVerdict` + 6 deterministic keys.
- `src/lib/report/cadence-label.ts` — `buildCadenceLabelPt`, `classifyHashtagsState`, `pickHashtagsForVerdict`.
- `src/i18n/locales/pt/report.json` → `identity.fallback.*` — the 6 verdict paragraphs (the long text the user is reviewing comes from here).
- `src/lib/report/post-aggregates.ts` + `src/lib/report/block01-sample.ts` — averages (likes/comments).

---

## 2. Data dependency table

| Visible element | Component | Source field | Apify | Deterministic | OpenAI | DataForSEO | Hardcoded / fallback |
|---|---|---|---|---|---|---|---|
| "37/100" hero number | `IndexBlock` | `computeGlobalScore(envolvimento, frequencia)` = 60% engagement-vs-benchmark + 40% cadence | indirect (posts/followers) | ✅ pure | ❌ | ❌ | no |
| Scale label "Micro (10K–50K)" | `IndexBlock` → `tierLabelFromFollowers` + `tierRangeFromFollowers` | `result.data.profile.followers` | ✅ followers | ✅ thresholds (Nano/Micro/Mid/Macro/Mega) | ❌ | ❌ | thresholds hardcoded |
| Median marker on ruler | `IndexRuler` | `medianIndexFromBenchmark(overall, deltaPp)` = `overall − deltaPp × 4.5` | indirect | ✅ (linear approx — NOT a real tier median) | ❌ | ❌ | approximation, flagged in comments |
| "Abaixo da mediana do escalão Micro" | `IndexBlock` qualitativeLine | `clamped` thresholds: <25 / 25–45 / 45–65 / 65–85 / 85+ | indirect | ✅ thresholds | ❌ | ❌ | i18n `identity.index.qual_*` |
| Verdict title ("Cadência forte, sinal fraco") | resolver → `copy.title` | `aiVerdict?.title` OR `buildFallbackVerdict().title` from `identity.fallback.<key>.title` | indirect | ✅ when AI absent/rejected | ⚠️ if AI verdict passed guard | ❌ | 6 deterministic keys |
| Long paragraph (1st + 2nd) | resolver → `copy.paragraph` | same path; fallback uses `identity.fallback.<key>.paragraph` | indirect | ✅ when AI absent/rejected | ⚠️ same | ❌ | i18n template, **same text for every profile in that band** |
| Sample summary paragraph (cadence + hashtags) | `buildFallbackVerdict` qualifierSentences appended after `\n\n` | `cadenceLabelPt` from `buildCadenceLabelPt`; `hashtagsState` + `topHashtags` from `classifyHashtagsState` / `pickHashtagsForVerdict` | ✅ posts → cadence + hashtags | ✅ | ❌ | ❌ | only in fallback path; if AI verdict wins, qualifiers are NOT appended |
| Cadence "1 post every 2–3 days" | `buildCadenceLabelPt` | `enriched.cadence.weekly` + `.sufficient` | ✅ | ✅ thresholds (≥5 / ≥2 / ≥1 / <1) | ❌ | ❌ | strings inlined |
| Recurring hashtags | `pickHashtagsForVerdict` (top 2 with uses ≥ 2) | `result.data.topHashtags` | ✅ | ✅ | ❌ | ❌ | — |
| Avg likes (MetricsStrip) | `computePostAverages` of `buildBlock01Sample.performancePosts` | snapshot `posts` | ✅ | ✅ | ❌ | ❌ | fallback to `content_summary.average_likes` |
| Avg comments | same | same | ✅ | ✅ | ❌ | ❌ | same fallback |
| Weekly rhythm | `postingFrequencyWeekly` | `k.postingFrequencyWeekly` from snapshot | ✅ | ✅ | ❌ | ❌ | — |
| "O que funciona" bullets | `deriveSignals` when fallback wins; else `aiVerdict.strengths` | scores + ppw + followers + delta + dominantFormatShare | indirect | ✅ thresholds | ⚠️ AI strengths used when guard passes | ❌ | 4 fallback bullets if list <2 |
| "O que limita" bullets | same | same | indirect | ✅ | ⚠️ same | ❌ | 4 fallback bullets if list <2 |

---

## 3. Deterministic rules table

| Rule | Inputs | Threshold | Output | Frederico example | Fallback |
|---|---|---|---|---|---|
| Profile index | `engagementRate`, `engagementBenchmark`, `postingFrequencyWeekly` | `0.6 × min(100, eng/bench × 100) + 0.4 × freq score` | 0–100 int | low engagement ratio + ppw ≥ 3 → ~30–40 | bench=0 → envolvimento=0 |
| Scale label | `followers` | ≥1M / ≥250K / ≥50K / ≥10K / else | Mega/Macro/Mid/Micro/Nano | 10K–50K → Micro | `null` if 0 |
| "Cadência forte" | `postsPerWeek30d` | `ppw ≥ 2.5` AND `engRatio < 0.7` → key=`cadence_no_signal` | title "Cadência forte, sinal fraco" | matches | n/a |
| "sinal fraco" | `engagementPct / benchmarkEngagementPct` | `< 0.7` of benchmark | same key | matches | bench null → falls to other branch |
| Verdict key picker | engRatio, ppw, avgComments, postsAnalyzed | 1) postsAnalyzed<4 → `opportunity/limited_data` · 2) engRatio≥0.9 & comments<2 → `attention_no_conversation` · 3) engRatio≥1 & ppw≥2.5 → `solid_consistent` · 4) engRatio≥1 & ppw<1 → `irregular_reach` · 5) ppw≥2.5 & engRatio<0.7 → `cadence_no_signal` · 6) engRatio<0.7 & comments<2 → `no_direction` · 7) else → `opportunity/promising` | one of 6 keys | rule 5 | always returns a key |
| Cadence sentence | `weekly`, `sufficient` | ≥5/≥2/≥1/<1 | "cerca de 1 post por dia" / "a cada 2–3 dias" / "1 a 2 / semana" / "menos de 1 / semana" | ppw≈3 → "a cada 2–3 dias" | `sufficient=false` → "a amostra ainda não permite avaliar a cadência" |
| Hashtag state | `topHashtags[].uses` | any uses≥2 → recurring · all =1 → weak · 0 → absent | 1 sentence | weak/recurring | safe default `absent` |
| "O que funciona" — `freq_consistent` | `ppw` | 3 ≤ ppw ≤ 7 | adds bullet | yes | `fallback_active` if list <2 |
| "audience_relevant" | tier | not Nano | adds bullet | yes | — |
| "engagement_above" | `engagementDeltaPct` | ≥ +10% | adds bullet | no | — |
| "format_mixed" | `dominantFormatShare` | < 55% | adds bullet | depends | — |
| "O que limita" — `freq_weak` | ppw | < 1 | adds bullet | no | — |
| "freq_excess" | ppw | > 7 | adds bullet | no | — |
| "engagement_below" | delta | ≤ -30% | adds bullet | likely yes | — |
| "format_repetitive" | dominantFormatShare | ≥ 70% | adds bullet | depends | `fallback_diversify` / `fallback_conversation` to fill |

---

## 4. AI dependency verdict

- **Reads `enriched.aiInsightsV2?.editorialVerdict`** (passed as `aiVerdict`). When present and the guard `deriveEditorialVerdict` finds ≤1 contradiction the AI title/paragraph/strengths/limitations are rendered. With ≥2 contradictions or `null`, the fallback wins.
- **Does NOT read**: `ai_insights_v2.sections.hero.text` (explicitly noted in code comment), `visual_cover_analysis`, `caption_semantic_analysis`, `comment_intelligence`, DataForSEO / `market_signals`.
- **Whole card can render with zero paid enrichments** — every visible element has a deterministic fallback. Verdict guard guarantees: AI presence is opportunistic, not required.
- The "sample summary" sentence (cadence + hashtags) appended after `\n\n` is **only present in the fallback path**. When the AI verdict wins, those qualifiers are dropped — that's why Pro reports with AI sometimes show no cadence-label line and Free reports without AI always show it.

---

## 5. Free vs Pro behaviour

- Card component is identical in Free (`mode="free"` and `mode="free_with_engagement"`), Pro (`mode="all"`) and Lab preview. Same props, same data path, same scores.
- Free payload sanitisation does NOT strip `aiInsightsV2.editorialVerdict` today, so when AI ran, Free will show the AI verdict too. (If sanitisation removes it later, the card silently falls back — no breakage.)
- No Pro-only field is exposed exclusively on this card. The 3 metric tiles, the bullets and the verdict all derive from public-enough data.
- The recently-added `FreeInitialReadingCard` is a SEPARATE small block that renders only in `mode="free_with_engagement"` AFTER the Identity Card — it's a second deterministic teaser, not the card under audit.

---

## 6. Copy risk analysis

Source: `identity.fallback.cadence_no_signal.paragraph` (i18n template, **identical for every profile assigned this key**).

| Claim | Supported? | Determ/Inferred | Soften? | Move to Pro? |
|---|---|---|---|---|
| "eficiência editorial em défice" | Partly — derives from `engRatio < 0.7` AND `ppw ≥ 2.5`; the value-judgement "défice" is interpretive | Inferred | Yes — replace with neutral "menos resposta do que o volume publicado sugeriria" | Keep |
| "o conteúdo não está a transformar atenção em resposta significativa" | Weak — we measure engagement vs tier benchmark, not "attention". Comments count is not consulted in this key | Inferred | Yes — replace with "a taxa de envolvimento fica abaixo da referência do escalão apesar da cadência" | Keep |
| "a tensão observada está entre o esforço de produção e a clareza do ângulo editorial" | Not supported — no signal about production effort or angle clarity | Inferred / editorial | Yes — remove or move to Pro | Move to Pro (AI verdict only) |
| "formatos repetidos sem variação de gancho ou de enquadramento" | Not supported in this card — `dominantFormatShare` isn't read inside `pickKey`; the claim is generic | Hardcoded template, NOT data-driven | Yes — remove or gate behind `dominantFormatShare ≥ 70` | Move to Pro / gate |
| "a amostra ainda não permite concluir se o problema é de tema, ritmo narrativo ou conexão" | Honest hedge, but appears even with healthy sample sizes | Hardcoded template | Keep only when `postsAnalyzed < N` (e.g. 8) | Keep with gate |

Bottom line: the deterministic paragraph **overreaches** by asserting causes ("ângulo editorial", "gancho", "enquadramento") that the picker did not measure. The hedge sentence is honest but currently fires regardless of sample size.

---

## 7. UX/UI audit

- Block is text-heavy: title + 2 long paragraphs + qualifier sentences + warnings + evidence list + 3 metric tiles + 2 bullet columns. On mobile this scrolls for 2–3 viewports before the user reaches Engagement.
- The cadence/hashtags qualifier sentence is buried inside the paragraph. Promoting it to a dedicated "Amostra recente" row (one short line, monoline icons) would make it scannable and let the paragraph shrink.
- "O que funciona / O que limita" remains the strongest diagnostic and should stay below the verdict — that grid is the most scannable artefact on the card.
- For Free: keep verdict title + 1 short paragraph (≤ 2 sentences) + sample row + bullets. Drop the second long paragraph (move it to Pro under "Leitura aprofundada").
- For Pro: keep both paragraphs but only when the AI verdict has passed the guard; the deterministic fallback should run only the short version, since its language is currently generic.

---

## 8. Recommended refinement plan (do not implement yet)

1. **Soften deterministic copy.** Edit the 6 keys in `src/i18n/locales/pt/report.json` (`identity.fallback.*.paragraph`) to:
   - Shorten to ≤ 2 sentences.
   - Remove unmeasured causal claims ("ângulo editorial", "gancho", "enquadramento").
   - Reference only signals the picker actually used (engRatio, ppw, avgComments, sample size).
2. **Gate the hedge sentence.** Append "A amostra ainda não permite concluir…" only when `postsAnalyzed < 8`, via a `qualifierSentences.push(...)` branch in `buildFallbackVerdict`.
3. **Promote sample summary to a visible row.** Replace the inline `qualifierSentences.join(" ")` with a small dedicated row above the MetricsStrip ("Amostra recente · 1 post a cada 2–3 dias · #saude · #portugal"), data-driven from `cadenceLabelPt` and `pickHashtagsForVerdict`. Keeps both fallback and AI paths producing that row.
4. **Add a Free-vs-Pro paragraph length switch.** In Pro keep both paragraphs of the AI verdict; in Free render only the first paragraph plus the sample row + bullets.
5. **No changes** to: `score-utils.ts`, `editorial-verdict.ts` guard, AI prompt, provider calls, payload schema, Free payload sanitisation, gating, payments, entitlements.

---

## 9. Exact next implementation prompt (paste later, do NOT implement now)

> Use Chat/Plan Mode first, then Edit Mode.
>
> Goal: Refine the deterministic copy and layout of the first overview card (`EditorialIdentityCard`) without changing data sources.
>
> Scope of allowed changes:
> 1. `src/i18n/locales/pt/report.json` and `src/i18n/locales/en/report.json` — rewrite the 6 `identity.fallback.*.paragraph` values to ≤ 2 sentences, removing causal claims that aren't measured by `pickKey` in `editorial-verdict-fallback.ts`. Keep titles unchanged.
> 2. `src/lib/report/editorial-verdict-fallback.ts` — gate the "A amostra ainda não permite concluir…" hedge to `metrics.postsAnalyzed < 8`. No change to `pickKey` logic, thresholds or band mapping.
> 3. `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` — extract the sample summary (cadence sentence + hashtag chips) into a dedicated row rendered above `MetricsStrip`, fed from `cadenceLabelPt`, `hashtagsState` and `topHashtags` props (already passed in). When those props are absent or `cadenceSufficient === false`, omit the row.
> 4. Pass a new `variant: "free" | "pro"` prop (default `"pro"`) from `report-overview-block.tsx`. In `"free"` only render the first paragraph of `copy.paragraph` (split on `\n\n`); in `"pro"` render both. No other behavioural difference.
>
> Forbidden:
> - No changes to `score-utils.ts` weights, `deriveEditorialVerdict` guard, AI prompt, snapshot schema, payload sanitisation, gating, EuPago, entitlements, credits, payments, Apify, DataForSEO, OpenAI calls, Internal Lab.
>
> Validation:
> 1. Free report renders shorter paragraph + visible sample row + bullets.
> 2. Pro report (when AI verdict passes guard) renders both paragraphs unchanged.
> 3. Deterministic fallback profile renders without unmeasured causal language.
> 4. Hedge sentence only appears when `postsAnalyzed < 8`.
> 5. Mobile: card height shrinks visibly on Free.
> 6. No new provider calls, no schema changes, no cost.
