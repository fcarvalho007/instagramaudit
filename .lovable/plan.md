# Final action cards — diagnosis + plan

## PHASE 1 — Diagnosis

**Where generated**
- Deterministic rules: `src/lib/report/block02-diagnostic.ts` → `derivePriorities()` (lines 1090–1274). 7 rule blocks, fallback fillers, scored, deduped, cap 6.
- AI priorities: `src/lib/insights/prompt-v2.ts` (system prompt + JSON schema, exactly 3 items) → `validate-v2.ts` → stored at `aiInsightsV2.priorities`.
- Merge + render: `src/components/report-redesign/v2/report-diagnostic-block.tsx` (lines 122–162) prepends AI items, fills with deterministic, slices to 6. `prioritySource` is `"ai"` whenever AI returns ≥1, even if dedup leaves a mostly-deterministic list.
- UI: `src/components/report-redesign/v2/report-diagnostic-priorities.tsx` — chip = level only, footer text = `it.resolves` (the raw "Resolve a Pergunta NN").

**System type**: AI-first when present, deterministic fills to 3+. Cap 6.

**Data passed to deterministic generator (today)**
- `contentType`, `funnel`, `caption`, `audience`, `integration`, `dominantFormatShare/Label`.
- NOT passed: `commentIntel` (rich comment data already built in the diagnostic block), `coverAnalysis` (visual cover score + sub-scores already parsed in the same component), `cadence` from `result.data`, top-post specifics, caption intelligence themes.

**Data passed to AI generator (today)** — via `buildInsightsUserPayload`
- Available: cadence, benchmark, formats, top posts, caption_intelligence (themes/hashtags), `visual_cover` summary (consistency, visual_clarity, summary).
- NOT available: comment intelligence (brand reply rate, audience questions, complaints, buying intent, classifiedExcerpts, topConversationPosts) — nowhere injected into the AI payload.

**Why cards still feel generic**
1. `derivePriorities` ignores the two richest enrichments (commentIntel, coverAnalysis) even when they exist on the same page.
2. AI prompt never receives commentIntel, so AI cards cannot cite reply rate, complaints, buying intent.
3. No `evidence`/`basedOn`/`source`/`category` on the item shape — UI can't show evidence chips or "Baseado em:" line.
4. Footer shows internal copy like "Resolve a Pergunta 06" — leaks question numbers to the user.
5. Fallback fillers ("Definir 2 rubricas editoriais recorrentes") fire generically; no gating against richer evidence-based rules.

**Upstream blocks not feeding final cards**
- Resposta do público (commentIntel: brandReplyRate, unansweredQuestions, complaints, buyingIntent, topConversationPosts).
- Análise visual das capas (coverAnalysis: overall score, sub-scores recognisability/humanPresence/templateRepetition).
- Frequência editorial / cadence reliability.
- Caption intelligence themes (topThemes) beyond CTA share.

## PHASE 2 — Extend the `PriorityItem` shape (additive)

In `block02-diagnostic.ts`:

```ts
export type PriorityCategory = "testar" | "corrigir" | "repetir" | "oportunidade";
export type PrioritySourceTag = "ai" | "deterministic";
export type PriorityBasis =
  | "Resposta do público" | "Análise visual das capas"
  | "Frequência editorial" | "Mix de formatos"
  | "Publicações-chave" | "Padrão das captions"
  | "Integração entre canais" | "Tipo de conteúdo dominante";

export interface PriorityEvidence { label: string; value?: string }

export interface PriorityItem {
  level: PriorityLevel;              // urgency (existing)
  category: PriorityCategory;        // NEW — type of action
  title: string;
  body: string;
  basedOn: PriorityBasis[];          // NEW — readable sections
  evidence?: PriorityEvidence[];     // NEW — real metric chips
  source: PrioritySourceTag;         // NEW — "ai" | "deterministic"
  /** @deprecated kept for snapshot backward compat — UI no longer renders */
  resolves?: string;
}
```

All existing rules will be migrated to set `category`, `basedOn`, `evidence`, `source: "deterministic"`. Legacy `resolves` is no longer rendered (kept optional for snapshot/test compatibility).

## PHASE 3 — Add evidence-gated deterministic rules

Extend `derivePriorities` args:
```ts
{ ..., commentIntel?: CommentIntelligence | null,
       coverAnalysis?: VisualCoverAnalysis | null,
       cadence?: { weekly?: number; sufficient?: boolean; method?: string } | null }
```
Wire from `report-diagnostic-block.tsx` (commentIntel + coverAnalysis are already in scope).

New rules (only fire when their data exists):

**Comments**
- Brand reply rate < 10% AND unanswered questions ≥ 3 → `corrigir` / `alta` · `Resposta do público` · evidence: `Resposta da marca X%`, `N perguntas sem resposta`.
- Complaints/friction count ≥ 2 → `corrigir` / `alta` · evidence: `N comentários com fricção`.
- Buying intent ≥ 2 AND CTA share < 20% → `oportunidade` / `media` · `Resposta do público` + `Integração entre canais`.
- `topConversationPosts[0]` exists with comments ≥ 10 → `repetir` / `oportunidade` · `Publicações-chave` + `Resposta do público` · evidence: `N comentários no post âncora`.

**Visual cover**
- Overall score < 50 → `corrigir` / `alta` · `Análise visual das capas` · evidence: `Score capas X/100`.
- Template repetition score < 50 OR recognisability < 50 → `testar` / `media` · evidence sub-score.
- Human-presence sub-score < 40 AND human content makes sense (creator profile) → `testar` / `oportunidade`.

