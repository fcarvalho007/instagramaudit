## Objetivo

Validar que o pipeline `/api/analyze-public-v1` está pronto para uso público com Apify em modo controlado, sem alterar UI, schema, emails ou relatórios. Apenas leitura + 1 chamada fresh segura.

## Como o servidor lê cada variável (confirmado por inspeção)

| Variável | Lida em | Default se ausente |
|---|---|---|
| `APIFY_TESTING_MODE` | `src/lib/security/apify-allowlist.ts:29` — `process.env.APIFY_TESTING_MODE !== "false"` (qualquer valor ≠ `"false"` mantém allowlist) | testing ON |
| `APIFY_ENABLED` | `apify-allowlist.ts:52` — exige literal `"true"` | OFF |
| `APIFY_HARD_CAP_USD` | `src/lib/security/apify-budget.server.ts:41` | 10 |
| `APIFY_DAILY_CAP_USD` | `apify-budget.server.ts:37` | 5 |
| `PUBLIC_MAX_FRESH_PER_IP_DAY` | `src/lib/security/public-rate-limit.server.ts:37` | 10 |
| `PUBLIC_MAX_FRESH_PER_HANDLE_DAY` | `public-rate-limit.server.ts:41` | 5 |

Diagnóstico admin (`/api/admin/diagnostics`) já expõe `apify.enabled`, `apify.public_mode` (= `enabled && !testing`), `testing_mode.active`, `apify_runtime_check.apify_enabled_raw_is_true`, sem revelar valores de segredos.

## Passos de validação (sequenciais, read-mostly)

### 1. Confirmar config runtime publicada
- Chamar `GET /api/admin/diagnostics` (autenticado como admin) via `stack_modern--invoke-server-function`.
- Registar: `apify.enabled`, `apify.public_mode`, `testing_mode.active`, `apify_runtime_check`, `cost_per_profile_usd`, `cost_per_post_usd`.
- Esperado: `enabled=true`, `public_mode=true`, `testing.active=false`.

### 2. Confirmar caps e rate-limits ativos (sem chamar provider)
- `supabase--read_query`: somar `actual_cost_usd` + `estimated_cost_usd` em `provider_call_logs` do dia UTC para garantir que estamos longe de `APIFY_HARD_CAP_USD=10`.
- Mesma query agrupada por `request_ip_hash`/handle nas últimas 24h em `analysis_events` (data_source='fresh') para confirmar contadores < 10/5.
- Se já perto do cap → STOP e reportar antes de qualquer fresh.

### 3. Escolher 1 handle não-allowlisted
- Candidato: handle Instagram público notório (ex.: `natgeo`) — apenas 1 perfil primário, sem competidores, para minimizar custo (~1 profile + 12 posts ≈ poucos cêntimos).
- Antes da chamada: `supabase--read_query` em `analysis_snapshots` por `instagram_username='natgeo'` + `expires_at > now()` para detetar cache hit. Se existir snapshot fresh (<15d), o teste serve-se da cache e não há custo Apify.

### 4. Chamada única
- `POST /api/analyze-public-v1` com `{ "instagram_username": "<handle>" }` via `stack_modern--invoke-server-function`.
- Capturar: HTTP status, `data_source` retornado na resposta, ausência de `details`/`run_id` em qualquer payload de erro (sanitização).

### 5. Auditoria pós-chamada
- `provider_call_logs` (último minuto, handle alvo): confirmar `provider='apify'`, `status`, `posts_returned`, `estimated_cost_usd`, `actual_cost_usd`, `duration_ms`, `apify_run_id`.
- `analysis_events` (último minuto): confirmar `outcome` (`success` esperado, NÃO `blocked_allowlist`), `data_source` (`fresh` ou `cache`), `estimated_cost_usd`, `analysis_snapshot_id` preenchido.
- Confirmar que NÃO existe evento `blocked_allowlist` para este handle.

### 6. Validações de código
- `bunx tsc --noEmit`
- `bunx vitest run` (focado em `apify-budget`, `public-rate-limit`, `analyze-public-v1-sanitize`, `run-enrichment-budget`)

## Critérios de paragem (abort)
- Diagnostics revela `public_mode=false` ou `APIFY_ENABLED` raw ≠ `"true"`.
- Soma de custos do dia ≥ 80% de `APIFY_HARD_CAP_USD`.
- Falha de `bunx tsc` ou `vitest` antes do passo 4.

## Entregável (resposta final ao utilizador, completa em chat)

1. Valores efetivos detetados em runtime (booleanos + números dos caps).
2. `Modo público activo`: sim/não + razão.
3. Resultado do teste: cache hit / fresh / stale.
4. Provider pago invocado? sim/não.
5. Custo estimado e real registado em `provider_call_logs`.
6. Linhas relevantes de `analysis_events` (outcome, data_source, snapshot_id).
7. Sanitização de erro confirmada (sample do payload se aplicável).
8. Lista de bloqueadores (vazia se GO).

## Restrições respeitadas
- Sem alterações a UI, schema, emails (Brevo/Resend), admin UI ou relatórios.
- Sem novos secrets, sem mutações DB, sem envio de email.
- Apenas 1 chamada fresh (ou 0 se cache hit detetada).
