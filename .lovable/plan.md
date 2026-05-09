## Auditoria do estado atual

### 1. Campos da `leads`
`id, email, email_normalized, name, company, source, created_at, updated_at, user_type, purpose, profile_ownership, beta_consent, beta_consent_at, commercial_status, internal_notes, contacted_at, archived_at`. **Sem** `lead_id` em `profiles`? — está, sim, ligado via `profiles.lead_id` e `report_requests.lead_id` (1 lead → N pedidos).

### 2. Campos da `report_requests`
`id, lead_id, user_id, instagram_username, competitor_usernames, request_source, request_status, delivery_status, is_free_request, request_month, metadata, created_at, updated_at, analysis_snapshot_id, pdf_status, pdf_storage_path, pdf_generated_at, pdf_error_message, email_sent_at, email_message_id, email_error_message`. Já tem ligação a `analysis_snapshots`. **Não** existe `report_url_token` nem `viewed_at`.

### 3. `commercial_status` em uso
Apenas `novo_pedido` (1 row). O Kanban (`src/lib/admin/kanban-columns.ts`) já define 9 colunas:
`novo_pedido · em_analise · relatorio_gerado · relatorio_visto · feedback_pedido · interessado · potencial_cliente · convertido · arquivado`.
Nenhuma transição automática implementada — tudo manual via `leads-kanban.$id.ts`.

### 4. `product_events` em uso
Só `report_viewed` (143 rows). Já estão **declarados** em `tracking.functions.ts` mas ainda não disparados pela UI: `public_report_link_copied, pro_teaser_clicked, feedback_started, feedback_submitted, pricing_clicked, email_clicked`. `beta_request_created` é gravado em `beta.functions.ts`. Faltam `report_generated`, `report_link_sent`, `feedback_requested`, `unlock_clicked`.

### 5. Infra de email
- `RESEND_API_KEY` configurado.
- Endpoint funcional `src/routes/api/send-report-email.ts` (sender sandbox `onboarding@resend.dev`).
- `report_requests` já regista `email_sent_at`, `email_message_id`, `email_error_message`.
- Botão admin "Reenviar email" via `api/admin/resend-email.ts`.
- **Sem** queue, sem suppression list, sem domínio verificado, sem templates fora do "report email".

### 6. Resend
Integração HTTP direta (sem SDK). Pronta a ser reutilizada para outros templates (feedback request, follow-up).

### 7. Ações no Lead Detail Sheet
Header + KPIs + Perfil + Relatório (gerar/regenerar/reenviar) + Inteligência comercial (selector de status) + Timeline (`product_events`) + Notas. Já tem hooks para mudar `commercial_status` manualmente. Falta: pedir feedback, marcar follow-up, registar conversão/preço, copiar link público.

### 8. Colunas do Kanban
9 colunas alinhadas com a lista pedida — só falta acrescentar **`link_enviado`** e **`feedback_recebido`** se quisermos atomicidade total.

### 9. `report_viewed` na rota pública
Sim — `analyze.$username.tsx` chama `trackEvent({ eventType: "report_viewed" })` ao montar. Mas o evento é gravado **sem `lead_id`** (a rota pública só conhece o `snapshotId`/handle). Isto impede correlacionar visualizações com leads sem um JOIN posterior `snapshot → request → lead`.

### 10. Relação lead ↔ request ↔ snapshot
Existe: `leads.id → report_requests.lead_id → report_requests.analysis_snapshot_id → analysis_snapshots.id`. Suficiente para reconstruir tudo via JOIN, sem novas FKs.

---

## Lifecycle proposto

| # | Estado | Origem | Trigger |
|---|---|---|---|
| 1 | `pedido_recebido` (= `novo_pedido`) | Auto | Insert em `leads` + `report_requests` (form beta) |
| 2 | `em_analise` | Auto | Botão "Gerar relatório" carregado no admin → `request_status = processing` |
| 3 | `relatorio_gerado` | Auto | `pdf_status = generated` & snapshot ready |
| 4 | `link_enviado` | Auto | `email_sent_at` preenchido com sucesso |
| 5 | `relatorio_visto` | Auto | Primeiro `product_events.report_viewed` cuja `snapshot_id` ↔ request do lead |
| 6 | `feedback_pedido` | Auto/manual | Email follow-up enviado (template novo) ou clique manual no sheet |
| 7 | `feedback_recebido` | Auto | `product_events.feedback_submitted` |
| 8 | `interessado` | Manual | Botão "Marcar como interessado" no sheet |
| 9 | `potencial_cliente` | Manual | Idem |
| 10 | `convertido` | Manual | Botão "Marcar como convertido" + valor opcional |
| 11 | `arquivado` | Manual | Botão arquivar |

Auto = 1–7; Manual = 8–11. As transições auto **só avançam para a frente** — nunca recuam um lead já em `interessado+`.

---

## Mapa de eventos

