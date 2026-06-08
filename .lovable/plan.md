# Auditoria GTM — Paid Report (`report_full_9` · 9€ · EuPago)

## TL;DR
**Verdict: GO BETA.** A arquitetura do fluxo pago está sólida — produto server-authoritative (900 cêntimos), checkout server-fn, webhook EuPago fail-closed com HMAC + idempotência, entitlement com unique index, créditos pós-compra (1+2=3) com dedup aplicacional. **2 gaps operacionais bloqueiam launch público mas não beta:** (a) email de confirmação está em kill-switch `OFF` por defeito, (b) falha de DB durante o webhook é engolida (200 ok devolvido sem retry). Sem teste real de ponta-a-ponta, **3 itens ficam não-provados** (assinatura webhook real, redirect EuPago, entrega de email).

---

## 1. O que já está provado (sem pagamento real)

| # | Item | Status | Evidência |
|---|---|---|---|
| 1 | Pricing & product code | ✅ PASS | `products.ts:36-42` (`priceLabel:"9€"`) ↔ `products.server.ts:27-32` (`amountCents:900`). Cliente não pode override. |
| 2 | Checkout flow | ✅ PASS | Sticky bar → `PremiumInterestDialog` → `/checkout/report-full` → `createEupagoCheckout` server fn → `window.location.assign(checkout_url)` |
| 3 | EuPago Pay By Link creation | ✅ PASS | `eupago.server.ts:77-165` POST a `/api/v1.02/paybylink/create` com `Authorization: ApiKey`; `webhookUrl` hardcoded a `/api/public/eupago-webhook` |
| 4 | `lead_payments` pending | ✅ PASS | `eupago.functions.ts:221-256` insert `status="pending"` antes do redirect; on provider error → `status="failed"` (sem ghost rows) |
| 5 | Webhook signature + idempotência | ✅ PASS | HMAC-SHA256 timing-safe (`eupago.server.ts:171-186`); fail-closed se `EUPAGO_WEBHOOK_SECRET` ausente; early-return se já `paid` |
| 6 | Entitlement `report_full_9` | ✅ PASS estrutural | `entitlements.server.ts:16-37` insert com unique `(lead_id, product_code)` → `23505` silent no-op |
| 7 | Créditos +1 incluído + 2 beta = 3 | ✅ PASS | `credits.server.ts:25-30` constantes; dedup aplicacional por `(lead_id, kind, payment_id)` em `139-176` e `186-222` |
| 8 | `premiumUnlocked` | ✅ PASS funcional | `getMyReportEntitlement` em `entitlements.functions.ts:8-25`; mount-once em `analyze.$username.tsx:408-421` |
| 9 | Janela 30d/90d gated | ✅ PASS | `analyze-public-v1.ts:587-603` — `WINDOW_REQUIRES_PRO` antes de reservar crédito |
| 10 | Email payment_confirmed (estrutura) | 🟡 PARTIAL | Template + idempotência por `payment_confirmation_email_sent` existem; **kill-switch `PAYMENT_CONFIRMATION_EMAIL_ENABLED` default OFF** (`send-payment-confirmed.server.ts:49-55`) |
| 11 | Admin visibility | ✅ PASS | `/api/admin/payments-overview` agrega `by_product_status`, `pending_stale`, `recent_paid/failed`, `entitlements_by_product`; per-lead em `lead-credit-activity.$id` |

## 2. O que ainda exige pagamento real para validar

1. **Assinatura EuPago real bate com `verifyWebhookSignature`** — só está provado em código, nunca contra payload real da EuPago.
2. **`successUrl`/`failUrl`/`backUrl` da EuPago** — todos apontam para `?status=success`. Comportamento real do cancel/fail não confirmado (provável bug cosmético: utilizador cancela e vê painel de sucesso, mas entitlement não é concedido — funcional, mas confuso).
3. **Email `payment_confirmed`** — entrega real, render correto, deliverability via Lovable Emails.
4. **`premiumUnlocked` race ao voltar do EuPago** — webhook pode chegar depois do utilizador voltar; teoria diz que `analyze.$username` re-monta e re-chama `getMyReportEntitlement`, mas timing real desconhecido.
5. **Latência webhook → entitlement → primeira chamada wide-window** — UX real após pagar.
6. **`EUPAGO_*` envs efectivos em produção** — `requireEnv()` lança hard se ausente, mas valores corretos só se vê em runtime.

## 3. Plano de teste E2E (pagamento real, 9€)

