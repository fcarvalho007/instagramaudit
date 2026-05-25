## Anular subscrição & preferências de comunicação (MVP beta)

Adicionar um caminho seguro, GDPR-friendly, para os utilizadores anularem a subscrição de comunicações de marketing, sem tocar em emails transacionais nem alterar histórico de consentimento.

### O que já existe (não mexer)
- `leads.marketing_consent` + `marketing_consent_at` (já no schema).
- `app.account.tsx` com `updateMarketingConsent` (toggle do utilizador autenticado) — funcional.
- `product_events` + `recordProductEvent` (para registar `lead_unsubscribed`).
- Templates de email em `src/lib/email/templates/*` e wrapper `wrapHtml` em `src/lib/email/shared.ts`.

### Lacunas a fechar
1. Sem token assinado para anular sem login.
2. Sem rota pública `/unsubscribe`.
3. Sem footer "anular subscrição" nos emails de marketing.
4. UI de conta não tem CTA "anular subscrição" nem hint sobre o token.

---

## Implementação

### 1. Token assinado (HMAC SHA-256)

Novo módulo `src/lib/email/unsubscribe-token.server.ts`:
- `signUnsubscribeToken(leadId: string): string` → `base64url(payload).base64url(signature)` onde `payload = { leadId, iat }` JSON, `signature = HMAC-SHA256(UNSUBSCRIBE_TOKEN_SECRET, payload)`.
- `verifyUnsubscribeToken(token: string): { leadId: string } | null` — verifica assinatura (timing-safe), valida formato e idade (rejeita `iat` > 365 dias). Sem expiração curta: links em emails antigos têm de continuar a funcionar.
- Segredo: novo secret `UNSUBSCRIBE_TOKEN_SECRET` (adicionar via `add_secret`). Falha rápida se ausente.

Novo helper em `src/lib/email/url.ts`:
- `buildUnsubscribeUrl(leadId: string): string` → `${baseUrl}/unsubscribe?token=…`.

Testes unitários `src/lib/email/__tests__/unsubscribe-token.test.ts`:
- token válido roundtrip
- assinatura adulterada → `null`
- payload adulterado → `null`
- token mal-formado → `null`
- token muito antigo → `null`

### 2. Server function de unsubscribe

Novo `src/server/unsubscribe.functions.ts`:
- `unsubscribeWithToken({ token })` (sem auth, método `POST`):
  - `verifyUnsubscribeToken` → 200 com `{ ok: false, reason: "invalid_token" }` se inválido (não revelar nada).
  - Lookup lead via `supabaseAdmin`. Se não existe → `{ ok: false, reason: "lead_not_found" }`.
  - Se já está `marketing_consent=false` → `{ ok: true, alreadyOptedOut: true, email }` (idempotente, ainda regista evento `lead_unsubscribed_idempotent`).
  - Senão: `UPDATE leads SET marketing_consent=false, marketing_consent_at=now()` e `recordProductEvent("lead_unsubscribed", { leadId, source: "email_link" })`.
  - Devolve `{ ok: true, email }` (mascarado: `f***@example.com`).
- Não apaga o lead. Não toca em `beta_consent` ou outros campos.

### 3. Página pública `/unsubscribe`

Novo route `src/routes/unsubscribe.tsx` (público, fora de `_authenticated`):
- Lê `token` de `useSearch` (validado com zod inline).
- `loader` chama `unsubscribeWithToken({ data: { token } })` (server fn é segura para SSR/prerender pois não usa `requireSupabaseAuth`).
- Componente mostra um dos estados:
  - **Sucesso**: "Subscrição anulada · Já não vais receber emails de marketing nesta conta. Os emails operacionais (entrega de relatórios) continuam." + email mascarado + CTA para `/app/account` (se logado) ou homepage.
  - **Já anulado**: variante "já estavas fora da lista".
  - **Token inválido/expirado**: copy neutro "Não foi possível processar este pedido. Atualiza as tuas preferências em /app/account." sem expor detalhes.
- `noindex, nofollow`.

i18n: nova namespace `src/i18n/locales/{pt,en}/unsubscribe.json` (cabeçalho, descrições para cada estado, CTAs). Registar em `src/i18n/index.ts`.

### 4. Footer "Anular subscrição" nos emails de marketing

Extender `WrapHtmlInput` em `shared.ts` com `unsubscribeUrl?: string`. Quando presente, render adicional no bloco footer:
```
Se já não queres receber estes emails, anula a subscrição.
```
(link `unsubscribeUrl`). Texto equivalente no `joinLines` plain-text dos templates.

