# Fix · `GENERIC_OUTPUT: id=KEYWORDS_TREND_ALIGN`

## Causa raiz

O insight foi rejeitado por `hasQuantitativeMarker(body, evidence)` em `src/lib/insights/validate.ts:231`. A função aceita o body se:
1. contiver um dígito, OU
2. contiver um token (≥5 chars) extraído dos paths de evidence.

O prompt actual (`src/lib/insights/prompt.ts:64-67`) descreve a tendência qualitativamente ("procura em alta") e não fornece nenhum valor numérico ao modelo. Os paths de evidence emitidos (`market_signals.strongest_keyword`, `market_signals.trend_direction`) decompõem-se em tokens genéricos (`market`, `signals`, `strongest`, `keyword`, `trend`, `direction`) que não aparecem num corpo natural em pt-PT. A keyword vencedora (`ia`) tem 2 chars, abaixo do filtro `length >= 5`. Resultado: corpo válido editorialmente, rejeitado pelo validador.

Causa secundária: `summarizeMarketSignalsForInsights` em `src/routes/api/analyze-public-v1.ts:171` envia em `top_keywords` o slice bruto de `trends_usable_keywords` sem filtrar keywords com mean=0 — o modelo pode tratar zero-signal como procura real (foi o caso de `marketingdigital`, `marketingportugal`, `inteligenciaartificial`).

A solução é expor números reais (score do strongest, delta da tendência, contagem de keywords usáveis) e segregar keywords fracas para campo separado — sem relaxar o validador.

## Alterações

### 1. `src/lib/insights/types.ts`
Estender `InsightsContext.market_signals` com:
- `strongest_score?: number | null` — média do strongest, escala 0-100 (Trends).
- `trend_delta_pct?: number | null` — delta % entre primeiro e último quartil para o strongest.
- `usable_keyword_count?: number` — quantas keywords passaram o filtro mean>0.
- `zero_signal_keywords?: string[]` — keywords que vieram em `trends_usable_keywords` mas com mean=0.

Manter os existentes (`top_keywords`, `strongest_keyword`, `trend_direction`, `dropped_keywords`).

### 2. `src/routes/api/analyze-public-v1.ts` · `summarizeMarketSignalsForInsights`
Reescrever a montagem do retorno:
- Calcular o `mean` por keyword como hoje, mas guardar a tabela `{ keyword, mean }`.
- `strongest_score` = `Math.round(bestMean)` (já é 0-100).
- `top_keywords` passa a ser apenas keywords com `mean > 0`, ordenadas desc por mean (cap 5).
- `zero_signal_keywords` recebe as restantes de `trends_usable_keywords` (cap 5).
- `usable_keyword_count` = `top_keywords.length`.
- `trend_delta_pct` = `Math.round(delta * 100)` quando o cálculo de direction corre (head/tail).
- Se `usable_keyword_count === 0` → devolver `{ has_free: false, has_paid: false }` (sem procura mensurável → desligar o eixo, evita pseudo-insights de mercado quando não há sinal).

### 3. `src/lib/insights/prompt.ts`

**`computeAvailableSignals`** — adicionar (apenas quando `has_free === true` e o valor é meaningful):
- `market_signals.strongest_score` (quando `strongest_score != null`)
- `market_signals.trend_delta_pct` (quando `trend_delta_pct != null`)
- `market_signals.usable_keyword_count` (quando > 0)
- `market_signals.zero_signal_keywords` (quando array não vazio)

**`InsightsUserPayload.market_signals`** — adicionar os 4 campos opcionais correspondentes.

**`buildInsightsUserPayload`** — emitir os campos no payload usando o mesmo padrão `...(condition ? { field: value } : {})`. Garantir ordem estável (afecta `inputs_hash`).

**`INSIGHTS_SYSTEM_PROMPT`** — reforçar a secção "Sinais de mercado":
- Quando `has_free === true`, o insight de mercado **deve** incluir pelo menos um valor numérico do payload: o `strongest_score` (formatado "sinal médio de 65"), o `trend_delta_pct` (ex.: "+22%"), ou o `usable_keyword_count` (ex.: "2 temas com procura mensurável").
- A keyword citada no body **tem** de ser `strongest_keyword` ou uma de `top_keywords`. Nunca citar uma de `zero_signal_keywords` ou `dropped_keywords` como procura forte — só podem ser referidas como "temas sem procura mensurável" se a acção for descartá-los.
- `trend_direction` traduz-se: `up` → "tendência em alta", `flat` → "procura estável", `down` → "tendência em queda".
- Se `usable_keyword_count <= 1`, focar o insight nessa keyword única; não inventar diversidade.
- Exemplo CORRECTO a acrescentar ao prompt: `"A procura por «ia» apresenta sinal médio de 65 e tendência em alta (+22%). Reforçar conteúdos sobre IA nas próximas 4 semanas e medir o envolvimento."`
- Exemplo PROIBIDO a acrescentar: `"Alinhar o conteúdo com as keywords em tendência."` (genérico, sem número).