| Evento | Disparado por | Já existe? |
|---|---|---|
| `beta_request_created` | `beta.functions.ts` (server) | ✓ |
| `report_generated` | `api/admin/generate-beta-report.ts` após PDF ready | ✗ adicionar |
| `report_link_sent` | `api/send-report-email.ts` após Resend 200 | ✗ adicionar |
| `report_viewed` | `analyze.$username.tsx` (client) | ✓ (sem lead_id) |
| `feedback_requested` | Endpoint novo `api/admin/request-feedback` | ✗ adicionar |
| `feedback_started` | Componente feedback inline | ✓ definido, ✗ disparado |
| `feedback_submitted` | Submit do form de feedback | ✓ definido, ✗ disparado |
| `unlock_clicked` | "Abrir o cofre" / lock teasers no report | ✗ adicionar (substitui `pro_teaser_clicked`) |
| `pricing_option_clicked` | Cards €3/€13 no cofre | ✓ (`pricing_clicked` — renomear ou alias) |

---

## Mudanças DB necessárias

Mínimas. Apenas três adições para fechar o ciclo sem JOINs caros:

1. `leads.last_status_change_at timestamptz` — drive Kanban "tempo na coluna".
2. `leads.last_event_at timestamptz` + trigger em `product_events.AFTER INSERT` para denormalizar (consultas no admin sem N+1).
3. `report_requests.first_viewed_at timestamptz` — atalho para o auto-status `relatorio_visto` (preenchido por trigger ou no handler `trackEvent`).

**Não precisa**: novos enums (basta acrescentar 2 valores ao Kanban: `link_enviado`, `feedback_recebido`), nem nova tabela. Continuamos a usar `product_events` como event-log único.

Opcional fase 2: `lead_value_eur numeric` e `converted_at timestamptz` em `leads` para o estado `convertido`.

---

## Faseamento recomendado

**Fase 1 — Observabilidade (sem comportamento novo, sem schema)**
Disparar os eventos em falta (`report_generated`, `report_link_sent`, `feedback_requested`, `unlock_clicked`) e enriquecer `report_viewed` com `lead_id` resolvido server-side via `snapshot_id → report_requests.lead_id`.

**Fase 2 — Auto-status no admin**
Função SQL `recompute_lead_status(lead_id)` chamada por trigger em:
- update de `report_requests` (status, pdf, email)
- insert em `product_events` (report_viewed, feedback_submitted)
A função aplica a regra "só avança". O Kanban passa a refletir realidade sem cliques.

**Fase 3 — Schema mínimo**
Adicionar `last_status_change_at`, `last_event_at`, `first_viewed_at`. Acrescentar `link_enviado` e `feedback_recebido` ao `KANBAN_COLUMNS`.

**Fase 4 — Acções no Lead Sheet**
Botões: "Pedir feedback" (envia email + cria evento + status auto), "Copiar link público", "Marcar interessado/potencial/convertido/arquivado", "Adicionar valor €". Mantém-se o selector manual como override.

**Fase 5 — Email follow-up (Resend)**
Template `feedback-request` reutiliza o pipeline existente. Suppression list e domínio verificado ficam para depois (não bloqueiam MVP interno).

---

## Riscos

- **Falta de `lead_id` em `report_viewed`**: histórico actual (143 rows) ficará órfão; backfill simples via JOIN snapshot → request.
- **Trigger de auto-status** pode entrar em conflito com mudanças manuais — mitigar com regra "nunca recua" e flag `manual_override_at`.
- **Domínio Resend não verificado**: emails de feedback podem cair em spam. Aceitável em fase beta interna.
- **Eventos sem auth no público** podem ser falsificados — manter `actor_hash` + rate-limit (já existe noutras rotas) e nunca usar para faturação.
- **Renomear `pricing_clicked` → `pricing_option_clicked`** quebra qualquer dashboard que filtre o nome antigo. Optar por **alias** (aceitar ambos) em vez de renomear.

---

## Primeiro prompt de implementação (Fase 1)

> **Goal:** Add observability to the existing beta lifecycle without changing schema, UI ou Kanban.
>
> **Scope:**
> 1. Em `src/routes/api/admin/generate-beta-report.ts`, após o PDF/snapshot ficar ready, chamar `recordProductEvent({ eventType: "report_generated", leadId, snapshotId, handle, metadata: { request_id } })`.
> 2. Em `src/routes/api/send-report-email.ts`, após `resendResponse.ok`, chamar `recordProductEvent({ eventType: "report_link_sent", leadId, snapshotId, handle, metadata: { message_id } })`.
> 3. Em `src/lib/tracking.functions.ts`:
>    - acrescentar `unlock_clicked` e `feedback_requested` à `ALLOWED_EVENTS`;
>    - quando `eventType === "report_viewed"` e `snapshotId` presente, resolver `leadId` server-side via `report_requests.analysis_snapshot_id → lead_id` e gravá-lo no evento.
> 4. **Não** mudar Kanban, schema, UI pública nem PDF.
>
> **Validation:**
> - `bunx tsc --noEmit`
> - `bunx vitest run`
> - Inspeccionar `product_events` por tipo após reproduzir manualmente uma geração + envio + abertura.
>
> **Constraints:** sem chamadas a providers, sem migrações, sem alterações de schema, fire-and-forget (não bloquear o handler primário).

## Checkpoint

☐ Audit confirmado (Kanban já tem 9 colunas; só `report_viewed` é gravado de facto).
☐ Lifecycle de 11 estados aprovado (auto 1–7, manual 8–11).
☐ Mapa de 9 eventos aprovado.
☐ Decisão: schema fica intacto na Fase 1; alterações mínimas em Fase 3.
☐ Fase 1 (observabilidade) é a próxima a implementar.