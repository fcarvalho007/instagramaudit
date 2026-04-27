# Auditoria DataForSEO Allowlist — correcção

## Comportamento actual (BUG confirmado)

A allowlist está a ser comparada com a **keyword derivada**, não com o **owner do relatório**. Linha por linha:

| Ficheiro | Linha | `gateValue` enviado para `isAllowed()` |
|---|---|---|
| `src/lib/dataforseo/endpoints/google-trends.ts` | 45 | `input.keywords[0]` (keyword) |
| `src/lib/dataforseo/endpoints/keyword-ideas.ts` | 54 | `seeds[0]` (keyword) |
| `src/lib/dataforseo/endpoints/serp-organic.ts` | 64 | `keyword` (query) |
| `src/lib/dataforseo/client.ts` | 53–87 | recebe `gateValue` e bate em `isAllowed(gateValue)` |
| `src/lib/security/dataforseo-allowlist.ts` | 34 | função genérica — apenas faz match contra a CSV |

`market-signals.ts` **nunca passa o owner** aos endpoints — o orquestrador só conhece keywords derivadas do snapshot.

`/api/market-signals.ts` (linhas 96–105) já valida o owner contra a allowlist na entrada — boa defesa em camada de rota — mas o cliente, a um nível mais baixo, vai falhar pelo motivo errado se algum dia for chamado directamente, e regista no `provider_call_logs.handle` a keyword em vez do handle do perfil. Isto polui auditoria e mede mal as métricas por handle.

`provider_call_logs.actor` está a guardar apenas o nome do endpoint (ex. `serp_google_organic`), perdendo a query usada na chamada.

**Resultado:** com `DATAFORSEO_ALLOWLIST=frederico.m.carvalho`, qualquer chamada real seria bloqueada pelo cliente porque é `marketing` ou `#seo` que está a ser comparado com `frederico.m.carvalho`.

## Correcção mínima

1. **`client.ts`** — substituir o campo `gateValue` em `CallOptions` por dois campos explícitos:
   - `ownerHandle: string` (obrigatório) → único valor que entra em `isAllowed()`
   - `queryLabel: string` (obrigatório) → guardado em `provider_call_logs.actor` como `"<endpoint>:<query>"` para audit
   - `provider_call_logs.handle` passa a guardar sempre o `ownerHandle` (consistente com Apify)

2. **`endpoints/google-trends.ts`** — adicionar `ownerHandle` obrigatório a `GoogleTrendsInput`. `queryLabel` derivado de `keywords.join(",")`.

3. **`endpoints/keyword-ideas.ts`** — adicionar `ownerHandle` obrigatório a `KeywordIdeasInput`. `queryLabel = seeds[0]`.

4. **`endpoints/serp-organic.ts`** — adicionar `ownerHandle` obrigatório a `SerpOrganicInput`. `queryLabel = keyword`.

5. **`market-signals.ts`** — `buildMarketSignals` e `buildSignalsInner` recebem `ownerHandle` e propagam-no às 3 famílias de chamadas.

6. **`/api/market-signals.ts`** — extrair o `ownerHandle` do `analysis_snapshots.instagram_username` (já lê) e passar a `buildMarketSignals({ ownerHandle, plan, ... })`. A allowlist gate na rota mantém-se exactamente igual.

7. **`security/dataforseo-allowlist.ts`** — **inalterado**. A função é agnóstica; só muda o que lhe é passado.

## Garantias preservadas

- `DATAFORSEO_ENABLED` continua a ser kill-switch absoluto (1.ª verificação no cliente).
- `DATAFORSEO_ALLOWLIST` continua a ser CSV de handles Instagram. Só muda o que comparamos com ela.
- `DATAFORSEO_MAX_QUERIES_FREE/PAID` controlam **número de keywords** por relatório — não muda.
- `Promise.race` 60 s mantém-se.
- Credenciais nunca expostas (Basic Auth runtime no cliente).
- Sem nova migration: usamos colunas `handle` e `actor` que já existem em `provider_call_logs`.

## Ficheiros editados (5)

- `src/lib/dataforseo/client.ts`
- `src/lib/dataforseo/endpoints/google-trends.ts`
- `src/lib/dataforseo/endpoints/keyword-ideas.ts`
- `src/lib/dataforseo/endpoints/serp-organic.ts`
- `src/lib/dataforseo/market-signals.ts`
- `src/routes/api/market-signals.ts`

(Total = 6 ficheiros editados, 0 criados, 0 apagados.)

## Validação

- `bunx tsc --noEmit` ✅ obrigatório
- `bun run build` ✅ obrigatório
- Sem chamada DataForSEO
- Sem chamada Apify
- Sem teste real

## Confirmações antes de avançar

1. Aprovas a refactorização de `gateValue` → `{ ownerHandle, queryLabel }` no `client.ts`?
2. Confirmas que `provider_call_logs.handle` passa a guardar **sempre** o owner Instagram (e a coluna `actor` passa a guardar `<endpoint>:<query>`) — isto altera ligeiramente como o `dataforseo-diagnostics` agrupa, mas alinha com o Apify?
