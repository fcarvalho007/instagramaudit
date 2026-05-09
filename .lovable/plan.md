# Plano — Refinamentos e fases por concluir

Revi o estado das 4 fases anteriores. Há lacunas claras de integração: módulos criados que não estão a ser usados, ações admin em falta no Lead Detail Sheet, e transições de status que ficaram preparadas mas nunca disparam. Proposta para fechar tudo numa única passagem.

## Diagnóstico

| Fase | Estado | Lacuna |
|---|---|---|
| 1. CRM lifecycle | OK | `mapEventToSuggestedStatus` existe mas nunca dispara — `relatorio_visto` nunca é definido automaticamente |
| 2. Enviar link | OK funcionalmente | Usa `report-link-email-template.ts` antigo em vez do novo módulo `templates/report-ready` |
| 3. Email templates pt-PT | Criados mas **não usados em lado nenhum** | 4 templates órfãos |
| 4. Form de feedback público | OK | **Não há ação admin para enviar o link `/feedback/$requestId`** nem para marcar `feedback_pedido` |

Templates antigos remanescentes: `report-link-email-template.ts`, `report-email-template.ts`. Não os removo — `report-email-template.ts` envia o PDF (caso distinto, cobre `send-report-email.ts` que não foi pedido para alterar).

## Refinamentos a executar

### R1. Wire-up do `templates/report-ready` no envio de link
- `src/routes/api/admin/send-report-link.ts` passa a importar `renderReportReady` de `@/lib/email/templates`.
- Apaga `src/lib/email/report-link-email-template.ts` (órfão após swap).
- Mantém comportamento, copy e assunto idênticos (ambos já alinhados).

### R2. Nova ação "Pedir feedback" no Lead Detail Sheet
- Novo endpoint `POST /api/admin/send-feedback-request.ts`:
  - Valida `lead_id` + `report_request_id`, exige status `link_enviado` ou `relatorio_visto` e email do lead.
  - Constrói URL `${PUBLIC_BASE}/feedback/${report_request_id}`.
  - Envia email via Resend usando `renderFeedbackRequest` (já existe).
  - Em sucesso: regista `feedback_request_sent`, e move o status para `feedback_pedido` via `updateLeadCommercialStatus({source:"manual"})`.
- Botão `Pedir feedback` no Lead Detail Sheet, ao lado de `Enviar link`. Disabled se faltar email/handle/report_request_id ou se status já estiver em `feedback_pedido`/`feedback_recebido`/`arquivado`. Diálogo de confirmação igual ao `SendLinkDialog`.

### R3. Auto-transição em `report_viewed`
- Em `src/lib/tracking.functions.ts` (server function que recebe o evento de visualização), depois de gravar `report_viewed`, se conseguirmos resolver o `lead_id` (via `report_requests.instagram_username` + lookup), chamar `updateLeadCommercialStatus({status:"relatorio_visto", source:"auto"})` apenas se o status atual for `link_enviado`. Nunca regredir status (ex: já está em `feedback_pedido`).
- Implementação defensiva: helper `maybeAdvanceLeadStatus(currentStatus, targetStatus)` que define a ordem do funil e só avança.

### R4. Email "Pedido recebido" no submit beta
- Em `src/routes/api/request-full-report.ts` (ou `beta-request` equivalente — confirmo no exec), depois de criar a lead/report_request, dispara `renderRequestReceived` via Resend.
- Wrap em try/catch; falha de email **não** bloqueia o pedido. Regista `request_received_email_sent` ou `request_received_email_failed` em `product_events` para auditoria.

### R5. Idempotência do `feedback_started`
- O check actual usa `metadata @> {report_request_id}` — funciona, mas `product_events` não tem índice GIN em `metadata`. Para escala atual (beta) está OK; flag apenas no plano. Sem ação agora.

## Fora de scope (não toco)

- `send-report-email.ts` (envia PDF, não foi pedido alterar)
- Geração de relatório, scoring, PDF pipeline
- Layout/colunas do Kanban
- Templates antigos enquanto ainda usados (`report-email-template.ts`)
- Follow-up comercial automático (Template 4 fica órfão por agora — uso manual via "Copiar email" já cobre o cenário; só criamos ação dedicada se pedires)

## Ficheiros

**Criar:**
- `src/routes/api/admin/send-feedback-request.ts`

**Editar:**
- `src/routes/api/admin/send-report-link.ts` — usa `renderReportReady`
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` — botão "Pedir feedback" + diálogo
- `src/lib/tracking.functions.ts` — auto-transição em `report_viewed`
- `src/lib/admin/lead-lifecycle.ts` — adiciona helper `maybeAdvanceLeadStatus`
- `src/routes/api/request-full-report.ts` — dispara email "Pedido recebido"

**Apagar:**
- `src/lib/email/report-link-email-template.ts` (substituído pelo módulo novo)

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Confirmar manualmente: "Pedir feedback" envia email, regista evento, status vai a `feedback_pedido`.
- Confirmar: abrir relatório enquanto status é `link_enviado` → muda para `relatorio_visto`. Abrir quando já está em `feedback_pedido` → não regride.
- Confirmar: Kanban e Lead Detail Sheet continuam a abrir.

## Checkpoint

- ☐ R1 swap template send-report-link
- ☐ R2 endpoint + botão "Pedir feedback"
- ☐ R3 auto-transição `relatorio_visto`
- ☐ R4 email "Pedido recebido" no submit beta
- ☐ Apagar template antigo órfão
- ☐ tsc + vitest verdes
