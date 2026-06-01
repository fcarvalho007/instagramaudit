## Objetivo
Ativar modo de teste do `/admin/apify-lab` sem tocar em runtime de produção nem em caps/token.

## Passos

1. **Atualizar 2 secrets** via `secrets--update_secret` (formulário seguro, valores introduzidos pelo utilizador):
   - `APIFY_TESTING_MODE` → `true`
   - `APIFY_ALLOWLIST` → `frederico.m.carvalho,martimsilvai,mariiana.ai`

2. **Não tocar** em: `APIFY_ENABLED`, `APIFY_DAILY_CAP_USD`, `APIFY_HARD_CAP_USD`, `APIFY_TOKEN`.

3. **Chamar** `GET /api/admin/diagnostics` via `invoke-server-function` e devolver apenas o bloco `apify_runtime_check`.

4. **Confirmar** os 6 campos esperados:
   - `testing_mode_active=true`
   - `expected_handles_present=true`
   - `expected_handles_missing=[]`
   - `ready_for_smoke_test=true`
   - `daily_cap_usd=5`
   - `hard_cap_usd=10`

## Garantias
- Sem chamadas a Apify.
- Sem alterações de código, UI, ou outros secrets.
- Se algum campo divergir, reporto o valor real sem corrigir nada.