Templates marketing (acrescentar `unsubscribeUrl` opcional ao input + passar ao `wrapHtml` + linha no texto):
- `welcome-beta.ts`
- `report-summary.ts`
- `feedback-request.ts`
- `commercial-followup.ts`

Templates **transacionais** (NÃO alterar — pedido explícito):
- `report-ready.ts` (entrega do relatório)
- `personal-area-saved.ts` (notificação técnica)
- `request-received.ts` (confirmação de pedido)

Senders/call-sites que renderizam templates marketing precisam de construir o URL via `buildUnsubscribeUrl(leadId)` e passar:
- `src/lib/email/send-welcome-beta.server.ts`
- `src/lib/email/send-report-summary.server.ts`
- `src/lib/email/lead-magnet-sequence.server.ts` (sequência de marketing)
- `src/routes/api/admin/send-feedback-request.ts`
- `src/routes/api/admin/send-commercial-followup.ts`
- `src/lib/admin/email-template-registry.ts` (previews admin — usar placeholder `https://exemplo/unsubscribe?token=preview`)
- `src/components/admin/v2/beta-leads/{lead-detail-sheet.tsx,commercial-followup-dialog.tsx}` (preview locais — placeholder igual)

### 5. UI de conta (`/app/account`)

Refinos mínimos na secção de comunicações já existente:
- Continuar com o toggle de marketing.
- Adicionar parágrafo de ajuda em PT/EN: "Também podes anular subscrição a partir de qualquer email de marketing que recebeste."
- Sem alteração ao server fn — `updateMarketingConsent` já regista evento `marketing_consent_updated`. Garantir que, quando passa a `false`, é registado `lead_unsubscribed` (acrescentar segunda chamada em paralelo) para alinhamento com o evento do fluxo de token.

### 6. Testes

- `src/lib/email/__tests__/unsubscribe-token.test.ts` (sign/verify, casos negativos).
- `src/server/__tests__/unsubscribe.functions.test.ts`:
  - token inválido → `{ ok: false, reason: "invalid_token" }`, sem update.
  - token válido + lead opted-in → consent desce, evento `lead_unsubscribed` registado.
  - token válido + lead já opted-out → `alreadyOptedOut: true`, sem segunda escrita.
  - Mocks dos clientes Supabase admin e `recordProductEvent`.
- Atualizar `lead-magnet-sequence.test.ts` e `welcome-beta`/`report-summary` snapshots (se existirem) para incluir o novo bloco unsubscribe quando o URL é fornecido, e confirmar que está ausente quando não é.

### 7. Validação final

```text
bunx tsc --noEmit
bunx vitest run
```

Smoke manual:
- Abrir `/unsubscribe?token=<inválido>` → confirmação neutra.
- Gerar token válido em script de teste → abrir URL → DB mostra `marketing_consent=false`, `product_events` contém `lead_unsubscribed`.
- Inspecionar render de `renderWelcomeBeta` com e sem `unsubscribeUrl`.

---

## Notas técnicas

- **Secret novo**: `UNSUBSCRIBE_TOKEN_SECRET` (≥32 bytes random). Pedir via `add_secret` no início do build mode.
- **Segurança**: server fn aceita token via body, não via query (evita logs com token). A rota lê `?token=` mas chama a server fn por POST internamente.
- **Sem migração de schema** — colunas já existem.
- **Sem Brevo**: marcamos `marketing_consent=false` na BD; o sync existente já replica o atributo `MARKETING_CONSENT` no próximo evento qualificado. Não tocamos em `src/lib/brevo/sync.server.ts`.
- **i18n**: copy PT-PT (Acordo 1990) e EN. Sem "você", impessoal/"tu".
- **GDPR**: nenhum apagamento de leads; histórico `marketing_consent_at` mantém-se (último update sobrescreve, mas o evento em `product_events` preserva trilha de auditoria).
- **Loader pública vs auth**: server fn de unsubscribe NÃO usa `requireSupabaseAuth`, logo é seguro chamar no loader da rota pública (sem prerender 401).

---

## Checklist final

- ☐ Secret `UNSUBSCRIBE_TOKEN_SECRET` adicionada
- ☐ `unsubscribe-token.server.ts` + testes
- ☐ `buildUnsubscribeUrl` em `email/url.ts`
- ☐ `unsubscribe.functions.ts` + testes
- ☐ Rota pública `/unsubscribe` com 3 estados + i18n PT/EN
- ☐ `wrapHtml` aceita `unsubscribeUrl`; templates marketing atualizados
- ☐ Senders/admin previews passam `unsubscribeUrl`
- ☐ Conta: hint + `updateMarketingConsent(false)` regista também `lead_unsubscribed`
- ☐ `bunx tsc --noEmit` e `bunx vitest run` passam