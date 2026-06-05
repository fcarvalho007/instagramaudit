
# Auditoria do lifecycle de email e plano de consolidação

Sem alterações de código. Sem envio de emails reais. Sem mudanças em preços, EuPago, checkout, créditos, geração de relatórios ou schema (salvo prova explícita).

## 1. Ficheiros inspecionados

Templates e senders:
- `src/lib/email/templates/{request-received,report-ready,feedback-request,personal-area-saved,welcome-beta,report-summary,commercial-followup,default-parts,index}.ts`
- `src/lib/email/report-email-template.ts` (delivery transacional com signed URL — separado do registry)
- `src/lib/email/{send-welcome-beta,send-report-summary,send-personal-area-saved}.server.ts`
- `src/lib/email/{lead-magnet-sequence.server.ts,transactional-email.server.ts,template-overrides.server.ts,build-report-summary-data.server.ts,sender.ts,shared.ts,url.ts,unsubscribe-token.server.ts}`
- `src/lib/admin/email-template-registry.ts`

Triggers / call-sites:
- `src/lib/unlock.server.ts` (chama `sendLeadMagnetSequence` no primeiro unlock)
- `src/lib/beta.functions.ts` (dispara `request_received` no submit do beta form)
- `src/routes/api/send-report-email.ts` (usa `report-email-template.ts`, signed URL)
- `src/routes/api/admin/send-report-link.ts` (manual: `report_ready`)
- `src/routes/api/admin/send-feedback-request.ts` (manual: `feedback_request`)
- `src/routes/api/admin/send-commercial-followup.ts` (manual: `commercial_followup`)

Admin UI:
- `src/routes/admin.email-lab.tsx`, `src/components/admin/v2/email-lab/email-lab-page.tsx`
- `src/routes/admin.automacoes.*`, `src/components/admin/v2/automacoes/*` (flow-page, automation-node, edge, stage-group, templates-tab, people-tab, metrics-tab, template-editor)
- `src/routes/api/admin/email-templates*.ts` (preview + overrides)

Pagamentos / eventos:
- `src/routes/api/public/eupago-webhook.ts` (emite `payment_webhook_paid` / `payment_webhook_failed`; **não envia email**)
- `src/lib/payments/entitlements.server.ts` (chamado pelo webhook; não envia email)

## 2. Mapa atual

| # | Template (key) | Trigger atual | Wired? | Observações |
|---|---|---|---|---|
| 1 | `request_received` | `beta.functions.ts` (submit beta form) | sim | Só dispara no fluxo beta antigo; não dispara no fluxo público de unlock. |
| 2 | `report_ready` | `/api/admin/send-report-link` (manual) | sim manual | Há outro path: `/api/send-report-email` usa `report-email-template.ts` (signed URL), fora do registry. Duplicação semântica. |
| 3 | `welcome_beta` | `lead-magnet-sequence` no 1.º unlock | sim auto | Sobrepõe-se ao `report_summary` no mesmo evento (envio duplo). |
| 4 | `report_summary` | `lead-magnet-sequence` em cada unlock | sim auto | Não menciona créditos restantes nem insights reais; KPIs apenas. |
| 5 | `personal_area_saved` | nenhum | **não wired** | Reservado para futuro signup de conta. |
| 6 | `feedback_request` | `/api/admin/send-feedback-request` (manual) | sim manual | Sem trigger automático D+1 / após view. |
| 7 | `commercial_followup` | `/api/admin/send-commercial-followup` (manual) | sim manual | Copy genérica ("mais secções"), não dá continuidade narrativa. |
| – | `report-email-template.ts` | `/api/send-report-email` | sim | Fora do registry e do EmailLab; invisível para admin. |
| – | **Payment confirmed** | — | **não existe** | EuPago webhook só persiste estado e emite product events; nunca dispara email. |

Gaps adicionais:
- `lead-magnet-sequence` envia welcome + summary no mesmo trigger → sobreposição.
- Nenhum email expõe saldo de créditos (2 iniciais, 1 usado, 1 restante).
- `report_summary` usa KPIs estáticos, não os "3 insights personalizados" pedidos.
- `feedback_request` automático depende de evento seguro (preferir `report_viewed` se existir; fallback D+1 a partir de `report_summary_email_sent`).
- Em `/admin/automacoes` há blocos que correspondem a templates não-wired ou a triggers manuais — confunde "automação" com "ação admin".

## 3. Keep / Merge / Rename / Deprecate / Wire

| Template | Decisão | Notas |
|---|---|---|
| `request_received` | **Keep** | Continua válido para o fluxo beta. Avaliar se também faz sentido no fluxo público de unlock (fora de scope desta fase). |
| `report_ready` (registry) + `report-email-template.ts` | **Merge** num único `report_ready` no registry | Manter signed URL como variante; expor no EmailLab. Sem mudar o endpoint que entrega o PDF. |
| `welcome_beta` + `report_summary` | **Merge → novo `report_saved`** | Substitui ambos no 1.º unlock. Conteúdo: relatório guardado · 2 créditos iniciais / 1 usado / 1 restante · 3 insights personalizados · CTA "Analisar outro perfil" / "Abrir relatório". Em unlocks seguintes do mesmo lead, enviar versão curta sem "boas-vindas". |
| `personal_area_saved` | **Deprecate (por ora)** | Manter ficheiro, marcar `wired: false` com nota clara. Reativar quando houver signup real. |
| `feedback_request` | **Keep + auto-wire** | Disparar via job idempotente: D+1 de `report_summary_email_sent` **ou** após `report_viewed` (o que vier primeiro). Incluir 1 insight real do relatório. |
| `commercial_followup` | **Rename + reescrever copy** | Nova narrativa: "o relatório gratuito levantou uma pergunta; o completo responde." Preserva preços e CTAs existentes. Continua manual nesta fase; auto-trigger numa fase futura. |
| **NOVO** `payment_confirmed` | **Criar** | Disparado por `eupago-webhook` quando o pagamento transita para `paid`, idempotente por `payment_id`. Confirma: produto desbloqueado, valor (lido de `lead_payments.amount_cents` — sem alterar), método e referência se disponíveis, CTA para abrir o relatório desbloqueado. Não toca em preços, entitlements, nem em lógica de webhook (só adiciona um `void send...` no final do branch `paid`). |

