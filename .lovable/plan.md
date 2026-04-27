
## Estado actual — auditoria dos 5 ficheiros

Reli os ficheiros e confirmo que **toda a correção pedida já está em vigor no código actual** (foi aplicada na ronda anterior aprovada com `context: 6951EAA2-...`):

### 1. `src/lib/dataforseo/client.ts`
- `CallOptions` já usa `{ ownerHandle, queryLabel, skipAllowlist?, timeoutMs? }` — `gateValue` foi removido.
- A allowlist é validada **apenas** em `ownerHandle` (linha 86: `isAllowed(ownerHandle)`).
- `provider_call_logs.handle` recebe sempre o owner Instagram normalizado (lowercase, sem `@`).
- `provider_call_logs.actor` recebe `${endpoint}:${queryLabel}` truncado a 200 chars (ex. `serp_google_organic:marketing digital`).
- Kill-switch `DATAFORSEO_ENABLED` continua a ser a primeira verificação.
- Credenciais lidas só de `process.env` (server-side).

### 2. `src/lib/dataforseo/endpoints/google-trends.ts`
- `GoogleTrendsInput` exige `ownerHandle`.
- `queryLabel = keywords.join(",")`.
- Propaga `{ ownerHandle, queryLabel }` ao cliente.

### 3. `src/lib/dataforseo/endpoints/keyword-ideas.ts`
- `KeywordIdeasInput` exige `ownerHandle`.
- `queryLabel = seeds[0]`.
- Caps defensivos mantidos (20 seeds, limit 1..100).

### 4. `src/lib/dataforseo/endpoints/serp-organic.ts`
- `SerpOrganicInput` exige `ownerHandle`.
- `queryLabel = keyword`.
- Cap `depth` 1..30 mantido.

### 5. `src/lib/security/dataforseo-allowlist.ts`
- `isAllowed(value)` faz match case-insensitive sobre o valor passado. O cliente passa-lhe sempre o `ownerHandle` — nunca a keyword.
- `isDataForSeoEnabled()` continua a exigir o literal `"true"`.

### 6. `src/lib/dataforseo/market-signals.ts` e `src/routes/api/market-signals.ts`
- Ambos propagam `ownerHandle` extraído de `analysis_snapshots.instagram_username` até aos três endpoints.
- O endpoint HTTP já aplica também a verificação de allowlist sobre o handle antes de orquestrar (defesa em profundidade).

## Conclusão

Não é preciso alterar código. Os 12 pontos da aprovação estão já satisfeitos pelo estado actual do repositório.

## Acções a executar (depois de aprovares)

1. `bunx tsc --noEmit` — confirmar tipos.
2. `bun run build` — confirmar que o bundle de produção compila.
3. **Não** chamar DataForSEO. **Não** chamar Apify. **Não** criar migrations. **Não** alterar UI pública.

## Output que vou devolver

- Confirmação ficheiro-a-ficheiro de que a allowlist valida `ownerHandle` e que a query fica só em `actor` para auditoria.
- Resultado de `tsc` e `build` (stdout/stderr relevante).
- Confirmação explícita de que nenhuma chamada a DataForSEO ou Apify foi feita durante a validação (são apenas comandos locais de typecheck e bundling).

## Próximo passo (fora deste plano)

Smoke test único ao DataForSEO, **só depois** de confirmares no painel de secrets:

```
DATAFORSEO_ENABLED=true
DATAFORSEO_ALLOWLIST=frederico.m.carvalho
DATAFORSEO_MAX_QUERIES_FREE=1
DATAFORSEO_MAX_QUERIES_PAID=5
```

## Checkpoint

- ☐ Aprovar este plano de validação
- ☐ Correr `bunx tsc --noEmit`
- ☐ Correr `bun run build`
- ☐ Reportar resultados sem fazer qualquer chamada externa
