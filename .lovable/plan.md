# Editorial Verdict v2 — Contrato estruturado para o Bloco 1

## Objetivo

Introduzir `ai_insights_v2.editorial_verdict` — campo estruturado, separado de `sections.hero`, que alimenta o primeiro cartão do relatório público com uma leitura editorial real (diagnóstico interpretativo), em vez de obrigar o frontend a fazer heurística sobre uma string única.

O `hero` atual continua a existir (curto, ≤240 chars, ainda usado como "abertura") mas o cartão passa a ler primeiro do `editorial_verdict`. Sem perda de retrocompatibilidade.

## O que muda (read-only neste plano)

Esta é a especificação do contrato + plano de implementação. Não há código alterado.

## Contrato proposto

### Tipo TypeScript (em `src/lib/insights/types.ts`)

```ts
export type EditorialVerdictBand =
  | "strong"        // perfil sólido, alavanca clara
  | "promising"     // sinais positivos parciais
  | "needs_work"    // gap relevante face ao tier
  | "limited_data"; // amostra insuficiente, sem julgamento

export type EditorialVerdictConfidence = "high" | "medium" | "low";

export type EditorialVerdictWarning =
  | "low_sample"        // posts_analyzed < 5
  | "stale_data"        // último post > 60 dias
  | "cadence_uncertain" // cadence.method === "insufficient" ou "sample_span"
  | "no_market_signals" // market_signals.has_free === false
  | "benchmark_missing";// benchmark === null

export interface EditorialVerdict {
  verdict_label: EditorialVerdictBand;
  /** Título editorial, ≤ 7 palavras, ≤ 60 chars, sem ponto final. */
  title: string;
  /** 35–65 palavras, máx. 2 frases, ≤ 380 chars. */
  paragraph: string;
  /** Próxima prioridade prática, 1 frase no infinitivo, ≤ 160 chars. */
  priority: string;
  /** Exatamente 2 pontos fortes editoriais (não KPIs crus). ≤ 80 chars cada. */
  strengths: [string, string];
  /** Exatamente 2 limitações editoriais. ≤ 80 chars cada. */
  limitations: [string, string];
  confidence: EditorialVerdictConfidence;
  /**
   * Rótulos internos das fontes citadas (ex. "cadence.window_30d",
   * "benchmark.tier_delta", "format_mix.dominant_share",
   * "caption_intelligence.topics"). Validados contra allowlist.
   */
  evidence_used: string[];
  /** Avisos automáticos derivados do payload (não inventados pelo modelo). */
  warnings?: EditorialVerdictWarning[];
}
```

E em `AiInsightsV2`:

```ts
export interface AiInsightsV2 {
  // ...campos existentes...
  /** Veredicto editorial estruturado para o Bloco 1. Opcional para
   *  retrocompat com snapshots antigos. */
  editorial_verdict?: EditorialVerdict | null;
}
```

### JSON Schema (`prompt-v2.ts → RESPONSE_JSON_SCHEMA_V2`)

Adicionar `editorial_verdict` como objeto obrigatório no schema strict, com `enum` em `verdict_label`/`confidence`, `minLength`/`maxLength` em strings, `minItems=maxItems=2` em `strengths`/`limitations`, `minItems=1, maxItems=6` em `evidence_used`. `warnings` é controlado pelo backend (ver abaixo), portanto **não pedimos ao modelo** — preenchemos pós-validação.

### Regras editoriais (system prompt)

Bloco novo no `SYSTEM_PROMPT_BASE`:

- `verdict_label` derivado da leitura combinada de engagement vs tier + cadence + formato dominante. Mapeamento orientativo (não rígido):
  - `strong`: ER ≥ benchmark do tier **e** cadence suficiente **e** sem warnings críticos.
  - `promising`: 1 sinal positivo, 1 gap.
  - `needs_work`: ER < 50% do benchmark **ou** cadência insuficiente prolongada.
  - `limited_data`: `posts_analyzed < 5` **ou** `cadence.method === "insufficient"`.