## 4. Ordem de implementação (segura)

1. **Documentação + decisões** — registar este mapa em `docs/BETA_RUNBOOK.md` (secção Email lifecycle) e atualizar o registry com `wiredNote`/`wired` corrigidos. Sem mudar comportamento.
2. **`payment_confirmed` (novo)** — template + sender + product event `payment_confirmation_email_sent`. Wire dentro do branch `paid` de `eupago-webhook.ts` (fire-and-forget, idempotente). Não toca em preço, entitlement, nem em status. Atrás de kill-switch `PAYMENT_CONFIRMATION_EMAIL_ENABLED` (default OFF até validar em staging).
3. **Merge `welcome_beta` + `report_summary` → `report_saved`** — criar template novo + builder que lê `credit_balance` e top-3 insights do snapshot. Substituir chamada em `lead-magnet-sequence.server.ts`. Manter os templates antigos no disco e no registry com `deprecated: true` até confirmar 1 ciclo limpo; só depois remover.
4. **Auto-trigger `feedback_request`** — adicionar job/cron idempotente (D+1 de `report_summary_email_sent` **ou** `report_viewed`). Continuar a permitir envio manual no admin.
5. **Reescrita de copy do `commercial_followup`** — só copy + 1 variável extra opcional (insight de continuidade). Sem novos triggers automáticos.
6. **`/admin/email-lab` e `/admin/automacoes`** — refletir o novo conjunto (5 estados claros), badges de "auto / manual / planeado", preview ligado ao novo `report_saved` e `payment_confirmed`. Apenas UI; sem lógica de negócio.
7. **Limpeza final** — remover `welcome_beta` e `report_summary` do registry após 1 ciclo bem-sucedido em produção. `personal_area_saved` fica como reserva documentada.

Cada passo é independente e reversível. Kill-switches por template (`*_EMAIL_ENABLED`) garantem rollback sem deploy.

## 5. Ficheiros a editar por passo

1. `docs/BETA_RUNBOOK.md`, `src/lib/admin/email-template-registry.ts`
2. `src/lib/email/templates/payment-confirmed.ts` (novo), `src/lib/email/send-payment-confirmed.server.ts` (novo), `src/lib/email/templates/index.ts`, `src/lib/admin/email-template-registry.ts`, `src/routes/api/public/eupago-webhook.ts` (apenas um `void send...` no fim do branch `paid`)
3. `src/lib/email/templates/report-saved.ts` (novo), `src/lib/email/send-report-saved.server.ts` (novo), `src/lib/email/build-report-saved-data.server.ts` (novo, lê créditos + insights), `src/lib/email/lead-magnet-sequence.server.ts` (substitui chamada), `src/lib/admin/email-template-registry.ts`
4. `src/routes/api/public/hooks/feedback-request-dispatcher.ts` (novo, cron), `src/lib/email/dispatch-feedback-request.server.ts` (novo), `src/lib/admin/email-template-registry.ts`
5. `src/lib/email/templates/commercial-followup.ts` (copy), `src/lib/admin/email-template-registry.ts`
6. `src/components/admin/v2/email-lab/email-lab-page.tsx`, `src/components/admin/v2/automacoes/*` (flow, stage-group, templates-tab), `src/routes/api/admin/automation-flow.ts` (se necessário expor novos blocos)
7. Remoções controladas em `src/lib/email/templates/{welcome-beta,report-summary}.ts` e respetivos senders, após validação.

Nada disto exige migração de schema. Se durante o passo 3 se confirmar que `credit_balance` ou "top-3 insights" não estão acessíveis a partir do snapshot atual, paramos e voltamos a pedir aprovação antes de qualquer DDL.

## 6. Garantias de não-regressão

- Preços de produto: intocáveis. Nenhuma alteração em `src/lib/payments/products.ts`, `pricing/*`, `lead_payments.amount_cents`, ou no payload EuPago.
- Lógica de checkout e webhook EuPago: intocável. O passo 2 adiciona apenas um `void sendPaymentConfirmedEmail(...)` no fim do branch `paid`, com try/catch interno.
- Créditos: intocáveis. O passo 3 apenas **lê** saldo para apresentar no email.
- Geração de relatórios e snapshots: intocável.
- Schema: nenhum `ALTER`/`CREATE` planeado.
- Todos os novos envios atrás de kill-switch e idempotentes por `(lead_id|payment_id, template_key)`.

## 7. Aprovação

Confirmas que avanço pela ordem 1 → 7, um passo por prompt, começando pelo passo 1 (documentação + correção de metadata no registry, zero envios)? Se preferires começar antes pelo `payment_confirmed` (passo 2) ou pelo merge `report_saved` (passo 3), indica e ajusto.
