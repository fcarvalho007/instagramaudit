### Objetivo
Expor leitura read-only dos caps Apify e estado do allowlist no endpoint `/api/admin/diagnostics`, para confirmar:
- `APIFY_ENABLED=true`
- `APIFY_HARD_CAP_USD >= 5`
- `APIFY_DAILY_CAP_USD >= 5`
- `frederico.m.carvalho`, `martimsilvai`, `mariiana.ai` presentes no allowlist

Sem alterar lógica de runtime, sem expor `APIFY_TOKEN`.

### Alterações

**`src/routes/api/admin/diagnostics.ts`** — estender o objecto `apifyRuntimeCheck`:

1. Importar `getDailyCapUsd` e `getHardCapUsd` de `@/lib/security/apify-budget.server` (já existem; defaults 5 e 10).
2. Acrescentar 3 handles esperados ao check:
   ```ts
   const EXPECTED_HANDLES = ["frederico.m.carvalho", "martimsilvai", "mariiana.ai"] as const;
   const missingHandles = EXPECTED_HANDLES.filter(h => !allowlist.includes(h));
   ```
3. Acrescentar ao `apifyRuntimeCheck`:
   ```ts
   daily_cap_usd: getDailyCapUsd(),
   hard_cap_usd: getHardCapUsd(),
   daily_cap_meets_min_5: getDailyCapUsd() >= 5,
   hard_cap_meets_min_5: getHardCapUsd() >= 5,
   expected_handles: EXPECTED_HANDLES,
   expected_handles_present: missingHandles.length === 0,
   expected_handles_missing: missingHandles,
   ```
4. Não alterar `blocking_reason` nem `ready_for_smoke_test` (compatibilidade).

### Verificação

Após o deploy, invocar `GET /api/admin/diagnostics` (com sessão admin) e ler `apify_runtime_check`. Vou correr a chamada e reportar os 4 pontos pedidos.

### Não-objectivos

- Não alterar caps.
- Não alterar allowlist.
- Não expor `APIFY_TOKEN` nem outros segredos.
- Não tocar em produção (`/analyze/$username`, snapshots, leads).