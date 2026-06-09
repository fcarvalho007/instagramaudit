# Plano de segurança — segunda ronda

Os três críticos (CRIT-1 admin, CRIT-2 enrichment, CRIT-3 onboarding) já foram implementados na ronda anterior. Este plano cobre os riscos MEDium e LOW confirmados na auditoria, um por vez, com o mínimo de ficheiros tocados e sem alterar UI, preços, créditos ou conteúdo de relatório.

---

## Fix 1 — CSRF / cookie hardening (MED-1)

**Problema.** `lead_session` usa `SameSite=None` em produção (`src/lib/onboarding/lead-cookie.server.ts:133`) e `start.ts:470` aceita CORS de qualquer origem em rotas state-changing (`/onboarding/*`, `/admin/*`), sem CSRF token. Permite a um site terceiro disparar requests autenticados em nome do utilizador.

**Fix.**
- `lead-cookie.server.ts`: `SameSite=Lax` por defeito; manter `None` só atrás de flag `LEAD_COOKIE_CROSS_SITE=true` (não definida).
- `src/lib/admin/cookie.server.ts`: confirmar `SameSite=Lax` (já deve estar).
- `src/start.ts`: restringir CORS a `APP_BASE_URL` + `PUBLIC_APP_BASE_URL` em vez de `*` para rotas `/api/onboarding/*`, `/api/admin/*`, `/api/checkout/*`. Manter `*` apenas em `/api/public/*` GET read-only.

**Testes.** Atualizar testes existentes de cookies em `lead-cookie.server.test.ts` (se existir) ou criar mínimos para asserts de atributos.

**Risco residual.** Browsers antigos sem suporte a Lax podem requerer re-login em fluxos cross-tab.

---

## Fix 2 — `lead_session` TTL real (MED-2)

**Problema.** `decodeLeadCookie` não rejeita cookies > MAX_AGE; o `iat` é assinado mas ignorado.

**Fix.** `src/lib/onboarding/lead-cookie.server.ts`: rejeitar (`return null`) quando `now - iat > 90 dias`. Constante `LEAD_COOKIE_HARD_TTL_MS`.

**Testes.** Adicionar caso em `__tests__/lead-cookie.server.test.ts`.

**Risco residual.** Utilizadores muito antigos voltam a passar por OTP — comportamento desejado.

---

## Fix 3 — Snapshots públicos por UUID (MED-3)

**Problema.** `src/routes/api/public/analysis-snapshot.by-id.$id.ts` e `report-snapshot.by-id.$id.ts` servem snapshots a qualquer UUID conhecido, sem qualquer prova de posse.

**Fix.** Gating em duas camadas, sem partir partilhas legítimas:
- Aceitar se `Bearer INTERNAL_API_TOKEN` (já usado pelo render PDF).
- Caso contrário exigir `lead_session` válido **E** verificar via `supabaseAdmin` que o snapshot pertence ao `lead_id` (ou `report_request.lead_id`) do cookie.
- Manter URL pública assinada (HMAC + exp) como terceira via para partilha intencional — adicionar helper `signSnapshotShareToken` e aceitar `?t=<token>` quando presente. Sem alterar UI; a UI hoje já chama estes endpoints autenticada.

**Testes.** Adicionar testes que cobrem (a) bearer válido, (b) cookie do dono, (c) cookie de outro lead → 403, (d) token de partilha válido.

**Risco residual.** Se algum consumidor externo dependia de UUID público, terá de migrar para token assinado.

---

## Fix 4 — `whoami` enumeração (MED-4)

**Problema.** `GET /api/admin/whoami` confirma se um email está na allowlist sem prova → oráculo.

**Fix.** `src/routes/api/admin/whoami.ts`: devolver sempre `{ authenticated: false }` quando não existir `admin_session` cookie válido; nunca confirmar pertença à allowlist.

**Testes.** Adicionar caso em `__tests__/whoami.test.ts`.

**Risco residual.** Nenhum.

---

## Fix 5 — Cron auth aceitando anon key (MED-5)

**Problema.** `src/lib/cron/cron-auth.server.ts:12-22` aceita o `SUPABASE_ANON_KEY` como autorização válida.

**Fix.** Remover branch anon. Aceitar apenas `Bearer CRON_SECRET` (ou `INTERNAL_API_TOKEN` se preferir reutilizar). Atualizar configuração pg_cron se necessário — documentar.

**Testes.** Test unit em `cron-auth.server.test.ts`.