**Cadence**
- `cadence.sufficient === false` OR weekly < 1 → `corrigir` / `media` · `Frequência editorial`.
- Strong recurring dominant format + audience non-silent → `repetir` / `oportunidade` · `Mix de formatos`.

**Captions / CTA**
- CTA share < 15% (existing rule) → `testar` (was unlabelled) · `Padrão das captions` · evidence: `CTA em X% das captions`.
- Caption pattern dominant AND audience active → `repetir` / `oportunidade` · `Padrão das captions`.

**Ranking**
- Score boost (+5) for any rule with `evidence.length ≥ 1` from comments or visual cover.
- Generic fallbacks (rubricas, repetir tema, ligação canais) only fire when ≤2 evidence-rich rules exist.
- Guarantee: if `commentIntel.available` AND any non-neutral signal, at least one final card has `basedOn` including `Resposta do público`.
- Guarantee: if `coverAnalysis` present AND any sub-score < 70, at least one card includes `Análise visual das capas`.
- Final length 3–6. Dedup by title.

## PHASE 4 — Feed AI priorities richer context

In `src/lib/insights/build-context.ts` + `prompt.ts`:
- Add optional `comment_intelligence` block to `InsightsContext` and `buildInsightsUserPayload` payload: `{ brand_reply_rate_pct, audience_questions_count, complaints_count, buying_intent_count, top_conversation_post: {comments, caption_excerpt} | null }`. Only included when commentIntel is available on the snapshot.
- Add same labels to `EDITORIAL_VERDICT_EVIDENCE_ALLOWLIST` for `comment_intelligence.*`.
- Prompt addition (priorities section only — does NOT change editorial verdict rules): "Quando `comment_intelligence` estiver presente, pelo menos 1 prioridade deve citar um número real dela (reply rate, perguntas, fricção, intenção de compra). Quando `visual_cover` estiver presente, pelo menos 1 prioridade pode citar o score ou sub-score real. Nunca inventar números fora do payload."
- `validate-v2.ts`: when mapping AI priorities into `PriorityItem`, infer `category` (keyword heuristic on title verbs: testar/repetir/corrigir/oportunidade), set `source: "ai"`, derive `basedOn` from which payload keys appear in body text, attach `evidence` when numbers in body match payload values; **reject/downgrade** any AI priority whose body contains a `\d+%` or `\d+` number not present in the user payload (treat as hallucination → strip and let deterministic top-up fill).
- No provider or budget changes.

## PHASE 5 — UI overhaul (`report-diagnostic-priorities.tsx`)

Per card:
- Top row: urgency chip (`alta`/`media`/`oportunidade` — keep colour system) · category chip (`Testar`/`Corrigir`/`Repetir`/`Oportunidade` — neutral tone) · source pill (`IA` / `Regra` — small, tertiary).
- Optional evidence chip row (max 2): small monospace-free chips like `Score capas 42/100`, `Resposta da marca 6%`.
- Title (existing H4).
- Body (2–3 sentences).
- Footer: `Baseado em: <basedOn joined by " · ">`. Falls back to existing `resolves` only for legacy snapshots without `basedOn`.

Remove from UI:
- `it.resolves` rendering with "Resolve a Pergunta NN" — replaced by `basedOn`.
- Drop the global `source` prop on the header (per-card pill replaces it) but keep the header subtitle.

i18n: add `pt/report.json` keys for category labels, source pills, and "Baseado em:".

## PHASE 6 — Validation

- Extend `block02-priorities.test.ts`:
  - Snapshot with commentIntel (low reply rate + questions) → ≥1 card with `basedOn` containing `Resposta do público` and evidence chip.
  - Snapshot with coverAnalysis score 42 → ≥1 card with `basedOn` containing `Análise visual das capas` and evidence `Score capas 42/100`.
  - Snapshot without either → no fabricated cover/comment cards, still ≥3 items.
  - Ranking: evidence rules outrank fallback fillers.
- New test in `validate-v2-priorities.test.ts`: AI priority with hallucinated number is stripped; AI priority gets `source: "ai"` and inferred `category`/`basedOn`.
- Manual visual check in `/analyze/$username` preview: no "Pergunta NN" text remains; pills + chips render; cards feel specific.

## Files to change

- `src/lib/report/block02-diagnostic.ts` — extend `PriorityItem`, extend `derivePriorities` args, add rules.
- `src/lib/insights/types.ts` — add `comment_intelligence` to `InsightsContext` + allowlist.
- `src/lib/insights/build-context.ts` — derive comment intel summary when present.
- `src/lib/insights/prompt.ts` — surface `comment_intelligence` in payload + signals.
- `src/lib/insights/prompt-v2.ts` — extra prompt rule for priorities citing real numbers.
- `src/lib/insights/validate-v2.ts` — map AI priorities into new shape, hallucination guard.
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` — pass commentIntel/coverAnalysis/cadence to `derivePriorities`; merge keeps per-item `source`.
- `src/components/report-redesign/v2/report-diagnostic-priorities.tsx` — new card layout (urgency + category + source + evidence + basedOn).
- `src/i18n/locales/pt/report.json` — new labels.
- Tests as above.

## Out of scope (explicit)

Visual cover pipeline, comment scraping pipeline, payments, EuPago, checkout, credits, 30/90d gates, competitor gates, Free report structure, AI provider/budget caps, `/report.example`.
