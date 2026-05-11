## Objetivo
Permitir análise pública fora do allowlist com guarda-chuva de custo, rate-limit, kill-switch e error handling seguro — antes de virar `APIFY_TESTING_MODE=false`.

## Auditoria do estado atual

### Gating em `src/routes/api/analyze-public-v1.ts` (ordem)
1. Validação Zod do username (`/^[A-Za-z0-9._]{1,30}$/`, máx 2 competidores).
2. Lookup de `analysis_snapshots` por `cache_key` (60min TTL fresco; janela "stale" mais larga). Cache hit ⇒ devolve imediatamente, **sem gating adicional**.
3. Modo `cache_only` (vem de `app_config.analysis_execution_mode`): se ativo e sem cache ⇒ `CACHE_ONLY_NO_DATA`.
4. **Allowlist (`isTestingModeActive()` default ON)**: se `APIFY_TESTING_MODE !== "false"` e handle não está em `APIFY_ALLOWLIST` ⇒ `PROFILE_NOT_ALLOWED` (403). Competidores não-allowlisted são silenciosamente removidos.
5. **Hard kill-switch `APIFY_ENABLED`**: se ≠ `"true"` ⇒ stale fallback se houver, senão `PROVIDER_DISABLED` (503).
6. Apify call (`apify/instagram-scraper`, `POSTS_LIMIT=12`).
7. Erros mapeados para `PROFILE_NOT_FOUND` (404) / `UPSTREAM_UNAVAILABLE` (503) / `UPSTREAM_FAILED` (502).

### Kill-switches existentes
- `APIFY_ENABLED` (default OFF — só `"true"` ativa).
- `OPENAI_ENABLED`, `DATAFORSEO_ENABLED` em allowlists análogas (`src/lib/security/openai-allowlist.ts`, `dataforseo-allowlist.ts`).
- `APIFY_TESTING_MODE` (default ON, allowlist obrigatório).

### Cost tracking
- `provider_call_logs` — uma row por chamada Apify (status, duração, custo estimado, posts retornados). ✅
- `analysis_events.estimated_cost_usd` — agregado por evento.
- `cost_daily` — só reconciliação (memória do projeto: provider_call_logs é fonte única; cost_daily só Apify+DFS).
- `usage_alerts` (`src/lib/admin/alerts.ts`):
  - `daily_cost_threshold` ≥ `ALERT_DAILY_COST_USD` (default $1) — **post-hoc, não bloqueia**.
  - `ip_burst` ≥ `ALERT_IP_BURST_PER_HOUR` (default 20) — **post-hoc**.
  - `repeated_profile`, `high_failure_rate`, `stale_serve` — todos post-hoc.
- OpenAI já tem hard cap `OPENAI_DAILY_CAP_USD` (default $5) com `DAILY_CAP_REACHED` ✅.

### Error handling — gaps
- ❌ `failure("UPSTREAM_UNAVAILABLE", { provider, provider_error_code, details: err.message })` (linha 952)
- ❌ `failure("UPSTREAM_FAILED", { provider_message: err.message, provider_status })` (linha 983)
- ❌ `failure("UPSTREAM_FAILED", { details: err instanceof Error ? err.message : String(err) })` (linha 1001)

Mensagens raw de Apify (timeouts, IDs internos, JSON paths) chegam ao cliente. Alguns campos (`provider_error_code`, `provider_status`) são úteis para o frontend; `details`/`provider_message` raw devem ficar só nos logs.

### Gaps críticos para produção pública
1. **Sem hard budget** Apify diário — só alerta ($1/dia) que é warning, não bloqueia.
2. **Sem rate limit** por IP/email/dia — só `ip_burst` post-hoc (depois das chamadas).
3. **Sem dedup** entre cache hit e fresh por mesmo (handle, IP) curto-prazo.
4. **Mensagens raw** de Apify expostas ao cliente.
5. **`PROFILE_NOT_FOUND`** e **`PROFILE_NOT_ALLOWED`** sem distinção UX entre "perfil privado" e "não existe" (Apify devolve 404 para ambos).

## Mudanças propostas (a implementar em prompt seguinte — **NÃO FAZER AGORA**)

### A. Hard budget Apify diário (gate, não alerta)
- Novo helper `assertApifyDailyBudgetAvailable()` em `src/lib/security/apify-budget.server.ts`:
  - Lê `APIFY_DAILY_CAP_USD` (default `5`) e `APIFY_HARD_CAP_USD` (default `10`).
  - Sum `provider_call_logs.estimated_cost_usd` onde `provider='apify'` e `created_at >= startOfUtcDay` (single round-trip; cache 60s).
  - Se ≥ hard cap ⇒ throw `BudgetExceededError`.
- No `analyze-public-v1.ts` (após kill-switch, antes do `try { fetchProfileWithPostsLogged(...)`):
  - Try/catch ⇒ devolve novo error code `BUDGET_EXCEEDED` (503).
- **Servir stale** se `existing && isWithinStaleWindow(existing)` (igual ao APIFY_ENABLED off).

