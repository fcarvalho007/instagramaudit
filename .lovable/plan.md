
# Auditoria escrita — Lifecycle real de emails AuditProfiles

> 100% read-only. Nenhum email enviado, nenhum evento escrito, nenhum dado alterado.
> Fontes inspeccionadas: `src/lib/email/**`, `src/lib/admin/email-template-registry.ts`,
> `src/lib/admin/automation-flow-types.ts`, `src/routes/api/admin/automation-flow.ts`,
> `src/routes/api/admin/send-*.ts`, `src/routes/api/public/eupago-webhook.ts`,
> `src/lib/unlock.server.ts`, `src/lib/beta.functions.ts`,
> e `product_events` / `leads` / `report_requests` (últimos 30–90 dias).

---

## 1. Sumário executivo

**Estado real:** **Mostly correct in code, but admin UI is confusing and parts of the lifecycle are not yet observable in production.**

- O código de envio está consolidado e correcto: o orquestrador `lead-magnet-sequence` chama exclusivamente `sendReportSavedEmail`, com dedup unificado contra os três eventos (`report_saved_email_sent`, `beta_welcome_email_sent`, `report_summary_email_sent`).
- `welcome_beta` e `report_summary` **já não têm callers em produção** (apenas o registry e testes os importam). Não podem disparar.
- `payment_confirmed` está atrás do kill-switch `PAYMENT_CONFIRMATION_EMAIL_ENABLED` (default OFF) com idempotência por `payment_id`.
- `feedback_request` ficou com idempotência por `(lead_id, report_request_id)` via `feedback_request_email_sent` (hardening recente).
- `request_received` continua a disparar imediatamente na submissão beta.
- **Risco principal não é "envia errado"**, é **observabilidade e clareza do admin**:
  - Em `/admin/automacoes` o "a aguardar" do flow **Pedido recebido** = `leads.commercial_status='novo_pedido'` (11 leads hoje). Não significa "11 emails na fila" — esses 11 já receberam (ou tentaram receber) o email. Significa "11 leads a aguardar acção do admin". É a fonte de confusão descrita no pedido.
  - Em `product_events` dos últimos 90 dias **não há nenhum** `request_received_email_sent`, `report_saved_email_sent`, `report_link_sent`, `feedback_request_email_sent`, `commercial_followup_sent` nem `payment_*`. Só temos 8x `beta_welcome_email_sent` + 8x `report_summary_email_sent` de **2026-05-29** (pré-consolidação). Isto pode significar (a) que após o deploy da nova lógica ninguém passou pelos triggers de produção, ou (b) que algo está a falhar silenciosamente antes de escrever os eventos novos. Recomenda-se uma validação controlada antes de assumir que está OK.

Veredicto curto: **Mostly correct but confusing in admin · pronto para validação controlada antes de produção, mas com 1 correcção textual recomendada na UI**.

---

## 2. Lifecycle implementado hoje (tabela)

