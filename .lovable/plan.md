# AuditProfiles — GTM Readiness MVP (Executive Audit)

## Executive verdict

🟡 **GO BETA privado já. GO PUBLIC condicional a 3 blockers P0.**

A arquitetura está coerente: free flow está sólido, paid flow está mecanicamente correto end-to-end (checkout → EuPago → webhook → entitlement → credits → unlock), e-mails têm idempotência e copy alinhada com pricing, admin tem visibilidade real (cost/credit/event linkage). Os blockers públicos são pequenos em LOC mas grandes em risco reputacional: **email de pagamento desligado por default**, **comparação de competidores sem gate de entitlement validado em produção**, e **status de publish/DNS por confirmar com o utilizador**.

**Launch readiness score: 78/100**
- Core flows: 90 (free 95, paid mecânica 90, comparison 75)
- Infra/cost: 85
- UX clareza: 75
- Comms (email): 70 (matar P0 sobe para 90)
- Legal/comercial: 65 (texto público a auditar)
- Publish state: 60 (a confirmar com utilizador)

---

## Matriz por área (A–M)

| # | Área | Verdict | Notas-chave |
|---|---|---|---|
| A | Landing / oferta | 🟡 GO BETA | Falta auditar termos comerciais (preço, garantia, refund) e CTA único above-the-fold; OG tags presentes nas rotas-folha |
| B | Onboarding | 🟢 GO | Onboarding-first, lead criado, initial grant +2 idempotente; gera report sem fricção |
| C | Free report | 🟢 GO | 7d window, cache + reserve/confirm/release atómicos, fallbacks editoriais robustos |
| D | Paid individual report (`report_full_9`) | 🟡 GO BETA → GO PUBLIC após F1 | Mecânica completa: checkout → EuPago Pay-By-Link → webhook idempotente (por `payment_id`) → entitlement `report_full_9` → 1 incluído + 2 bónus beta → unlock. **F1: email `payment_confirmed` desligado por default** (`PAYMENT_CONFIRMATION_EMAIL_ENABLED` ausente do env) |
| E | 30d/90d Pro windows | 🟢 GO | Gate `hasEntitlement('report_full_9')` em `analyze-public-v1.ts:591`; `WINDOW_REQUIRES_PRO` retorna 403 antes de reservar crédito — zero leak |
| F | Competitor comparison | 🟡 GO BETA → GO PUBLIC após F2+F3+F4 | F2: gate de entitlement no add-competitor a confirmar em produção. F3: missing-side replacement honesto (não zeros). F4: avatar/thumbnail re-hosting persistente |
| G | Checkout / EuPago | 🟢 GO | `lead_payment pending` → `paid` idempotente por `payment_id`; webhook valida assinatura HMAC; URLs estáveis `*.lovable.app` |
| H | Credits / entitlements | 🟢 GO | Append-only `credit_ledger`, balance via RPC, unique partial indexes evitam double-grant; **linkage `analysis_event_id` completo** (PR anterior); admin drawer expõe |
| I | Emails / automations | 🟡 GO BETA → GO PUBLIC após F1 | 9 templates auditados, legacy desativados, copy 9€/97€ sincronizada; `report_saved` é entrega primária com risco P1 de race condition (sem unique partial index) |
| J | Admin / suporte | 🟢 GO | Lead detail sheet, credit activity com `analysis_event_id`, cost source-of-truth via `provider_call_logs`, kanban, knowledge base |
| K | Provider costs / Apify | 🟢 GO | Kill-switch `APIFY_ENABLED`, `APIFY_ALLOWLIST`, daily/hard caps em USD, custos estimados por run, alertas em `usage_alerts` |
| L | Mobile responsiveness | 🟡 GO BETA | Design system tokenizado, mas não há evidência de QA mobile end-to-end nos flows críticos (checkout, unlock, comparison) |
| M | Production deployment / publish | ❓ A confirmar com utilizador | Custom domains `auditprofiles.com` configurados; status atual de `Update` do publish e DNS dos emails não verificado nesta sessão |

---

## Blockers antes do public launch (P0)

| # | Blocker | Onde | Fix |
|---|---|---|---|
| **F1** | `PAYMENT_CONFIRMATION_EMAIL_ENABLED` ausente → cliente paga e não recebe recibo | `src/lib/email/send-payment-confirmed.server.ts:51` + secrets | Setar `PAYMENT_CONFIRMATION_EMAIL_ENABLED=true` em production secrets |
| **F2** | Gate de entitlement em "add competitor" não validado contra utilizador free em produção | `add-competitor` flow no `analyze-public-v1` | Reproduzir manualmente como free user e confirmar 403/upsell, ou adicionar teste e2e |
| **F3** | Estados "missing data" do competitor podem mostrar zeros enganosos | competitor cards no relatório | Substituir por placeholders honestos ("dados indisponíveis") + chip de cobertura |
| **F4** | Avatares/thumbnails de competidor servidos do CDN do Instagram expiram em ~horas | competitor render | Re-hospedar em bucket `post-thumbnails` (já existe) no momento do snapshot |