### B. Rate limit por IP/handle (pré-call)
- Helper `assertWithinPublicRateLimit({ ipHash, handle })` em `src/lib/security/public-rate-limit.server.ts`:
  - Lê `PUBLIC_MAX_FRESH_PER_IP_DAY` (default `10`) e `PUBLIC_MAX_FRESH_PER_HANDLE_DAY` (default `5`).
  - Conta `analysis_events` last-24h com `data_source='fresh'` e `outcome='success'` por `request_ip_hash` e por `handle`.
  - Excedido ⇒ throw `RateLimitError` ⇒ `RATE_LIMITED` (429).
- Aplicar **só em modo fresh** (não bloqueia cache).

### C. Novos error codes e UX
- `BUDGET_EXCEEDED` (503) — `"O limite diário de análises foi atingido. Voltar amanhã."`
- `RATE_LIMITED` (429) — `"Muitos pedidos. Aguardar uns minutos antes de nova análise."`
- `PROFILE_NOT_FOUND` mantém-se para handles inexistentes; adicionar `PROFILE_PRIVATE` (404) detetado quando Apify devolve `is_private=true` no payload — `"Perfil privado. A análise pública só funciona com perfis abertos."`

### D. Sanitizar respostas de erro
- Remover `details`, `provider_message`, `provider_error_code`, `provider_status` do `extra` enviado ao cliente.
- Manter o detalhe nos `console.error` e em `provider_call_logs.error_excerpt` (já existe).
- `failure()` continua a aceitar `extra` mas a chamada pública passa apenas `{ retry_after_seconds }` quando relevante.

### E. Env de produção (sem aplicar agora — apenas plano)
| Variável | Atual | Produção |
|---|---|---|
| `APIFY_TESTING_MODE` | ON (default) | `"false"` |
| `APIFY_ENABLED` | varia | `"true"` |
| `APIFY_ALLOWLIST` | preenchido | manter (usado se voltar testing) |
| `APIFY_DAILY_CAP_USD` | — | `5` (warning) |
| `APIFY_HARD_CAP_USD` | — | `10` (block) |
| `PUBLIC_MAX_FRESH_PER_IP_DAY` | — | `10` |
| `PUBLIC_MAX_FRESH_PER_HANDLE_DAY` | — | `5` |
| `ALERT_DAILY_COST_USD` | $1 default | `3` (warning antes do hard cap) |
| `ALERT_IP_BURST_PER_HOUR` | 20 | `15` |

### F. Testes
- `apify-budget.server.test.ts` — caps + cache 60s + soma correta.
- `public-rate-limit.server.test.ts` — gate por IP e por handle, ignora cache.
- `analyze-public-v1.test.ts` — novos casos: budget exceeded com stale fallback, rate-limit por IP, sanitização de erro (sem `details`/`provider_message` no body).

## Riscos de custo (estado actual)
- Apify Starter: ~$0.50–$1.00 por análise unificada (1 perfil + 12 posts × até 3 perfis).
- Sem rate-limit: 1 atacante pode disparar 100 análises/min em handles aleatórios ⇒ $50–$100 em <1h, com alerta a chegar **depois** do gasto.
- `daily_cost_threshold` warning a $1 não pára nada — atualmente é informativo.

## Guardas obrigatórias antes de `APIFY_TESTING_MODE=false`
1. ✅ Hard budget cap (`APIFY_HARD_CAP_USD`) com bloqueio sintetizado.
2. ✅ Rate-limit por IP e por handle (24h).
3. ✅ Sanitização de payloads de erro.
4. ✅ Mensagens UX para `BUDGET_EXCEEDED`, `RATE_LIMITED`, `PROFILE_PRIVATE`.
5. ✅ Stale-fallback funciona quando budget esgotado.
6. ✅ Testes a cobrir os 3 caminhos novos.

## Implementation prompt (próximo turno)
> Implement the production-safety guards for `analyze-public-v1` per the approved plan: (A) `apify-budget.server.ts` with `APIFY_DAILY_CAP_USD`/`APIFY_HARD_CAP_USD` gating from `provider_call_logs` 24h sum, (B) `public-rate-limit.server.ts` per-IP/per-handle limits from `analysis_events` 24h, (C) new error codes `BUDGET_EXCEEDED` (503), `RATE_LIMITED` (429), `PROFILE_PRIVATE` (404) with PT-PT messages, (D) drop `details`/`provider_message`/`provider_status` from `extra` in `failure()` call sites, keep them only in `console.error`. Wire all guards in `analyze-public-v1.ts` after `APIFY_ENABLED` check, before fresh fetch. Add unit tests for budget, rate-limit, and sanitization. Do NOT change env values. Do NOT touch `APIFY_TESTING_MODE`.

## Out of scope (já confirmado)
- Não mexer em secrets agora.
- Não chamar Apify.
- Não enviar emails.
- Não regenerar relatórios.
- Não tocar em `/report.example`.

## Validação prevista
- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual:
  - simular budget esgotado em dev (mock supabase) ⇒ `BUDGET_EXCEEDED`
  - 11º pedido fresh do mesmo IP ⇒ `RATE_LIMITED`
  - response body de erro sem string raw do Apify