| Stage | Template key | Nome user-facing | Trigger / evento | Modo | Delay | Envia em prod? | Evento escrito | Status mostrado no admin | Notas / riscos |
|---|---|---|---|---|---|---|---|---|---|
| 01 Captação | `request_received` | Pedido recebido | `beta.functions.ts → createBetaRequest` (form submit) | Automático | imediato | **Sim** | `request_received_email_sent` / `_failed` | Activo / Transaccional | "A aguardar" = leads em `novo_pedido` (admin ainda não aprovou) — **não** é fila de email. |
| 01 Captação | — | Geração do relatório | Admin gera manualmente | Sistema | manual | n/a | `report_generated` | Bloqueado / sistema | Não envia email. |
| 02 Entrega (**principal**) | `report_saved` | Relatório guardado | `unlock.server.ts → sendLeadMagnetSequence` (1º unlock de cada `report_request`) | Automático | imediato | **Sim** | `report_saved_email_sent` / `_failed` | Activo / Transaccional · primary_delivery | Dedup unificado também respeita os eventos legacy. Variante "welcome" vs "returning" decide-se via `sendWelcome`. |
| 02 Entrega (variante) | `report_ready` | Relatório pronto — envio manual / signed URL | Admin · `send-report-link.ts` | Manual | manual | Sim (manual) | `report_link_sent` (do admin route) | Activo / Manual | Falhas count via `report_requests.delivery_status='failed'`. |
| 02 Entrega (sistema) | — | Relatório visto | `report_viewed` (open público) | Automático | imediato | n/a | `report_viewed` | Bloqueado / sistema | Avança `commercial_status` para `relatorio_visto`. |
| 03 Retenção | `feedback_request` | Pedido de feedback | Admin · `send-feedback-request.ts` | Manual | manual | Sim (manual) | `feedback_requested` + `feedback_request_email_sent` / `_failed` | Activo / Manual | Idempotente por `(lead_id, report_request_id)` desde o hardening. Note: "Sem auto-trigger nesta fase". |
| 04 Conversão | `commercial_followup` | Follow-up comercial | Admin · `send-commercial-followup.ts` | Manual | manual | Sim (manual) | `commercial_followup_sent` | Activo / Manual | Note: "Auto-trigger não activo nesta fase". |
| 05 Pagamento | `payment_confirmed` | Pagamento confirmado | `eupago-webhook.ts` (branch paid, depois de update + grantEntitlement + `payment_webhook_paid`) | Automático | imediato | **Apenas se `PAYMENT_CONFIRMATION_EMAIL_ENABLED=true`** | `payment_confirmation_email_sent` / `_skipped` / `_failed` | Activo / Transaccional / Kill-switch OFF | Idempotente por `payment_id`. Falha NUNCA afecta pagamento/entitlement. |
| 99 Legado | `welcome_beta` | Boas-vindas à beta | — (nenhum caller em produção) | — | — | **Não** | só dedup honra `beta_welcome_email_sent` | Legado / Desactivado | Renderer/sender ficam em disco para auditoria de overrides. |
| 99 Legado | `report_summary` | Resumo do relatório | — (nenhum caller em produção) | — | — | **Não** | só dedup honra `report_summary_email_sent` | Legado / Desactivado | Idem. |
| 99 Planeado | `personal_area_saved` | Área pessoal guardada | — (sem trigger) | Automático (planeado) | — | **Não** | `personal_area_saved_sent` (`instrumented:false`) | Planeado / Sem trigger | Reservado para fluxo de criação de conta. |

---

## 3. Sequência exacta por cenário

### A. Novo pedido beta (antes de existir relatório)
1. `request_received` envia imediatamente via `sendTransactionalEmail`.
2. Escreve `beta_request_created` (sempre) **e** `request_received_email_sent`/`_failed` (best-effort).
3. `lead.commercial_status` fica `novo_pedido`. Admin vê este lead no slot "Pedido recebido" como "a aguardar acção".
4. **Nada mais envia** até admin gerar o relatório ou o lead fazer unlock.

### B. Relatório fica disponível / unlock público
1. `unlock.server.ts` cria/encontra `report_request` e marca como `unlocked`.
2. Avança `commercial_status` para `relatorio_visto` (via `maybeAdvanceLeadStatus`).
3. Chama `sendLeadMagnetSequence` (awaited):
   - **Dedup primeiro**: se já existe `report_saved_email_sent` **OU** `beta_welcome_email_sent` **OU** `report_summary_email_sent` para `(lead_id, report_request_id)` → retorna `skipped_duplicate` e **não envia nada**. Isto protege leads que receberam o pair legacy antes da consolidação.
   - Senão envia **um** `report_saved` (variante `welcome` se `sendWelcome=true`, caso contrário `returning`) e escreve `report_saved_email_sent` (ou `_failed`).
4. `welcome_beta` e `report_summary` **não disparam**: não existem callers no código de produção (`grep` confirma — só `send-*.server.ts`, registry, testes).
5. Sync Brevo (awaited) e Brevo `BETA_WELCOMED_AT` stamp (fire-and-forget) só na variante welcome.

### C. Returning lead faz outro unlock
1. Mesma sequência que B, mas com `sendWelcome=false` → copy "returning" do `report_saved`.
2. Dedup por `report_request_id` continua a evitar duplicados na mesma análise; novo `report_request` → novo email.

### D. Admin envia manualmente o link do relatório
1. POST `/api/admin/send-report-link` → renderiza `report_ready` (signed URL), envia, escreve `report_link_sent`, actualiza `report_requests.delivery_status`.
2. **Separado** de `report_saved`. Não emite `report_saved_email_sent`.