**Pré-flight (sem custo):**
1. Confirmar em produção: `EUPAGO_BASE_URL`, `EUPAGO_API_KEY`, `EUPAGO_WEBHOOK_SECRET`, `APP_BASE_URL`, `PAYMENT_CONFIRMATION_EMAIL_ENABLED=true`, `APIFY_ENABLED=true`, `APIFY_TESTING_MODE=false`.
2. `psql` snapshot de `lead_payments`, `lead_entitlements`, `credit_ledger`, `product_events` (timestamp T0) para um lead de teste recém-criado.
3. Confirmar URL pública responde: `GET https://auditprofiles.com/api/public/eupago-webhook` → método não permitido (mas alcançável).

**Execução (com pagamento real):**
4. Browser limpo → onboarding → /analyze/<handle teste> → consumir 1 análise free → clicar sticky unlock.
5. Checkout report-full wizard → submeter → capturar `lead_payments.id` (T1) e verificar `status="pending"`, `provider_checkout_url` preenchido.
6. Pagar 9€ na EuPago (cartão MB WAY/CC) → verificar redirect aterra em `/checkout/report-full?status=success`.
7. **Imediatamente** verificar via `psql`:
   - `lead_payments.status="paid"`, `paid_at` preenchido
   - `lead_entitlements` tem linha `(lead_id, "report_full_9")`
   - `credit_ledger` tem +1 (`purchase_included`) e +2 (`post_purchase_beta_bonus`) com `metadata.payment_id` ↔ T1
   - `product_events` tem `payment_confirmation_email_sent`
   - `email_send_log` tem linha `template_name="payment_confirmed"`, `status="sent"`
8. Voltar a `/analyze/<handle>` → confirmar `premiumUnlocked=true` ao primeiro mount (sem refresh manual). Se precisar refresh → registar como UX gap.
9. Mudar window selector para `30d` → confirmar sem `WINDOW_REQUIRES_PRO` e relatório re-corre.
10. Trocar para `90d` → confirmar idem.
11. Verificar inbox do email de teste — render, copy PT, links válidos.
12. Re-disparar webhook manualmente com mesmo payload (curl com signature válida) → confirmar 200 sem duplicar entitlement/créditos/email.
13. /admin → confirmar payment aparece em `recent_paid`, entitlement em `entitlements_by_product`, lead drawer mostra créditos +3.

**Pós-teste:**
14. Marcar lead de teste com tag para excluir de métricas.
15. Documentar tempo real entre `paid_at` e `premiumUnlocked=true` visível.

## 4. Riscos antes de launch

| # | Risco | Severidade | Mitigação antes do GO público |
|---|---|---|---|
| R1 | `PAYMENT_CONFIRMATION_EMAIL_ENABLED=false` por defeito → cliente paga e não recebe email | 🚨 BLOCKER público | Set `=true` em produção antes de abrir |
| R2 | Webhook engole erros de DB (`grantEntitlement`/`grantCredits` falham → 200 ok devolvido → EuPago não retry) | 🚨 BLOCKER público | Em beta: monitorizar `console.error` no edge-function-logs; pós-beta adicionar dead-letter ou re-throw para forçar retry EuPago |
| R3 | `successUrl == failUrl == backUrl` → utilizador que cancela vê painel "sucesso" | ⚠️ UX | Em beta aceitável (entitlement não concede). Pós-beta: separar URLs ou ler query EuPago |
| R4 | Race grant créditos sem unique index DB (apenas select-before-insert) | ⚠️ Baixo | EuPago entrega 1x na prática; adicionar unique index `(lead_id, kind, (metadata->>'payment_id'))` pós-beta |
| R5 | `premiumUnlocked` sem polling — se webhook atrasar, primeiro mount vê free | ⚠️ UX | Pós-beta: 3x polling de 2s no return da checkout page |
| R6 | Admin não tem visão bulk do `credit_ledger`, só per-lead | ⚠️ Suporte | Aceitável beta |
| R7 | Apify envs (`APIFY_ENABLED`, `APIFY_TESTING_MODE`) ainda partilham o mesmo bloqueio identificado no audit anterior do Free | 🚨 BLOCKER | Resolver em conjunto |

## 5. Verdict

**🟢 GO BETA** (privado, leads convidados, ≤20 pagamentos reais monitorizados manualmente).

**🟡 GO PÚBLICO condicional** após:
1. Set `PAYMENT_CONFIRMATION_EMAIL_ENABLED=true` em produção.
2. Resolver R7 (envs Apify) — herdado do audit Free.
3. Executar plano E2E (secção 3) com sucesso completo.
4. Decidir mitigação para R2 (mínimo: alerta em logs quando entitlement/credit grant falha após paid).
5. Separar `failUrl` de `successUrl` (R3) — pode ser hotfix nas 48h pós-launch.

**🔴 NO-GO** se algum dos passos 5-8 do teste E2E falhar.