---

## Beta-safe limitations (aceitáveis em GO BETA privado)

- Email `payment_confirmed` OFF: aceitável enquanto cada cliente beta é contactado manualmente.
- Competitor com cobertura parcial: aceitável se UI for honesta sobre o que falta.
- CDN-expiry de imagens: aceitável em janela curta (<48h) de uso beta.
- Sem QA mobile sistemático: aceitável se beta usa desktop maioritariamente.
- Sem A/B test de copy/landing: aceitável pré-PMF.

---

## Must-fix list (antes de público)

1. **Ativar `PAYMENT_CONFIRMATION_EMAIL_ENABLED=true`** em production secrets (F1).
2. **Validar gate de entitlement** no add-competitor flow com user free real (F2).
3. **Re-hospedar imagens de competidor** no snapshot (F4).
4. **Substituir zeros enganosos** por placeholders honestos nos cards de competitor (F3).
5. **Confirmar publish status**: o site `auditprofiles.com` serve o último frontend? DNS dos emails verificado?
6. **Validar URL de webhook EuPago** em production aponta para `*.lovable.app` (e não para preview).

## Should-fix list (semanas 1–2 pós-launch)

7. **Unique partial index** em `product_events` para `report_saved_email_sent` (elimina race de email duplicado P1).
8. **Guard no Email Lab admin**: avisar se `report_saved` já foi enviado antes de fallback manual.
9. **QA mobile sistemático** dos flows: checkout → webhook → unlock → first paid report → competitor.
10. **Auditoria legal/copy**: termos de uso, política de privacidade, garantia/refund visíveis e consistentes com pricing.
11. **Logging estruturado** dos blocked-by-entitlement events para detectar tentativas de abuse.

## Post-MVP backlog

- Backfill histórico de `credit_ledger.analysis_event_id` (job manual controlado).
- Subscription/recurring billing (modelo de dados já preparado).
- Multi-network expansion (TikTok, LinkedIn, YouTube via Apify).
- Coupon system end-to-end testado (tabela `payment_coupons` existe, fluxo não exercitado).
- Analytics dashboard público (engagement por tier/format vindo de `knowledge_benchmarks`).
- Drip campaign comercial pós-free-report (HOJE não existe; requer marketing email service externo).

---

## Recommended launch sequence

1. **Semana -1 (hoje + dias)**:
   - Confirmar publish status e DNS de email com utilizador.
   - Setar `PAYMENT_CONFIRMATION_EMAIL_ENABLED=true`.
   - Validar webhook URL em EuPago dashboard.
   - QA manual: 1 compra real `report_full_9` end-to-end em produção (admin como cliente).

2. **Semana 0 — GO BETA privado (10–30 utilizadores)**:
   - Convite por email pessoal a 10 leads existentes.
   - Monitorizar `email_send_log`, `lead_payments`, `credit_ledger` diariamente.
   - Recolher feedback via `beta_feedback` e `inline_report_feedback`.

3. **Semana 1–2**: fechar F2, F3, F4 com dados reais do beta; aplicar Should-fix #7 e #8.

4. **Semana 3 — GO PUBLIC soft**: abrir landing sem campanha paga; manter monitoring elevado.

5. **Semana 4+**: campanha de aquisição se P0 e P1 estão verdes e cost-per-report está dentro do envelope esperado.

---

## Riscos residuais

- **Reputação de marca** se o email de pagamento falhar uma única vez em público (F1).
- **Custo descontrolado** se gates de entitlement falharem em competitor (F2) → Apify call sem crédito reservado.
- **Confiança no produto** se imagens de competidor partirem 24h após emissão do relatório pago (F4).
- **Suporte sobrecarregado** se duplicate emails escaparem (P1 race) → mitigar com index único.

---

## Como continuar

Se aprovas este audit, posso (em build mode separado) preparar:
- **PR mínimo P0**: index único de `product_events` + guard admin (cobre P1 #7 e #8).
- **Checklist de QA manual** dos 4 P0 para correres antes do GO PUBLIC.
- **Runbook de incident response** para falha de webhook/email/credit.

Diz qual destes queres primeiro.
