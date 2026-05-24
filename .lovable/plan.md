## Diagnóstico

**Causa do HTTP 503 / `CACHE_ONLY_NO_DATA`:**

A configuração `app_config.analysis_execution_mode` está em `cache_only` (confirmado por leitura direta da DB; último update 2026-05-07 por `admin`).

```
key                     | value      | updated_at                 | updated_by
analysis_execution_mode | cache_only | 2026-05-07 21:42:17.929+00 | admin
```

Em `src/routes/api/analyze-public-v1.ts` (linhas 480–518), quando `mode === "cache_only"` e não existe snapshot prévio para o handle, o endpoint devolve imediatamente `CACHE_ONLY_NO_DATA` (HTTP 503) **antes** de avaliar a allowlist ou chamar a Apify. Por isso `APIFY_ENABLED=true` e `APIFY_TESTING_MODE=false` não bastam.

**Valores aceites:** apenas `cache_only` e `fresh` (ver `src/lib/admin/execution-mode.server.ts` linha 10 e o normalizador na linha 32: qualquer valor diferente de `"fresh"` colapsa para `"cache_only"`). Não existe `"live"`.

**Como `/admin/sistema` altera:** usa o server fn `setExecutionMode` (`src/server/admin/execution-mode.functions.ts`), que faz upsert em `app_config` e invalida o cache em memória (TTL 30s). É suficiente alterar a DB — não há secret/env adicional a mudar para este toggle.

**APIFY_TESTING_MODE=false + APIFY_ENABLED=true em modo `fresh`:** suficiente para handles fora da allowlist. Com `testingMode` desligado, a allowlist é ignorada (linhas 522–540) e a chamada segue para a Apify normalmente. Guardas de orçamento (`APIFY_DAILY_CAP_USD`, `APIFY_HARD_CAP_USD`) e rate-limit por IP/handle (`PUBLIC_MAX_FRESH_PER_IP_DAY`, `PUBLIC_MAX_FRESH_PER_HANDLE_DAY`) permanecem ativos — não são tocados.

## Plano

1. **Update DB (única alteração):**
   ```sql
   UPDATE app_config
   SET value = 'fresh', updated_at = now(), updated_by = 'admin-plan-mode'
   WHERE key = 'analysis_execution_mode';
   ```
   Via `supabase--insert` (tool de data write). O cache em memória de 30s expira sozinho; se for urgente, reinício do dev server limpa.

2. **Sem alterações a código, secrets ou schema.** APIFY_ENABLED e APIFY_TESTING_MODE ficam como estão.

3. **Validação (1 handle público, fora da allowlist):**
   - Escolher um handle pequeno e seguro (ex.: handle do próprio dono, mas que não esteja na allowlist `frederico.m.carvalho` / `martimsilvai`) — proposta: usar um handle de baixo volume à escolha do utilizador para evitar surpresas de custo. Default sugerido: **`nasa`** (perfil estável, público, baixo custo de scrape) — confirmar antes de executar.
   - Chamar `POST /api/analyze-public-v1` com esse handle via `stack_modern--invoke-server-function`.
   - Confirmar:
     - status != 503 e payload sem `CACHE_ONLY_NO_DATA`
     - `data_source` no response: `fresh` (esperado) ou `cache` se já existir snapshot
     - 1 linha em `provider_call_logs` apenas se `data_source=fresh`
     - 1 linha em `analysis_events` com `outcome=success` e `data_source=fresh`
     - resposta pública não expõe stack/erro do provider
   - Ler `cost_daily` / `provider_call_logs` para custo real.

## Output esperado (a preencher no fim)

- Valor antes: `cache_only`
- Valor depois: `fresh`
- Handle testado: _(a confirmar)_
- Apify chamada: sim/não
- Custo estimado/real: _(da provider_call_logs)_
- Eventos inseridos: _(IDs analysis_events + provider_call_logs)_
- GO/NO-GO público

## Pergunta antes de executar

Confirmas o handle de teste? Sugestão: **`nasa`** (público, estável). Em alternativa indica outro handle pequeno fora da allowlist.
