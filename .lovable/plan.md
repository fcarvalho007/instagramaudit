## Modelo de consumo confirmado

Aplico a tua preferência: **crédito só é consumido quando é necessário gerar ou atribuir um relatório novo ao lead**.

Regras exactas:

| Situação | Crédito |
|---|---|
| Lead criado via `/api/onboarding/start` | +2 (grant inicial, one-shot) |
| Submit do modal → cache hit (<24h) para o mesmo handle **já associado a este lead** | 0 (já lhe pertence) |
| Submit do modal → cache hit (<24h) para handle **novo para este lead** | −1 (atribuição = novo relatório do ponto de vista do lead) |
| Submit do modal → fresh run com sucesso (snapshot criado) | −1 |
| Submit do modal → fresh run falha antes de snapshot utilizável | 0 (refund / nunca debitado) |
| Submit do modal → handle inválido / não suportado / 404 | 0 |
| Saldo = 0 ao submeter | bloquear com erro `insufficient_credits` |

Padrão de implementação: **reserva → confirma OU liberta** (não débito optimista). O endpoint reserva 1 crédito; só converte em débito definitivo após snapshot escrito; em qualquer falha anterior, liberta a reserva.

## Fase 1 — Backend foundation

Sem alterações a `analyze-public-v1`, `HeroActionBar`, `OnboardingModal`, report, pricing, emails, prompts ou Apify/OpenAI.

### 1. Migration

`credit_ledger` (append-only, fonte da verdade):
- `id uuid PK`
- `lead_id uuid NOT NULL` (FK lógica para `leads.id`)
- `delta integer NOT NULL` (+2 grant, −1 reserve, +1 release, etc.)
- `reason text NOT NULL CHECK IN ('initial_grant','reserve','confirm','release','admin_adjust')`
- `handle text NULL` (handle pedido, quando aplicável)
- `cache_key text NULL`
- `analysis_snapshot_id uuid NULL`
- `reservation_id uuid NULL` (liga reserve↔confirm/release)
- `metadata jsonb NOT NULL DEFAULT '{}'`
- `created_at timestamptz NOT NULL DEFAULT now()`

Índices: `(lead_id, created_at desc)`, `(reservation_id)`.

GRANTs: `service_role ALL`. Sem `anon`/`authenticated` directos (acesso só via server fn com service role).

Função SQL `credit_balance(p_lead_id uuid) returns integer language sql stable security definer` → `SELECT coalesce(sum(delta),0) FROM credit_ledger WHERE lead_id=p_lead_id`.

(`leads.id` já existe; não toco em `leads`.)

### 2. Helpers server-side

- `src/lib/credits/credits.server.ts`
  - `grantInitialCredits(leadId)` — idempotente: se já existe `initial_grant` para este lead, não duplica.
  - `getBalance(leadId)` → number
  - `reserveCredit({ leadId, handle, cacheKey })` → `{ reservationId }` ou lança `InsufficientCreditsError` se balance < 1
  - `confirmReservation({ reservationId, analysisSnapshotId })` → escreve `confirm` (delta 0; a reserve já desceu 1)
  - `releaseReservation({ reservationId, reason })` → escreve `release` (+1)
  - Concorrência: transacção `SELECT sum(delta) ... FOR UPDATE` numa linha-sentinela ou via advisory lock por `lead_id` para evitar race.

- `src/lib/leads/lead-cookie.server.ts`
  - Cookie HTTP-only `lead_session`, assinada via `useSession` do `@tanstack/react-start/server` com `SESSION_SECRET` (novo secret) — payload `{ leadId, issuedAt }`.
  - `getLeadFromCookie()` / `setLeadCookie(leadId)` / `clearLeadCookie()`.
  - Sem dados pessoais no cookie.

### 3. Endpoint `/api/onboarding/start`

Server route `src/routes/api/onboarding/start.ts`, `POST`, Zod validation:
- input: `{ name, email, phone?, marketing_consent, beta_consent, user_type?, purpose?, profile_ownership?, pricing_preference? }` (alinhado com `leads`)
- upsert em `leads` por `email_normalized` (já existe coluna)
- se lead novo OU sem `initial_grant`: `grantInitialCredits(leadId)`
- `setLeadCookie(leadId)`
- response: `{ ok: true, lead_id, credits: 2 }`
- security: rate-limit básico por IP-hash (reaproveitar padrão existente), Zod com `max`/`regex`, sem PII no log

### 4. Novo secret

`SESSION_SECRET` (para assinar cookie). Pedido via `add_secret` antes de implementar.

### 5. Testes (Vitest)

- `credits.server.test.ts` — grant idempotente, reserve baixa balance, double reserve sem saldo falha, release devolve, confirm não duplica débito.
- `lead-cookie.server.test.ts` — round-trip set/get, cookie inválido devolve null.
- `onboarding-start.test.ts` (unit do handler) — happy path (lead novo), email existente (não duplica grant), payload inválido devolve 400.

### 6. Validação final

- `bunx tsc --noEmit`
- `bunx vitest run`
- Sem chamadas ao endpoint a partir da UI ainda (Fase 3).

## Ficheiros a criar

- migration `*_credit_ledger.sql`
- `src/lib/credits/credits.server.ts`
- `src/lib/credits/credits.server.test.ts`
- `src/lib/leads/lead-cookie.server.ts`
- `src/lib/leads/lead-cookie.server.test.ts`
- `src/routes/api/onboarding/start.ts`
- `src/routes/api/onboarding/start.test.ts`

## Ficheiros NÃO tocados

`analyze-public-v1.ts`, `HeroActionBar`, `OnboardingModal`, report, pricing, emails, prompts, Apify, OpenAI, `cache.ts`, `leads` (schema).

## Riscos

- Race em reserve concorrente → mitigado por advisory lock por `lead_id`.
- Cookie de lead reaproveitado em browsers partilhados → aceitável nesta fase (sem auth); rotacionar `SESSION_SECRET` invalida todos.
- Email reutilizado por mau actor para acumular créditos → grant idempotente por `lead_id`, e `email_normalized` é UNIQUE no upsert → só 1 grant por email.

## Checkpoint

☐ Confirmas o modelo de consumo (em particular: **cache hit para handle novo a este lead consome 1**)?
☐ OK criar o secret `SESSION_SECRET` agora (gerado aleatoriamente, 32+ bytes)?
☐ OK avançar imediatamente para implementação assim que respondas, sem mais perguntas?