### E. Admin pede feedback
1. POST `/api/admin/send-feedback-request` → check `alreadySentForRequest(lead_id, report_request_id)`. Se já existe `feedback_request_email_sent` → retorna `skipped_duplicate` (200) e UI mostra toast info.
2. Caso contrário envia `feedback_request`, escreve `feedback_requested` + `feedback_request_email_sent` (ou `_failed`).

### F. Admin envia follow-up comercial
1. POST `/api/admin/send-commercial-followup` → envia `commercial_followup`, escreve `commercial_followup_sent`. Continua **só manual** — nenhum auto-trigger no código.

### G. EuPago marca pagamento como paid
1. Webhook actualiza `lead_payments.status='paid'`.
2. `grantEntitlement` (try/catch — falha não bloqueia ack).
3. Redenção de cupão se aplicável.
4. Escreve `payment_webhook_paid`.
5. Fire-and-forget: `sendPaymentConfirmedEmail({ paymentId })` — guards na ordem: kill-switch → idempotência (`payment_confirmation_email_sent` por `payment_id`) → row paga → email do lead → URL do relatório. Falha escreve `payment_confirmation_email_skipped` ou `_failed` e responde 200 ao EuPago em todos os cenários.

---

## 4. Consistência admin vs código

### `/admin/email-lab`
- Grupos lifecycle (`captacao`, `entrega`, `retencao`, `conversao`, `pagamento`, `legado`) **correctos** e coerentes com o código.
- `lifecycleRole`, `statusBadges` e `wiring.idempotencyEvent` no registry batem certo com os senders.
- `welcome_beta` e `report_summary` marcados `legado` + `desactivado` + `lifecycleRole=legacy` — correcto.
- `report_ready` claramente marcado `manual_fallback` — correcto.
- `report_saved` no slot principal de entrega (`primary_delivery`) — correcto.
- Preview usa os mesmos renderers que produção (`renderReportSaved`, `renderPaymentConfirmed`, etc.) — copy e design estão alinhados.

### `/admin/automacoes`
- **KPI breakdown** já distingue `activeCount`, `manualCount`, `killSwitchOffCount`, `legacyCount`, `totalCount` — bom. "9 automações activas" deixa de ser uma mentira porque agora `operationalActiveCount` exclui legado e kill-switch-off.
- **`payment_confirmed`** mostra badge `kill_switch_off` + note "Activar apenas em validação controlada antes de produção" — correcto.
- **`feedback_pedido`** mostra "Sem auto-trigger nesta fase" — correcto.
- **`follow_up_comercial`** mostra "Auto-trigger não activo nesta fase" — correcto.
- **Cards legado** (`welcome_beta`, `report_summary`, `personal_area_saved`) em `99_legado` com variante `muted` — visualmente correcto.
- ⚠️ **Problema #1 (alto)** — `pedido_recebido.eventTypes = ["beta_request_created"]`. O contador "Enviados (30d)" deste flow conta **criação de pedidos**, não emails enviados. Deveria contar `request_received_email_sent`. O `welcome_beta` e o `report_summary` continuam a contar 8 envios "legacy" como se estivessem activos (`sentEvents` agrega sem filtrar `wired`), e o tooltip não explica que aqueles 8 são pré-consolidação.
- ⚠️ **Problema #2 (alto)** — `eligibleCount` do flow `pedido_recebido` = `countEq("novo_pedido")` = **11**. A UI rotula isto como "a aguardar". É verdadeiro do ponto de vista de lifecycle (11 leads aguardam que o admin avance para `em_analise`), mas é **lido como "11 emails por enviar"** — confusão directa com a preocupação reportada. O email `request_received` já saiu (ou tentou sair) imediatamente após o submit.
- ⚠️ **Problema #3 (médio)** — Mesmo padrão em `link_enviado` (`eligibleCount = countEq("relatorio_gerado")`): com 0 leads em `relatorio_gerado` hoje, está OK; mas conceptualmente é "à espera que o admin envie o link", não "email queued".