- `title`: hook editorial curto, sem números, sem ponto final.
- `paragraph`: 1 frase de diagnóstico (com pelo menos 1 número do payload) + 1 frase interpretativa (porquê / o que significa). **Proibido** repetir literalmente ER, médias de likes/comentários ou frequência (esses ficam na strip de métricas).
- `priority`: única ação concreta no infinitivo impessoal.
- `strengths`/`limitations`: leitura interpretativa, não enumeração de KPIs. Ex.: "Audiência fiel mas pouco conversadora" (✓), "0,3% de comentários por like" (✗ — isso é métrica crua).
- `evidence_used`: tem de citar pelo menos 1 rótulo de uma allowlist conhecida.

### Validador (`validate-v2.ts`)

Acrescentar `validateEditorialVerdict` com:

1. Schema Zod estrito (espelha o JSON schema).
2. Reuso de `detectTechnicalLeak` + `detectPtBrLeak` em `title`/`paragraph`/`priority`/`strengths[*]`/`limitations[*]`.
3. `paragraph`: contagem de palavras 30–75 (tolerância ±5 do contrato editorial 35–65).
4. `paragraph` exige pelo menos 1 dígito (grounding).
5. `evidence_used`: cada item tem de pertencer a `EVIDENCE_ALLOWLIST` (set fechado: `cadence.window_30d`, `cadence.window_90d`, `cadence.sample_span`, `benchmark.tier_delta`, `benchmark.tier_label`, `format_mix.dominant_share`, `format_mix.dominant_format`, `top_posts.top1`, `caption_intelligence.topics`, `caption_intelligence.length`, `editorial_patterns.collaboration_lift`, `editorial_patterns.comments_to_likes_ratio`, `market_signals.strongest_keyword`, `market_signals.trend_direction`).
6. **Cross-check**: se `verdict_label === "limited_data"`, o backend força `confidence = "low"` e adiciona `warnings: ["low_sample"]` quando `posts_analyzed < 5`. Não rejeita — corrige.
7. **`warnings` são preenchidos pelo backend** após validar a resposta, com base em sinais determinísticos do payload (não dependem do modelo).

### Cálculo determinístico de `warnings`

Em `openai-insights.server.ts`, após `validateInsightsV2` devolver `ok`, fazer pós-processamento puro:

```ts
const warnings: EditorialVerdictWarning[] = [];
if (postsAnalyzed < 5) warnings.push("low_sample");
if (daysSinceLastPost > 60) warnings.push("stale_data");
if (!cadence.sufficient) warnings.push("cadence_uncertain");
if (!marketSignals.has_free) warnings.push("no_market_signals");
if (!benchmark) warnings.push("benchmark_missing");
```

E também forçar `confidence`:
- 2+ warnings → `confidence = "low"` (sobrescreve modelo).
- 1 warning → cap em `medium`.
- 0 warnings → respeita modelo (`high` ou `medium`).

## Fluxo de leitura no frontend (referência, não implementado neste plano)

`EditorialIdentityCard` passa a aceitar `aiVerdict?: EditorialVerdict | null` e usa-o **antes** de `aiHeroText`. `aiHeroText` permanece como fallback. `deriveCopyFromAi` continua a existir para snapshots antigos.

Mapeamento direto:
- `title` → `<h2>` do cartão.
- `paragraph` → parágrafo principal.
- `verdict_label` → badge (`strong/promising/needs_work/limited_data` → cores já existentes em `bandBadgeClass`).
- `strengths` → coluna "O que já funciona".
- `limitations` → coluna "O que limita o crescimento".
- `priority` → nova linha de CTA editorial abaixo do parágrafo.
- `warnings` → microcopy abaixo do parágrafo (substitui o `lowConfidence` atual).
- `evidence_used` → não renderizado em público; útil para admin/debug.

## Plano de implementação (próximos prompts em Build Mode)

