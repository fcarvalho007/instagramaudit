# Auditoria GTM — Email Lifecycle & Cadência

## TL;DR
**Verdict: 🟢 GO BETA · 🟡 GO PUBLIC pago condicional.** O lifecycle de email está hoje significativamente mais limpo do que estava: `report_saved` é o único auto-trigger pós-unlock, `welcome_beta` e `report_summary` estão marcados legacy e **sem callers**, `report_ready` é admin-only manual, e `payment_confirmed` está protegido por kill-switch + idempotência por `payment_id`. **Pricing copy está limpo** — nenhum template menciona 7€ ou 28€ pack; o único template com valor monetário é `payment_confirmed` e usa `amountLabel` derivado de `PUBLIC_PRODUCTS` (`9€` / `97€`). **Não existem duplicados automáticos** dentro de segundos.

**Único bloqueador para launch público pago:** `PAYMENT_CONFIRMATION_EMAIL_ENABLED` continua **default OFF** (`send-payment-confirmed.server.ts:51`), pelo que pagamentos reais não geram confirmação por email enquanto a flag não for explicitamente ligada.

---

## 1. Inventário de templates

| # | Key | Subject (resumido) | Lifecycle role | Modo | Trigger | Kill-switch | Dedup/Idempotência |
|---|---|---|---|---|---|---|---|
| 1 | `request_received` | "Recebemos o teu pedido" | Captação · transactional | Auto | `src/lib/beta.functions.ts` (submissão pedido beta) | — | `beta_request_received_email_sent` |
| 2 | `report_ready` | "O teu relatório está disponível" | Entrega · **manual fallback** | Manual | Admin · `/api/admin/send-report-link.ts` (signed URL) | — | nenhum (admin-only) |
| 3 | `feedback_request` | "O teu relatório foi útil?" | Retenção · **manual** | Manual | Admin · `/api/admin/send-feedback-request.ts` | — | ✅ `product_events.feedback_request_email_sent` filtrando `lead_id + report_request_id` (lookup `send-feedback-request.ts:44-66`) |
| 4 | `personal_area_saved` | "O relatório foi guardado na tua área pessoal" | **Planeado** · sem trigger | Disabled | Nenhum endpoint o chama | — | n/a |
| 5 | `welcome_beta` | "Bem-vindo à beta — o que esperar daqui" | **Legacy · desactivado** | Disabled | Nenhum caller (`rg sendWelcomeBeta` → só a definição) | — | (legacy event `beta_welcome_email_sent` ainda honrado pela dedup do `report_saved`) |
| 6 | `report_summary` | "Resumo do relatório @{handle}" | **Legacy · desactivado** | Disabled | Nenhum caller (`rg sendReportSummary` → só a definição) | — | (legacy event `report_summary_email_sent` ainda honrado pela dedup do `report_saved`) |
| 7 | `commercial_followup` | "Continuação…" (dinâmico por handle) | Conversão · **manual** | Manual | Admin · `/api/admin/send-commercial-followup.ts` | — | nenhum (admin-only) |
| 8 | `payment_confirmed` | "Pagamento confirmado — relatório completo desbloqueado" | Pagamento · transactional | Auto fire-and-forget | EuPago webhook branch `paid` (`eupago-webhook.ts:282-300`) | 🚨 **`PAYMENT_CONFIRMATION_EMAIL_ENABLED` default OFF** (`send-payment-confirmed.server.ts:51`) | ✅ `product_events.payment_confirmation_email_sent` por `payment_id` |
| 9 | `report_saved` | dinâmico ("Guardámos o teu relatório de @handle") | **Entrega · email principal** | Auto | `lead-magnet-sequence.server.ts` após unlock | `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED` (default **ON**) | ✅ dedup por `(lead_id, report_request_id)` honrando 3 eventos: `report_saved_email_sent` + legacy `beta_welcome_email_sent` + legacy `report_summary_email_sent` (`lead-magnet-sequence.server.ts:70-72`) |

