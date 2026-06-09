# Auditoria de segurança — Auth, lead session, RLS, IDOR, admin, créditos

*Auditoria read-only. Nenhum ficheiro alterado.*

## 1. Tabela Pass/Fail (objetivos do brief)

| # | Objetivo | Estado | Evidência |
|---|---|---|---|
| 1 | Nenhum user acede a conta/relatórios/pagamentos/créditos de outro | **PARCIAL** | `lead_session` é assinado (HMAC) mas é emitido antes da prova de email → CRIT-3 |
| 2 | Saber o email de alguém não dá acesso | **FALHA** | `X-Admin-Email` confere apenas o header contra allowlist; saber 1 email = full admin → CRIT-1 |
| 3 | Créditos grátis só após verificação de email | **PASS** | `grantInitialCredits` corre em `/claim-existing` depois de validar o JWT do OTP (`claim-existing.ts:104-108`) |
| 4 | Créditos pagos só após webhook EuPago verificado | **PASS** | HMAC validado antes do parse (`eupago-webhook.ts:88-91`, `eupago.server.ts:171-186`); idempotência por unique index |
| 5 | Admin protegido server-side | **FALHA** | Header de texto simples, sem secret/token/cookie assinado (`session.ts:48-73`) |
| 6 | RLS protege tabelas expostas | **PARCIAL** | Todas as rotas usam `supabaseAdmin` (bypass RLS); a defesa real está nos handlers — alguns vazam (MED-3) |

## 2. Riscos críticos

### CRIT-1 — Admin forjável por qualquer pessoa que conheça um email da allowlist
`src/lib/admin/session.ts:48-73`. `requireAdminSession()` lê apenas o header `X-Admin-Email` e compara com `ADMIN_ALLOWED_EMAILS`. Sem token, sem assinatura, sem cookie. Curl trivial:

```
curl -H "X-Admin-Email: <admin-conhecido>" https://app/api/admin/leads-kanban
```

Impacto: leitura total de leads, pagamentos, ledger, snapshots, PII; trigger de Apify/DataForSEO/OpenAI; reconciliação billing. Afeta ~74 rotas em `src/routes/api/admin/*`. O endpoint `whoami.ts` (MED-4) ainda funciona como oráculo para enumerar emails válidos.

### CRIT-2 — Endpoints de enriquecimento aceitam a anon key pública
`src/routes/api/public/enrich-snapshot.ts:40-43`, `enrich-comments.ts:241-244`. Aceitam `apikey: <SUPABASE_PUBLISHABLE_KEY>`, que está no bundle do browser. Qualquer visitante consegue extrair a key e disparar `sweep:true` → corridas Apify/DataForSEO/OpenAI sem rate-limit. Risco financeiro direto.

### CRIT-3 — Cookie `lead_session` emitido antes da verificação do email
`src/routes/api/onboarding/start.ts:428`. `setLeadCookie(upserted.leadId)` corre sem prova de propriedade do email; a resposta também devolve o `lead_id` em claro (linhas 452-459). Os créditos estão bem (gated em `/claim-existing`), mas a sessão de lead já dá acesso a páginas de relatório e à identidade usada por `analyze-public-v1`. Atacante consegue cookie + `lead_id` válidos só com um POST.

## 3. Riscos médios

- **MED-1 — `SameSite=None` + CORS wildcard.** `lead-cookie.server.ts:133` define `SameSite=None; Partitioned`. `start.ts:470` e `claim-existing.ts:133` respondem `Access-Control-Allow-Origin: *`. Sem CSRF token em endpoints state-changing. A combinação é desnecessariamente permissiva mesmo que hoje não exploite cookies (fetch cross-origin não envia credentials por defeito).
- **MED-2 — Sem expiração/rotação real do `lead_session`.** `MAX_AGE_SECONDS = 1 ano` (`lead-cookie.server.ts:22`); `decodeLeadCookie` só rejeita `issuedAtSec <= 0`. Cookie roubado vale 12 meses; não roda após pagamento.
- **MED-3 — Snapshots públicos por UUID sem auth.** `src/routes/api/public/analysis-snapshot.by-id.$snapshotId.ts:43-75` e `report-snapshot.by-id.$snapshotId.ts` devolvem o `normalized_payload` completo a qualquer um com o UUID. Vazamento por email/referrer expõe seguidores, engagement, insights AI, concorrentes.
- **MED-4 — `whoami` enumera allowlist.** `src/routes/api/admin/whoami.ts:26-33` aceita qualquer `X-Admin-Email` e devolve `{ allowed: true/false }`. Oráculo perfeito para encontrar o email que destrava CRIT-1.
- **MED-5 — Cron hooks aceitam anon key.** `src/lib/admin/cron-auth.server.ts:12-22` (mesmo problema que CRIT-2 mas para hooks de cleanup/cost-sync).
- **MED-6 — Sem rate-limit server-side em `/onboarding/start` e `/analyze-public-v1`.** Honeypot + 2s no cliente é trivial de iludir. Permite criar leads/relatórios em volume.