1. **Tipos + schema**: estender `types.ts` e `RESPONSE_JSON_SCHEMA_V2` em `prompt-v2.ts`. Atualizar `SYSTEM_PROMPT_BASE` com o novo bloco de regras editoriais. Sem mudanças noutros sítios.
2. **Validador**: adicionar `validateEditorialVerdict` + `EVIDENCE_ALLOWLIST` em `validate-v2.ts`. Estender `validateInsightsV2` para devolver `editorial_verdict` (opcional).
3. **Generator**: em `generateInsightsV2`, ler o `editorial_verdict` validado, calcular `warnings` determinísticos e força `confidence` quando aplicável. Persistir no snapshot. Bump `kb_version` para invalidar cache antigo.
4. **Adapter**: estender `SnapshotPayload.ai_insights_v2` em `snapshot-to-report-data.ts` com `editorial_verdict?`. Adicionar `buildEditorialVerdict()` defensivo (igual ao `buildAiInsightsV2`). Expor em `ReportEnriched.aiInsightsV2.editorialVerdict`.
5. **UI**: alterar `EditorialIdentityCard` para consumir `aiVerdict` primeiro. Manter heurística atual como fallback. Sem alterações de layout.
6. **Testes**: ver secção seguinte.
7. **Regeneração**: snapshots antigos continuam a funcionar com `hero`. Novos snapshots populam ambos.

## Casos de teste

`src/lib/insights/__tests__/validate-v2-verdict.test.ts`:

- Veredicto válido completo passa.
- `paragraph` com 20 palavras → rejeita `PARAGRAPH_TOO_SHORT`.
- `paragraph` com 80 palavras → rejeita `PARAGRAPH_TOO_LONG`.
- `strengths` com 1 item → rejeita schema.
- `evidence_used` com label fora da allowlist → rejeita `EVIDENCE_UNKNOWN`.
- `title` com 12 palavras → rejeita `TITLE_TOO_LONG`.
- `paragraph` sem dígito → rejeita `GENERIC_OUTPUT`.
- PT-BR leak em `priority` → rejeita `PTBR_LEAK`.
- Caminho snake_case em `paragraph` → rejeita `TECHNICAL_LEAK`.
- `verdict_label = "limited_data"` + modelo devolve `confidence = "high"` → backend força `low`.
- Snapshot antigo sem `editorial_verdict` → `validateInsightsV2` continua a passar (campo opcional).

`src/lib/report/__tests__/editorial-verdict-warnings.test.ts`:

- `posts_analyzed = 3` → warning `low_sample`.
- `cadence.method === "insufficient"` → warning `cadence_uncertain`.
- `benchmark = null` → warning `benchmark_missing`.
- 2 warnings → confidence forçada para `low`.
- 0 warnings + modelo `high` → mantém `high`.

## Riscos

- **Custo OpenAI**: +~200 tokens de output por relatório (~$0.0006). Aceitável.
- **Latência**: schema mais estrito pode aumentar retries em modelos mais fracos. Mitigação: o schema é strict, modelo já é forçado a obedecer.
- **Inconsistência entre `editorial_verdict` e métricas visíveis**: mitigada por (a) proibir repetição literal de KPIs no `paragraph`, (b) `evidence_used` allowlist, (c) `warnings` calculados pelo backend (não pelo modelo).
- **Snapshots antigos sem o campo**: aceite, fallback para `hero` + heurística atual.
- **Modelo a inventar bands erradas**: mitigado por overrides determinísticos (`limited_data` quando `posts_analyzed < 5`, etc.) aplicados pelo backend antes de persistir.

## Checkpoint

- ☐ Tipos `EditorialVerdict` adicionados a `types.ts`.
- ☐ JSON schema strict atualizado em `prompt-v2.ts`.
- ☐ `SYSTEM_PROMPT_BASE` com regras editoriais novas.
- ☐ `validateEditorialVerdict` + allowlist em `validate-v2.ts`.
- ☐ Generator calcula `warnings` + força `confidence`.
- ☐ Adapter expõe `editorialVerdict` em `ReportEnriched`.
- ☐ `EditorialIdentityCard` consome `aiVerdict` com fallback.
- ☐ Testes de validação + warnings verdes.
- ☐ Snapshot antigo de `robs.cortez` continua a renderizar (fallback).