## 2. Cadência automática (diagrama)

```text
[lead submete pedido beta]
        │
        ├──> (auto, imediato) request_received        [#1]
        │
        ▼
[admin processa / unlock acontece]
        │
        ├──> (auto, imediato) report_saved            [#9]    ← ÚNICO email pós-unlock
        │       └─ dedup: lead_id+report_request_id (honra legacy)
        │
        │   [welcome_beta + report_summary]: REMOVIDOS do auto-flow
        │
        ▼
[admin opcional — sem auto]
        ├──> report_ready          (manual, signed URL)        [#2]
        ├──> feedback_request      (manual, com dedup)         [#3]
        └──> commercial_followup   (manual, sem auto-trigger)  [#7]

[EuPago webhook: status=paid]
        │
        └──> (auto fire-and-forget) payment_confirmed          [#8]
                ├─ guard: payment.status === "paid" && paid_at
                ├─ kill-switch: PAYMENT_CONFIRMATION_EMAIL_ENABLED (🚨 OFF)
                └─ dedup: payment_id
```

## 3. Risco de duplicados

| Cenário | Pode duplicar? | Evidência |
|---|---|---|
| Mesmo unlock dispara 2x `report_saved` | 🟡 **Race teórica** | Dedup é lookup-then-insert sem unique index em `product_events`. Em unlocks concorrentes pelo mesmo `report_request_id` os dois podem passar a verificação. `email-template-registry.ts:633` lista este risco. |
| `report_saved` + `welcome_beta` no mesmo unlock | ✅ Impossível | `welcome_beta` sem caller; dedup do `report_saved` também honra o evento legacy. |
| `report_saved` + `report_summary` no mesmo unlock | ✅ Impossível | Igual ao anterior. |
| `payment_confirmed` 2x no mesmo pagamento | ✅ Impossível | Dedup por `payment_id` + guarda `status === "paid"` no webhook. |
| `payment_confirmed` em pagamento pendente | ✅ Impossível | Webhook só entra no branch após `row.status === "paid" && row.paid_at` (`eupago-webhook.ts:151`). |
| `feedback_request` 2x | ✅ Bloqueado | Dedup `lead_id+report_request_id`. |
| Beta form + public unlock geram 2 emails | ✅ Não duplica | `request_received` é confirmação inicial; `report_saved` só dispara no unlock. Conteúdos distintos. |
| Admin envia `report_ready` depois do `report_saved` automático | ⚠️ **Pode soar duplicado ao utilizador** | Não há guarda. `report_ready` é manual e fica à descrição do admin. |
| Admin envia `commercial_followup` depois do `report_saved` | ⚠️ Idem | Sem guarda; manual. Aceitável: são lifecycle stages distintos. |

## 4. Pricing copy — mismatches

| Template | 7€ | 28€ pack | 9€ correto | 97€ correto | "1 incluído + 2 bónus" |
|---|---|---|---|---|---|
| `payment_confirmed` | ✅ ausente | ✅ ausente | ✅ via `amountLabel` (sample `9,00 €`) | ✅ via `PUBLIC_PRODUCTS["authority_diagnosis_97"].priceLabel = "97€"` | ✅ presente no template (`payment-confirmed.ts:132,171`) e sender alimenta `creditsGranted = { included: 1, bonus: 2 }` só para `report_full_9` (`send-payment-confirmed.server.ts:225-231`) |
| `commercial_followup` | ✅ ausente | ✅ ausente | n/a (sem preço hard-coded) | n/a | n/a |
| `report_saved` | ✅ ausente | ✅ ausente | n/a | n/a | n/a |
| Outros | ✅ ausente | ✅ ausente | n/a | n/a | n/a |

🟢 **Pricing copy limpo em todo o lifecycle.** Não há menções residuais a 7€ ou 28€ pack. O Authority Diagnosis (97€) **não tem template próprio de confirmação** — usa o mesmo `payment_confirmed` com `productName` dinâmico, sem créditos (correto: a flag `creditsGranted` é `null` para produtos != `report_full_9`).

