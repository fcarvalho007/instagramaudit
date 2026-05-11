## Estado atual (auditado)

O código de produção **já está pronto**. A implementação foi feita no turno anterior e está em vigor:

**Guards ativos em `src/routes/api/analyze-public-v1.ts`:**
1. `isApifyEnabled()` — kill-switch hard (linha 560)
2. `isTestingModeActive()` + `isAllowed()` — allowlist condicional (linhas 526–549)
3. `assertApifyDailyBudgetAvailable()` — gate de orçamento diário (linha 603) → fallback stale ou `503 BUDGET_EXCEEDED`
4. `assertWithinPublicRateLimit()` — rate-limit por IP e por handle (linha 648) → `429 RATE_LIMITED`
5. Erros sanitizados: `PROFILE_NOT_FOUND` (404), `PROFILE_PRIVATE` (404), `UPSTREAM_FAILED` sem expor `provider_message` no body público

**Helpers criados:**
- `src/lib/security/apify-budget.server.ts` — soma `provider_call_logs.estimated_cost_usd`/`actual_cost_usd` desde 00:00 UTC, cache 60s
- `src/lib/security/public-rate-limit.server.ts` — conta `analysis_events` (`data_source=fresh`, `outcome=success`) últimas 24h por IP e handle

**Testes:** 360/360 ✅ (8 novos para budget + rate-limit)

Não falta código. Falta apenas **flip dos secrets em produção** e validação manual.

## O que falta (não-código)

### 1. Flip de secrets (requer aprovação explícita)

| Secret | Valor atual | Valor recomendado | Efeito |
|---|---|---|---|
| `APIFY_TESTING_MODE` | `true` (default) | `false` | Permite handles fora do allowlist |
| `APIFY_ENABLED` | `true` | manter `true` | Continua a permitir chamadas frescas |
| `APIFY_HARD_CAP_USD` | (não definido → 10) | `10` explícito | Bloqueio duro diário |
| `APIFY_DAILY_CAP_USD` | (não definido → 5) | `5` explícito | Threshold de aviso |
| `PUBLIC_MAX_FRESH_PER_IP_DAY` | (não definido → 10) | `10` explícito | Cap por IP/24h |
| `PUBLIC_MAX_FRESH_PER_HANDLE_DAY` | (não definido → 5) | `5` explícito | Cap por handle/24h |

Allowlist mantém-se disponível: basta voltar a pôr `APIFY_TESTING_MODE=true` para reativar modo restrito sem deploy.

### 2. Validação manual pós-flip (sem mexer código)

Checklist:
- ☐ Pedir análise de handle **fora** do allowlist → deve retornar dados (não `PROFILE_NOT_ALLOWED`)
- ☐ Verificar `provider_call_logs` recebe `estimated_cost_usd` na nova chamada
- ☐ Confirmar resposta de erro pública **não** expõe `provider_message` nem stack
- ☐ Forçar handle inexistente → `404 PROFILE_NOT_FOUND` com copy pt-PT
- ☐ Forçar perfil privado → `404 PROFILE_PRIVATE` com copy pt-PT
- ☐ Repetir 11× o mesmo IP em 24h → 11ª retorna `429 RATE_LIMITED`
- ☐ Admin `/admin/diagnostics` mostra spend acumulado e rate-limits

### 3. Riscos residuais aceites

- **Custo máximo teórico/dia:** `APIFY_HARD_CAP_USD=10` (≈ 100 análises a $0.10). Se Apify cobrar acima do estimado, descoberto possível até próximo cron de reconciliação.
- **Rate-limit por IP** confia em `request_ip_hash` — utilizadores atrás do mesmo NAT partilham quota. Aceitável para MVP.
- **Cache 60s no budget gate** — janela onde 2 requests concorrentes podem furar o cap em ~1 chamada. Aceitável.

## Fora de âmbito (não fazer agora)

- Mexer em valores de secrets sem aprovação explícita
- Chamar Apify
- Criar tabela `app_config` para budget caps (envs chegam para MVP)
- Email de alerta quando cap atinge 80% (existe `usage_alerts` post-hoc, suficiente)

## Próximo prompt sugerido (quando aprovares o flip)

> "Aprova flip dos secrets Apify para produção pública: `APIFY_TESTING_MODE=false`, `APIFY_HARD_CAP_USD=10`, `APIFY_DAILY_CAP_USD=5`, `PUBLIC_MAX_FRESH_PER_IP_DAY=10`, `PUBLIC_MAX_FRESH_PER_HANDLE_DAY=5`. Depois corre o checklist de validação manual e reporta resultados."