**Risco residual.** Jobs externos a apontar para anon key falham até reconfigurar header — verificar lista de cron jobs antes de mergear.

---

## Fix 6 — Rate-limit server-side (MED-6)

**Problema.** `/api/onboarding/start` e `/api/public/analyze-public-v1` sem rate-limit persistente (apenas in-memory que reseta a cada deploy).

**Fix.** Mínimo viável sem nova infra:
- Criar tabela `public.rate_limit_buckets (key text pk, count int, window_started_at timestamptz)` com RLS deny-all e GRANT apenas a `service_role`.
- Helper `src/lib/security/rate-limit.server.ts` com `checkAndIncrement(key, limit, windowSec)` via `supabaseAdmin`.
- Aplicar:
  - `/onboarding/start`: 10/min por IP (`getRequestIP`).
  - `/analyze-public-v1`: 5/min por IP, 20/dia por handle.
- 429 com `Retry-After`.

**Testes.** Unit para o helper (mock supabase), integração para os dois endpoints.

**Risco residual.** Latência extra ~20 ms por request; cap conservador.

---

## Fix 7 — Validar `return_url` como caminho relativo interno (princípio explícito do utilizador)

**Problema.** `return_url` aceite em fluxos de auth/checkout pode ser usado para open redirect.

**Fix.** Helper `src/lib/security/safe-return-url.ts`: aceitar apenas strings que começam por `/`, sem `//`, sem `\`, sem esquema. Usar em todos os consumidores (`onboarding/*`, `checkout/*`, magic-link callback). Default `/`.

**Testes.** Unit table-driven do helper.

**Risco residual.** Nenhum.

---

## Fix 8 — Validação estrita de payloads públicos (princípio explícito)

**Problema.** Alguns endpoints públicos fazem parse parcial sem Zod estrito.

**Fix.** Auditar `src/routes/api/public/*` e `src/routes/api/onboarding/*` e garantir `z.object({...}).strict().parse(body)` em todos os POST. Sem alterar shapes existentes; apenas rejeitar campos extra e tipos errados.

**Testes.** Adicionar 1 caso negativo por endpoint.

**Risco residual.** Cliente que enviasse campos não documentados começa a falhar — desejado.

---

## Fix 9 — Idempotência e nunca confiar em `price`/`amount`/`lead_id` do cliente (princípio explícito)

**Problema.** A confirmar caso a caso; o webhook EuPago já valida HMAC e tem unique index. Validar que `/api/checkout/start` deriva o preço **server-side** a partir de `pricing_plans` pelo `plan_id`, e nunca aceita `price`/`amount` do body.

**Fix.** Re-ler `src/routes/api/checkout/*` e remover qualquer leitura de `amount`/`price`/`credits` do body; derivar tudo de `pricing_plans` por id. Garantir que `lead_id` vem sempre do `lead_session` cookie, nunca do body.

**Testes.** Caso que envia `amount: 0` no body e confirma que o EuPago é chamado com o preço real do plano.

**Risco residual.** Nenhum se já estiver assim — passo é verificação + hardening defensivo.

---

## Fix 10 — Lows confirmados

- **LOW-1.** `src/start.ts:151-166`: remover `handle` raw dos logs de erro (usar hash).
- **LOW-3.** `src/routes/api/admin/simple-login.ts`: 403 genérico sem ecoar `email`.
- **LOW-5.** Startup check: se `EUPAGO_WEBHOOK_SECRET` ausente, log `error` no boot (não silencioso).

Sem testes novos — alterações triviais.

---

## Ordem de execução proposta

1. Fix 4 (whoami) — 1 ficheiro, zero risco.
2. Fix 7 (return_url helper) — base para Fix 8.
3. Fix 2 (lead cookie TTL).
4. Fix 1 (CSRF/CORS).
5. Fix 5 (cron anon).
6. Fix 9 (checkout server-side pricing).
7. Fix 8 (Zod strict).
8. Fix 3 (snapshot gating) — requer mais testes.
9. Fix 6 (rate-limit) — requer migração SQL.
10. Fix 10 (lows).

Cada fix é committed isoladamente. Sem alterações de UI, preços, créditos ou conteúdo de relatório em nenhum passo.

---

## Confirmação antes de avançar

Confirmas que avançamos com **todos os 10 fixes** nesta ordem, ou queres limitar esta ronda a um subconjunto (p.ex. só MEDs, deixando LOWs para depois)?