## 5. Verificação ponto-a-ponto do pedido

| # | Verificação | Resultado |
|---|---|---|
| 3 | Legacy emails escondidos/colapsados por defeito | ✅ `email-lab-page.tsx:128` `showLegacy=false` por defeito; chip "Legado" filtra explicitamente. Registry classifica `welcome_beta` e `report_summary` com `lifecycleStage:"legado"` + badge `"desactivado"`. |
| 4 | `report_saved` é o email principal de entrega | ✅ Único auto-trigger pós-unlock no `lead-magnet-sequence`. |
| 5 | `welcome_beta` e `report_summary` já não são automáticos | ✅ Confirmado — `rg sendWelcomeBeta`/`sendReportSummary` retorna só as definições, **zero callers**. |
| 6 | `report_ready` é claramente manual/signed URL | ✅ Apenas chamado por `/api/admin/send-report-link.ts`. Marcado `lifecycleRole: "manual_fallback"`. |
| 7 | `payment_confirmed` kill-switch / copy / créditos / não-pending | 🟡 Kill-switch existe mas **default OFF** (BLOQUEADOR público). Copy correto (`amountLabel` dinâmico). Créditos 1+2 só para `report_full_9`. Só dispara no branch `paid`. |
| 8 | `commercial_followup` pricing actualizado | ✅ Sem preços hard-coded — narrativa neutra que usa `checkoutUrl` opcional. |
| 9 | `feedback_request` tem dedup | ✅ `alreadySentForRequest()` em `lead_id+report_request_id`. |
| 10 | Dois emails dentro de segundos para o mesmo report | ✅ Não — `report_saved` é o único auto pós-unlock. `payment_confirmed` está noutro lifecycle (pagamento). |
| 11 | Confusão cross-channel | ✅ Improvável no fluxo auto. ⚠️ Risco residual: admin enviar manualmente `report_ready` depois do `report_saved` automático. |

## 6. Fixes recomendados antes do launch público pago

| Prioridade | Fix | Ficheiro | Acção |
|---|---|---|---|
| 🚨 P0 | Activar `PAYMENT_CONFIRMATION_EMAIL_ENABLED=true` no ambiente de produção | env / secrets | Sem isto, **nenhum pagamento real gera email de confirmação**. |
| 🟡 P1 | Eliminar race teórica em `report_saved` | migration — unique partial index em `product_events` para `event_type='report_saved_email_sent'` por `(metadata->>'lead_id', metadata->>'report_request_id')` | Fecha a janela entre lookup e insert em unlocks concorrentes. |
| 🟡 P1 | Guarda no admin UI para avisar "este lead já recebeu `report_saved` há Xh — tens a certeza que queres enviar `report_ready`/`commercial_followup`?" | `admin/v2/...` (UI only) | Reduz confusão percebida pelo utilizador. |
| 🟢 P2 | Documentar no `email-lab` que `payment_confirmed` para Authority Diagnosis (97€) não envia créditos (esperado) | `email-template-registry.ts` `wiredNote` | Clarifica para suporte. |
| 🟢 P2 | Considerar deprecar fisicamente `send-welcome-beta.server.ts` e `send-report-summary.server.ts` (manter só renderers para overrides) | `src/lib/email/` | Reduz superfície de erro humano. |

## 7. Verdict

- 🟢 **GO BETA** — lifecycle limpo, dedup nos pontos críticos, sem duplicados automáticos, sem pricing copy desactualizado.
- 🟡 **GO PUBLIC pago** — condicional a virar `PAYMENT_CONFIRMATION_EMAIL_ENABLED=true`. P1 (unique index) e UX guards são polish, não blockers.
- 🔴 **NO-GO** — manter a flag de payment_confirmed OFF em produção: o cliente paga 9€/97€ e não recebe confirmação, o que mata trust no minuto 1.
