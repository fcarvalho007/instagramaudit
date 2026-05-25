## Diagnóstico

O facto de `nasa` ter devolvido `PROFILE_NOT_ALLOWED` prova que `APIFY_TESTING_MODE` **não está** com o valor literal `"false"` em runtime — é a única condição que dispara esse `errorCode` (`src/routes/api/analyze-public-v1.ts:527-543` via `isTestingModeActive()` em `src/lib/security/apify-allowlist.ts:27-30`, regra `process.env.APIFY_TESTING_MODE !== "false"`).

Os restantes secrets pedidos (`APIFY_ENABLED`, `APIFY_HARD_CAP_USD`, `APIFY_DAILY_CAP_USD`, `PUBLIC_MAX_FRESH_PER_IP_DAY`, `PUBLIC_MAX_FRESH_PER_HANDLE_DAY`) existem em Lovable Cloud mas os valores actuais não são visíveis (são secrets, não env vars expostas). Para garantir runtime ≡ contracto, reaplico todos com o valor pretendido.

## Plano

### 1. Atualizar secrets (Lovable Cloud)

Via `secrets--update_secret` (uma única interação para o utilizador colar os 6 valores num formulário seguro):

| Secret | Valor a aplicar |
|---|---|
| `APIFY_TESTING_MODE` | `false` (literal, lowercase, sem aspas/espaços) |
| `APIFY_ENABLED` | `true` |
| `APIFY_HARD_CAP_USD` | `10` |
| `APIFY_DAILY_CAP_USD` | `5` |
| `PUBLIC_MAX_FRESH_PER_IP_DAY` | `10` |
| `PUBLIC_MAX_FRESH_PER_HANDLE_DAY` | `5` |

⚠️ `APIFY_TESTING_MODE` é case-sensitive e exact-match. Qualquer outro valor (`False`, `0`, vazio, espaços à volta) mantém o modo allowlist activo.

Sem alterações a código, sem migrações, sem mexer em UI / lógica de análise.

### 2. Aguardar redeploy automático

A actualização de secrets em Lovable Cloud reinicia o worker. Não é necessário comando manual.

### 3. Teste controlado único

Após confirmação do redeploy, **uma só** chamada via `stack_modern--invoke-server-function`:

```
POST /api/analyze-public-v1
Body: { "username": "natgeo" }
```

Escolha de handle: `natgeo` — conta institucional, fora de allowlist, baixo risco editorial, tráfego previsível. `nasa` é viável mas mantemo-lo de reserva caso `natgeo` falhe upstream.

Custo previsto: 1 corrida Apify (1 perfil + 12 posts) ≈ **$0.01–0.03** — bem abaixo do `APIFY_DAILY_CAP_USD=5`.

### 4. Verificação no DB (read-only)

Logo após a chamada, queries via `supabase--read_query`:

- `analysis_events` → `outcome`, `data_source`, `estimated_cost_usd`, `error_code` para o handle/created_at recente
- `provider_call_logs` → `status`, `actor`, `posts_returned`, `duration_ms`, `estimated_cost_usd`, `error_excerpt` (não exposto à response pública)
- `analysis_snapshots` → existe linha nova com `provider=apify`?

### 5. Verificar sanitização da resposta pública

Confirmar que o JSON devolvido pelo endpoint **não contém**:
- `APIFY_TOKEN`, `Authorization`, `Bearer`
- mensagens raw do upstream (`ApifyUpstreamError.message`)
- `error_excerpt` ou stack traces

### 6. Relatório final (GO / NO-GO)

Tabela compacta com:
- HTTP status
- `data_source` retornado (`fresh` esperado)
- Apify foi chamado (sim/não — via `provider_call_logs`)
- custo estimado vs actual
- `analysis_event` id criado
- `provider_call_log` id criado
- sinal de fuga sensível (esperado: nenhum)

Decisão: **GO** se `data_source=fresh`, sem `PROFILE_NOT_ALLOWED`/`CACHE_ONLY_NO_DATA`, custo logado e response sanitizada. Caso contrário **NO-GO** com causa-raiz e próximo passo.

## Restrições respeitadas

- Sem alterações a UI, sem alterações à lógica de análise.
- Sem chamadas manuais a OpenAI/DataForSEO.
- Apenas **1** chamada Apify paga.
- Rate-limit e budgets continuam activos (caps mantidos, allowlist desactivada mas restantes guardas ficam — `apify-budget`, `public-rate-limit` continuam a contar).

## Checkpoint

- ☐ Secrets reaplicados (6 valores)
- ☐ Worker reiniciado
- ☐ 1 POST a `/api/analyze-public-v1` com `natgeo`
- ☐ Verificação `analysis_events` + `provider_call_logs` + `analysis_snapshots`
- ☐ Confirmação de sanitização da resposta
- ☐ Relatório GO/NO-GO ao utilizador