### 4. `src/lib/insights/validate.ts`
**Não alterar** `hasQuantitativeMarker` nem a lista de leaks. O fix é fazer o prompt fornecer números reais (`strongest_score`, `trend_delta_pct`) que o modelo é instruído a citar — passa pelo ramo `/\d/.test(body)` naturalmente.

Única mudança defensiva: garantir que `EVIDENCE_ALIASES` não precisa de novos aliases (os novos paths são longos e canónicos, dificilmente abreviados pelo modelo). Sem alteração.

### 5. Testes locais (`src/lib/insights/__tests__/validate-market.test.ts`)
Novo ficheiro vitest com fixture mínima de `InsightsContext` (perfil dummy, `market_signals.has_free=true`, `strongest_keyword="ia"`, `strongest_score=65`, `trend_delta_pct=22`, `trend_direction="up"`, `top_keywords=["ia"]`, `zero_signal_keywords=["marketingdigital"]`, `usable_keyword_count=1`).

Casos:
1. **Pass**: 3 insights, um deles com body `"A procura por «ia» apresenta sinal médio de 65 e tendência em alta. Reforçar conteúdos sobre este tema durante 4 semanas."` e evidence `["market_signals.strongest_keyword", "market_signals.strongest_score", "market_signals.trend_direction"]` → `validateInsights` devolve `ok: true`.
2. **Fail GENERIC_OUTPUT**: mesmo array mas body `"Alinhar o conteúdo com as keywords em tendência."` (sem dígito, tokens não match).
3. **Fail EVIDENCE_INVALID**: body cita `"marketingdigital"` com evidence `["market_signals.zero_signal_keywords"]` mas a fixture coloca `marketingdigital` em `zero_signal_keywords`. Validador deve aceitar o path (está em `available_signals`), mas o teste pode em vez disso verificar que `zero_signal_keywords` aparece em `available_signals` apenas como contexto. Ajuste: o caso 3 fica como teste de **prompt** — confirma que `available_signals` inclui `zero_signal_keywords` e que `top_keywords` não inclui `marketingdigital`. Sem chamar OpenAI.

(Optei por testes determinísticos sobre o validador + builder, sem mock de OpenAI.)

### 6. Validação
- `bunx tsc --noEmit`
- `bun run build`
- Não chamar `/api/analyze-public-v1`, Apify, OpenAI, DataForSEO. Não invalidar snapshots.

## Notas

- `inputs_hash` em `AiInsightsV1.source_signals` vai mudar para snapshots novos — é o objetivo (drift legítimo). Snapshots antigos com `ai_insights_v1` continuam servíveis.
- Não toca em `/report/example` nem em ficheiros locked.
- O snapshot existente `b2d453cd-…` continuará sem `ai_insights_v1`; o próximo smoke test (não corrido neste prompt) fará a nova chamada com o prompt corrigido.

## Ficheiros tocados

- `src/lib/insights/types.ts` (estender `market_signals`)
- `src/routes/api/analyze-public-v1.ts` (`summarizeMarketSignalsForInsights`)
- `src/lib/insights/prompt.ts` (`computeAvailableSignals`, `InsightsUserPayload`, `buildInsightsUserPayload`, `INSIGHTS_SYSTEM_PROMPT`)
- `src/lib/insights/__tests__/validate-market.test.ts` (novo)

## Checkpoint

- ☐ `types.ts` aceita os novos campos opcionais
- ☐ `summarizeMarketSignalsForInsights` separa fortes de zero-signal e calcula score+delta
- ☐ Prompt expõe `strongest_score`, `trend_delta_pct`, `usable_keyword_count`, `zero_signal_keywords`
- ☐ System prompt obriga citação de número de mercado quando `has_free`
- ☐ Validador inalterado
- ☐ Vitest local: 3 casos passam (1 pass, 2 fail esperados)
- ☐ `bunx tsc --noEmit` ok
- ☐ `bun run build` ok
- ☐ Pronto para novo smoke test controlado
