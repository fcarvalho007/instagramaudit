## Estado atual

Boa parte da feature **já está implementada**:

| Componente | Estado |
|---|---|
| Endpoint `POST /api/admin/send-commercial-followup` | ✅ existe (266 linhas), usa `renderCommercialFollowup`, `resolveSender()`, regista `commercial_followup_sent`, marca `contacted_at`, mapeia erros Resend (sandbox, timeout, etc.) |
| Botão "Follow-up comercial" no Lead Detail Sheet | ✅ existe (linha 642–648) |
| Dialog de confirmação com `ConfirmDialog` | ✅ existe (linha 852–904), com mapping de erros e toast |
| Template `renderCommercialFollowup` | ✅ existe e testado |
| `resolveSender()` + Resend infra | ✅ partilhado com outros emails |

## Lacunas face ao spec

Quatro ajustes necessários:

### 1. Gating do botão (atualmente sempre visível)
O botão deve **só aparecer** quando:
- `lead.email` presente
- `lead.feedback` presente
- `interpretFeedback(lead.feedback).intent ∈ {"alto", "medio"}`
- `lead.commercial_status ∉ {"convertido", "arquivado"}`

Quando inelegível, esconder (ou desabilitar com tooltip "Sem feedback / intenção baixa").

### 2. Dialog enriquecido com preview
Atualmente mostra apenas email + descrição genérica. Adicionar:
- **Destinatário**: `lead.email`
- **Handle**: `@{lead.handle}`
- **Intenção detetada**: badge com `feedbackIntent.label` (alta/média)
- **Preferência de preço**: `lead.pricing_preference` traduzido (ex: "Plano mensal", "Bundle 5", "Relatório único", "—")
- **Subject**: render local de `renderCommercialFollowup(...).subject` para mostrar o assunto exato
- **Pré-visualização do corpo**: bloco scrollable com `text` (versão plain) ou render simplificado do `html` (preferido: `text` truncado em ~600 chars com botão "ver mais") — sem iframe pesado

Componente novo dedicado `CommercialFollowupDialog` para evitar engordar `lead-detail-sheet.tsx` (já tem 1540 linhas).

### 3. Atualização de status no sucesso (endpoint)
Atualmente o endpoint só marca `contacted_at`. Spec quer:
- `intent === "alto"` → `commercial_status = "potencial_cliente"`
- `intent === "medio"` → `commercial_status = "interessado"`
- Apenas se status atual ainda estiver no funil (não sobrepor `convertido`/`arquivado` mesmo se chamado por engano)

Implementação: o endpoint vai precisar de **carregar o feedback do lead** (já lê leads, basta join à `beta_feedback` mais recente) e correr `interpretFeedback` server-side para decidir o novo status. Reutiliza `interpretFeedback` (já é puro, server-safe).

### 4. Evento de falha (opcional mas pedido)
Adicionar `commercial_followup_failed` em todos os ramos de erro pós-validação (ou seja: depois de termos `lead`, antes de retornar erro Resend/timeout). Metadata: `error_code`, `provider_message`, `recipient`. Não atualiza status. Não bloqueia a resposta de erro.

Confirmar `commercial_followup_sent`/`commercial_followup_failed` na lifecycle/timeline labels e na allowlist de `recordLeadEvent` (`src/lib/admin/lead-events.server.ts`). Se não estiver, adicionar — sem alteração de schema (BD aceita qualquer string em `event_type`).

## Ficheiros afetados

**Editar:**
- `src/routes/api/admin/send-commercial-followup.ts` — carregar feedback, calcular intent server-side, atualizar status condicionalmente, registar `commercial_followup_failed` nos ramos de erro
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` — gating do botão (esconder se inelegível); substituir o `ConfirmDialog` inline pelo novo `CommercialFollowupDialog`
- `src/lib/admin/lead-events.server.ts` (se tiver allowlist) — adicionar os dois events
- `src/lib/admin/lead-timeline-labels.ts` (ou equivalente) — labels pt-PT para os novos events

**Criar:**
- `src/components/admin/v2/beta-leads/commercial-followup-dialog.tsx` — dialog dedicado com preview de subject+body, badges de intent e pricing

**Não tocar:**
- Template `renderCommercialFollowup` (já testado)
- `resolveSender()`, infra Resend
- Schema BD
- Public report / report generation / Apify / OpenAI / DataForSEO

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (templates.test.ts continua a passar)
- Manual:
  1. Lead com feedback intent alto → botão visível, dialog mostra "Intenção alta" + handle + pricing + subject + preview
  2. Lead sem feedback → botão escondido
  3. Lead intent baixo/sem → botão escondido
  4. Lead arquivado → botão escondido mesmo com intent alto
  5. Sucesso → toast + status passa a `potencial_cliente`/`interessado` + timeline mostra `commercial_followup_sent`
  6. Falha simulada (RESEND_API_KEY removida ou recipient sandbox) → toast com erro mapeado + status NÃO muda + timeline mostra `commercial_followup_failed`

## Riscos

- **Concorrência**: se admin já mudou o status manualmente para `convertido` enquanto o email saiu, evitamos sobrepor (verificação dentro do endpoint após `Resend.ok`).
- **Re-envios**: spec não pede idempotência; mantemos comportamento atual (admin pode reenviar; cada envio gera novo evento).