### Resposta directa às perguntas críticas
- **Pode um lead com relatório aparecer como `request_received` waiting?** Sim — porque o flow conta `commercial_status='novo_pedido'`, que só avança quando o admin passa para `em_analise`. Se o admin nunca avança, o lead fica visualmente "a aguardar pedido recebido" mesmo já tendo o email enviado. **Não é bug funcional, é label confuso.**
- **`request_received` pode ser enviado depois do relatório existir?** Não, é one-shot na submissão. Não há re-envio.
- **`welcome_beta` ou `report_summary` podem disparar em produção?** Não. Não há caller. Verificado com `rg` em todo o `src/`.
- **`report_saved` pode ser saltado por causa de eventos legacy?** Sim, **por design**: a dedup unificada cobre os 8 leads de May 29 (que receberam o par legacy). Eles **não** vão receber `report_saved` no mesmo `report_request`. Correcto e desejado.
- **Mesmo `report_request` pode receber duplicados?** Não, em nenhum dos flows com idempotência (`report_saved`, `feedback_request`, `payment_confirmed`). `request_received` é one-shot por submissão; `commercial_followup` e `report_ready` são manuais e dependem do admin não clicar duas vezes (este último não tem dedup — risco baixo, é manual).
- **`payment_confirmed` só envia com kill-switch ON?** Sim. `isKillSwitchOn()` exige literal `"true"`. Default OFF. Sem `.env` na sandbox → OFF agora.
- **Mismatch entre `/admin/email-lab`, `/admin/automacoes` e código?** Pequenos (ver problemas #1–#3 acima e #4 abaixo).

---

## 5. Data freshness (últimos 30–90 dias)

`product_events` (90d):
- 0 × `request_received_email_sent`, 0 × `report_saved_email_sent`, 0 × `report_link_sent`, 0 × `feedback_request_email_sent`, 0 × `commercial_followup_sent`, 0 × `payment_confirmation_email_*`, 0 × `payment_webhook_paid`.
- 8 × `beta_welcome_email_sent` + 8 × `report_summary_email_sent` em **2026-05-29** (antes da consolidação).
- 204 × `report_viewed`, 8 × `unlock_completed`, 8 × `report_saved_to_account`, 9 × `lead_status_changed`.

`leads`: 11 em `novo_pedido`, 8 em `relatorio_visto`, 0 nos restantes status (`em_analise`, `relatorio_gerado`, `link_enviado`, `feedback_pedido`, …).

`report_requests` (top 10): todos `request_status='unlocked'`, mas `pdf_status='not_generated'` e `pdf_generated_at IS NULL`. A média "tempo até `report_generated`" no admin → "sem dados" (esperado).

**Implicações:**
- Os 8 leads em `relatorio_visto` já tiveram o pair legacy entregue. Não vão receber `report_saved` num re-unlock do mesmo `report_request` (dedup correcto). **Não estão "stuck"** do ponto de vista funcional; apenas o admin não os fez progredir para `feedback_pedido`.
- Não há ainda nenhum envio do novo lifecycle em `product_events` — **não é possível validar end-to-end sem fazer uma execução controlada**. Não é evidência de bug, mas é evidência de "não testado em produção".

---

## 6. Problemas encontrados

| # | Severidade | Área | Problema | Evidência | Porque importa | Proposta | Ficheiros |
|---|---|---|---|---|---|---|---|
| 1 | HIGH | admin UI / copy | "A aguardar" no card `pedido_recebido` (e `link_enviado`) é interpretado como fila de emails, mas é estado de lifecycle | 11 leads em `novo_pedido` vs. 0 envios do novo lifecycle | Confunde admin → pensa que há emails por enviar quando o email já saiu | Mudar label de "A aguardar" para "Leads neste estado" + tooltip explicativo nos cards que não são triggers de email | `automation-node.tsx`, `stage-group.tsx`, possivelmente `automation-flow-types.ts` (label) |
| 2 | HIGH | admin UI / metadata | `pedido_recebido.eventTypes` conta `beta_request_created` em "Enviados", não o `request_received_email_sent` | `FLOW_EVENTS.pedido_recebido` em `automation-flow-types.ts` linha 314 | "Enviados" inclui pedidos onde o email pode ter falhado | Trocar `types` para `["request_received_email_sent"]` (manter `beta_request_created` só para timing) | `automation-flow-types.ts` |
| 3 | MEDIUM | admin UI | Cards legacy ainda mostram `sentEvents=8` (Maio 29) sem indicar "histórico pré-consolidação" | DB query a 90d | Pode sugerir que ainda disparam | Mostrar `sentEvents=0` quando `stage==='99_legado'` **ou** exibir label "8 (histórico pré-consolidação · não dispara hoje)" | `automation-node.tsx` ou `automation-flow.ts` (derivar campo) |
| 4 | MEDIUM | observabilidade | 0 eventos do novo lifecycle em 90d ⇒ ninguém validou `report_saved` / `request_received_email_sent` / `payment_confirmed` end-to-end em produção | DB query | Não temos prova de que o novo caminho escreve `product_events` correctamente | Validação controlada (Test A: nova lead beta, Test B: unlock controlado, Test C: pagamento controlado com kill-switch ON) | n/a (procedure) |
| 5 | LOW | code/admin | `feedback_request_email_sent` não está em `FLOW_EVENTS.feedback_pedido.types` (só `feedback_requested`) | `automation-flow-types.ts` linha 325 | "Enviados" subestima envios reais (`feedback_requested` é escrito antes do envio; `feedback_request_email_sent` é o sinal de sucesso) | Acrescentar `feedback_request_email_sent` ao set | `automation-flow-types.ts` |
| 6 | LOW | code | `send-report-link.ts` (manual) não tem dedup; admin a fazer double-click pode reenviar | `rg recordProductEvent src/routes/api/admin` mostra `report_link_sent` mas sem `alreadySentForRequest` equivalente | Manual, mas o mesmo padrão de hardening do `feedback_request` faz sentido | Aplicar mesma idempotência baseada em `report_link_sent` por `report_request_id` | `send-report-link.ts` |
| 7 | LOW | UI clarity | Stage 02 description fala em "principal" mas o card `link_enviado` ainda aparece com badge `primary_delivery` | `automation-flow.ts` linhas 377 e 350 | Dois cards na mesma stage com `primary_delivery` baralha leitura | Remover `extraTag:"primary_delivery"` do `link_enviado` (deixar só `report_saved`) | `automation-flow.ts` |

Nenhum BLOCKER encontrado.

---

## 7. Recomendações (sem implementação)

**A. No-code / metadata / labels (rápido, baixo risco)**
- Trocar label "A aguardar" → "Leads neste estado" para flows cujo `eligibleCount` deriva de `commercial_status` (não fila).
- Adicionar tooltip nos KPIs e cards explicando "a aguardar = leads neste estado do lifecycle, não emails na fila".
- Anotar cards legacy com "Sentos pré-consolidação · não dispara hoje".

**B. UI clarity**
- Esconder `sentEvents` em cards `99_legado` (ou mostrar com claim explícito).
- Remover `primary_delivery` do `link_enviado`.

**C. Comportamental (precisa aprovação)**
- Corrigir `FLOW_EVENTS.pedido_recebido.types` para `request_received_email_sent`.
- Acrescentar `feedback_request_email_sent` a `FLOW_EVENTS.feedback_pedido.types`.
- Aplicar dedup ao `send-report-link.ts` (mesmo padrão `feedback_request`).

**D. Data cleanup / backfill**
- Nenhum cleanup necessário. Os 8 eventos legacy de Maio são correctamente honrados pela dedup. Não apagar.

**E. Futuro**
- Validar a hipótese "auto-trigger D+1 para `feedback_request`" depois de termos amostragem real.
- Quando criar conta estiver pronto, ligar `personal_area_saved` e instrumentar `personal_area_saved_sent`.

---

## 8. Recomendação final

- **Seguro avançar para validação controlada?** **Sim, com 1 ajuste textual antes** (Problema #1 — relabel "A aguardar" → "Leads neste estado" e/ou adicionar tooltip). Os senders, a dedup e os kill-switches estão correctos; o que falta é confirmar que o caminho escreve `product_events` em produção (e isso é exactamente o que a validação controlada faz).
- **Ou corrigir admin/lifecycle primeiro?** Apenas a correcção textual #1 (e idealmente #2 e #5 — metadata de eventos). Não é necessário tocar em senders.
- **Próximo prompt mais seguro (single, pequeno):**

  > "Implementa apenas as correcções de label e metadata dos Problemas #1, #2 e #5 do audit anterior. Sem alterar senders, sem novos triggers, sem mexer em preços/checkout/EuPago/créditos/entitlements/geração de relatório/schema. Só labels em `automation-node.tsx`/`stage-group.tsx` e `types` em `automation-flow-types.ts`."

  Depois disso, prompt seguinte = validação controlada do `report_saved` (já tens o template desse pedido nos prompts anteriores).