## 4. Riscos baixos

- **LOW-1** — `start.ts:151-166` regista o `handle` do Instagram no `product_events` no path de erro/bot.
- **LOW-2** — Rate-limiter in-memory em `public/lookup-lead.ts:31-57` reseta a cada deploy/cold-start.
- **LOW-3** — `admin/simple-login.ts` ecoa o email submetido no 403 (`{ ok:false, error:"NOT_ALLOWED", email }`).
- **LOW-4** — Cookie usa só `Max-Age`, sem `Expires` (compat marginal).
- **LOW-5** — `EUPAGO_WEBHOOK_SECRET` ausente faz fail-closed silencioso (`eupago.server.ts:176`); sem alarme/health-check.

## 5. Ficheiros envolvidos

**Auth + cookie:** `src/routes/api/onboarding/{start,claim-existing,check-email}.ts`, `src/lib/leads/lead-cookie.server.ts`.
**Admin:** `src/lib/admin/{session,simple-gate,fetch,cron-auth.server}.ts`, `src/routes/api/admin/{simple-login,whoami}.ts`, todas as ~74 rotas `src/routes/api/admin/*.ts`.
**Pagamentos/créditos:** `src/routes/api/public/eupago-webhook.ts`, `src/lib/payments/{eupago,entitlements}.server.ts`, `src/lib/credits/credits.server.ts`.
**Snapshots públicos:** `src/routes/api/public/{analysis-snapshot,report-snapshot}.by-id.$snapshotId.ts`.
**Enrichment com anon key:** `src/routes/api/public/{enrich-snapshot,enrich-comments}.ts`.
**CORS/público:** `src/routes/api/{analyze-public-v1,request-full-report}.ts`, `src/routes/api/public/lookup-lead.ts`, `src/integrations/supabase/client.ts`.

## 6. Plano de correção mínimo, por prioridade

### Crítico (fazer já, por esta ordem)
1. **CRIT-1** — `src/lib/admin/session.ts`: substituir a verificação por header por cookie HMAC-assinado emitido no `simple-login` com TTL curto (≤8 h). No mínimo, exigir um `ADMIN_SESSION_SECRET` partilhado junto com o email para que conhecer o email não chegue.
2. **CRIT-2** — `src/routes/api/public/{enrich-snapshot,enrich-comments}.ts`: remover o branch `validApikey` (Supabase anon). Aceitar apenas `Bearer INTERNAL_API_TOKEN`.
3. **CRIT-3** — `src/routes/api/onboarding/start.ts:428`: não chamar `setLeadCookie` nem devolver `lead_id` antes do OTP. Emitir cookie só em `/claim-existing` depois do JWT validar `email_confirmed_at`.

### Médio
4. **MED-1** — `lead-cookie.server.ts`: `SameSite=Lax` em produção (manter `None` só em preview Lovable via flag); restringir `Access-Control-Allow-Origin` em `start.ts` e `claim-existing.ts` à allowlist de origens conhecidas.
5. **MED-2** — `lead-cookie.server.ts`: enforce max-age efetivo em `decodeLeadCookie` (rejeitar > 90 dias); rodar valor do cookie após pagamento confirmado.
6. **MED-3** — `analysis-snapshot.by-id.*.ts` + `report-snapshot.by-id.*.ts`: exigir `lead_session` válido (user-facing) ou `INTERNAL_API_TOKEN` (PDF renderer). Cortar acesso anónimo ao payload bruto.
7. **MED-4** — `admin/whoami.ts`: remover endpoint ou exigir token pré-partilhado.
8. **MED-5** — `cron-auth.server.ts`: remover branch da anon key; aceitar só `INTERNAL_API_TOKEN`.
9. **MED-6** — `onboarding/start.ts` + `analyze-public-v1.ts`: rate-limit por IP server-side (KV/Redis/Supabase RPC com `pg_cron`); 10 req/min onboarding, 5 req/min análise.

### Baixo
10. **LOW-1** — não logar `handle` raw em erros do `start.ts` (ou hash).
11. **LOW-2** — `lookup-lead.ts`: rate-limit persistente.
12. **LOW-3** — `admin/simple-login.ts`: tirar `email` do 403.
13. **LOW-5** — `eupago.server.ts`: health-check no boot a confirmar que `EUPAGO_WEBHOOK_SECRET` está definido; expor no `sistema.secrets`.

## Recomendação

**CRIT-1 é a porta mais larga.** Resolver os três críticos numa única ronda fecha 95% do risco real (account takeover do admin, fraude financeira via enrichment, hijack de sessão de lead). Os médios são defesa em profundidade — válidos mas não bloqueantes.

Diz se queres que avance com os três críticos primeiro (uma PR cirúrgica por cada), ou se preferes uma ronda única que feche críticos + médios.
