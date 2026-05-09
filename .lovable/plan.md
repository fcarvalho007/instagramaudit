# Fundação CRM para leads beta

Sem envio de emails, sem providers, sem PDF. Apenas estado, eventos e UI clara.

## 1. Mapa final do ciclo de vida (11 estados)

| Estado | Origem | Próxima ação sugerida |
|---|---|---|
| `novo_pedido` | Form beta | Aprovar pedido e gerar relatório |
| `em_analise` | Manual / on generate | Aguardar geração |
| `relatorio_gerado` | Auto após `generate-beta-report` | Enviar link ao lead |
| `link_enviado` | **NOVO** — auto após `send-report-email` | Aguardar visualização |
| `relatorio_visto` | Auto via `report_viewed` | Pedir feedback |
| `feedback_pedido` | Manual | Aguardar resposta |
| `feedback_recebido` | **NOVO** — auto via `feedback_submitted` | Classificar interesse |
| `interessado` | Manual | Agendar chamada / demo |
| `potencial_cliente` | Manual | Enviar proposta |
| `convertido` | Manual | Onboarding |
| `arquivado` | Manual | — |

Estados em falta hoje: `link_enviado`, `feedback_recebido`. Vou adicioná-los à coluna do Kanban e ao `VALID_STATUSES` do PATCH.

## 2. Eventos `product_events`

Já existem em `ALLOWED_EVENTS`: `report_viewed`, `feedback_started`, `feedback_submitted`, `unlock_clicked`, `feedback_requested`, `pricing_clicked`, `public_report_link_copied`, `pro_teaser_clicked`, `email_clicked`, `report_link_sent` (registado server-side em send-report-email).

A adicionar:

- `pricing_option_clicked` — variante mais granular (qual opção foi clicada)
- garantir `report_link_sent` exposto também no whitelist de `trackEvent` para ser disparável pelo cliente (atualmente só server-side)

Não removo nem renomeio nada existente.

## 3. Ficheiros a alterar

### `src/lib/admin/kanban-columns.ts`
- Inserir `link_enviado` (entre `relatorio_gerado` e `relatorio_visto`)
- Inserir `feedback_recebido` (entre `feedback_pedido` e `interessado`)
- Cor coerente com paleta admin

### `src/routes/api/admin/leads-kanban.$id.ts`
- Adicionar os 2 novos valores a `VALID_STATUSES`

### `src/lib/tracking.functions.ts`
- Adicionar `pricing_option_clicked` e `report_link_sent` ao `ALLOWED_EVENTS`

### `src/lib/admin/lead-lifecycle.ts` (NOVO)
Helpers puros, sem efeitos:
- `LIFECYCLE_STATUSES` — array tipado
- `getLifecycleMeta(status)` — `{ label, color, group: 'aquisicao'|'qualificacao'|'comercial'|'arquivado' }`
- `suggestNextLeadAction(lead)` — devolve `{ label, severity }` (move a função `deriveSuggestedStep` actual + cobre os 2 novos estados)
- `mapEventToSuggestedStatus(eventType)` — usado por triggers futuros (Fase 2), mas não dispara nada agora

### `src/lib/admin/lead-events.server.ts` (NOVO)
- `recordLeadEvent({ leadId, eventType, snapshotId?, handle?, metadata? })` — wrapper sobre `recordProductEvent` específico para leads
- `updateLeadCommercialStatus({ leadId, status, source })` — update + emite `lead_status_changed` com metadata da origem (manual/auto)

Apenas import server-side. Não muda behaviour de chamadas existentes (`leads-kanban.$id.ts` continua a funcionar como está; pode opcionalmente migrar para o helper depois).

### `src/components/admin/v2/beta-leads/lead-card.tsx`
- Mostrar pílula compacta da **próxima ação** abaixo do selector de estado (texto curto, ícone Lightbulb, cor neutra)
- Usar `suggestNextLeadAction` em vez de calcular ad-hoc

### `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`
- Substituir `deriveSuggestedStep` por import de `suggestNextLeadAction`
- Adicionar entradas `link_enviado` e `feedback_recebido` em `EVENT_LABELS`/`EVENT_ICONS` (bem como `report_link_sent`, `feedback_requested`, `pricing_option_clicked`)
- Adicionar bloco compacto **"Estado actual"** no topo da secção Inteligência comercial:
  - Estado lifecycle (badge colorida)
  - Último estado do `report_request` (já existe na secção Relatório — apenas eco curto)
  - Link do snapshot mais recente (botão "Abrir relatório" já existe)
  - Último evento (do timeline)
  - Próxima ação (já existe — mantém)

Tudo dentro do que já está renderizado; sem nova API, sem nova query.

## 4. Sem alterações de schema

A tabela `leads.commercial_status` é `text` (sem CHECK) — aceita os 2 novos valores sem migração. `product_events.event_type` também é livre. **Nenhuma migration.**

## 5. Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Smoke manual: abrir `/admin/beta-leads`, abrir sheet, mudar estado para `link_enviado` e `feedback_recebido`, confirmar que a coluna existe e o card aparece.

## 6. Fora de âmbito (Fase 2)

- Triggers SQL para transições automáticas (`report_link_sent` → `link_enviado`, `report_viewed` → `relatorio_visto`, `feedback_submitted` → `feedback_recebido`)
- Campos `last_status_change_at`, `last_event_at`, `first_viewed_at`
- Envio automático de emails de follow-up

Estes ficam para um prompt seguinte, depois desta fundação estar verde.
