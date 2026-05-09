## Página de Automações — alinhar com a especificação dos 7 nós

### Descoberta

A página `/admin/automacoes` **já existe e está funcional**, com a mesma arquitetura modular descrita no pedido:

- `src/routes/admin.automacoes.tsx` — rota
- `src/components/admin/v2/automacoes/automation-flow-page.tsx` (156L) — página
- `src/components/admin/v2/automacoes/automation-node.tsx` (191L) — cartão de nó
- `src/components/admin/v2/automacoes/automation-edge.tsx` (33L) — conector
- `src/components/admin/v2/automacoes/eligibility-summary.tsx` (45L) — sumário no topo
- `src/routes/api/admin/automation-flow.ts` (203L) — endpoint read-only

Comportamento atual:
- Lê `leads.commercial_status` via Supabase admin (sem providers, sem mutações, sem emails)
- Mostra para cada nó: título, descrição, `Trigger` (form/event/manual), `Ação` (email/manual/wait/classify), badge do estado destino, três contagens (elegíveis, em curso, concluídos)
- Reusa `getLifecycleMeta` e `LIFECYCLE_STATUSES` de `lib/admin/lead-lifecycle.ts`
- Tokens `--admin-*` apenas, pt-PT, mobile-first, sem botões de execução
- Banner "Read-only" no topo

### Lacunas face ao pedido

1. **6 nós em vez de 7**: o atual junta "Relatório gerado" + "Link enviado" num único nó "Relatório pronto" (elegíveis em `relatorio_gerado`, ação "Enviar link"). O pedido especifica os dois passos separados: um para a geração do relatório (manual/admin), outro para o envio do link (manual/admin, com email).
2. **Badge `Automático` / `Manual` explícito**: hoje há tags de `Trigger` e `Ação` por tipo, mas não um badge dedicado para classificar o nó como automático ou manual conforme a coluna "Type" da especificação.
3. **`recent failures` por nó**: não é atualmente apresentado. O pedido lista-o como campo por nó.

### Mudança proposta (mínima, focada)

**Ficheiros tocados:** 3.

#### `src/routes/api/admin/automation-flow.ts` (API)
- Adicionar campo `kind: 'automatic' | 'manual'` ao tipo `AutomationFlow`.
- Dividir o nó `relatorio_pronto` em dois:
  - `relatorio_gerado` — title "Relatório gerado", trigger `event: report_generated`, action `manual: Admin gera relatório`, kind `manual`, target `relatorio_gerado`, eligible = `countEq('em_analise')`, completed = `countAtLeast('relatorio_gerado')`.
  - `link_enviado` — title "Link enviado", trigger `manual: Admin envia link`, action `email: Email "relatório pronto"`, kind `manual`, target `link_enviado`, eligible = `countEq('relatorio_gerado')`, completed = `countAtLeast('link_enviado')`.
- Marcar os restantes nós conforme a especificação:
  - `pedido_recebido` → `automatic`
  - `relatorio_visto` → `automatic`
  - `feedback_pedido` → `manual`
  - `feedback_recebido` → `automatic`
  - `follow_up_comercial` → `manual` (futuro)
- Adicionar `recentFailures: number` por nó. Calcular via uma query agregada extra a `product_events` últimos 7d:
  - `link_enviado.recentFailures` = count de `product_events.event_type IN ('email_failed','email_bounced')` últimos 7 dias com `metadata.context = 'send_link'` (ou apenas `email_failed`/`email_bounced` agrupados por `metadata.kind`); fallback: total de falhas de email recentes atribuídas ao envio do link.
  - `feedback_pedido.recentFailures` = mesmo, filtrado por contexto `feedback_request`.
  - Para os outros nós: `0` (não há ações de email envolvidas).
  - Se a query falhar ou a coluna `metadata` não tiver as chaves, devolver `0` silenciosamente; nunca quebrar a página.

#### `src/components/admin/v2/automacoes/automation-node.tsx`
- Acrescentar prop `kind: 'automatic' | 'manual'` e prop opcional `recentFailures?: number`.
- Renderizar **badge** de tipo na linha de tags ("Automático" cyan / "Manual" amarelo, usando os mesmos tokens admin já presentes no node).
- Quando `recentFailures > 0`, mostrar uma pequena pílula vermelha "N falhas recentes (7d)" usando `--admin-signal-danger`. Ocultar quando 0.

#### `src/components/admin/v2/automacoes/automation-flow-page.tsx`
- Passar os novos campos (`kind`, `recentFailures`) ao `AutomationNode`. Sem alterações estruturais.

### Restrições respeitadas

- Sem schema changes, sem nova tabela, sem mutações, sem emails, sem providers.
- Endpoint mantém-se read-only e gated por `requireAdminSession`.
- Sem botões de execução, sem editor, sem mocks.
- Sem alterações em rotas públicas, em `/report.example`, ou em ficheiros locked.
- Tokens `--admin-*` apenas; pt-PT, AO90.
- Mobile-first preservado (cards fluidos já existentes).

### Validação

1. `bunx tsc --noEmit` → 0 erros.
2. `bunx vitest run` → 163/163.
3. Manual em `/admin/automacoes`:
   - 7 nós na ordem: Pedido recebido · Relatório gerado · Link enviado · Relatório visto · Feedback pedido · Feedback recebido · Follow-up comercial.
   - Cada nó com badge "Automático" ou "Manual" conforme a especificação.
   - Contagens de elegíveis batem com o Kanban (somar coluna por estado).
   - Pílula de falhas recentes só aparece quando há `email_failed`/`email_bounced` registados nos últimos 7d para os nós de email.
   - Banner read-only continua visível; nenhum botão "Enviar"/"Gerar"/"Reenviar" no DOM.
   - 411px: cards e tags não dão overflow horizontal.

### Fora de âmbito (próxima fase)

O que se torna editável depois desta fase de leitura:
- Templates de email por nó (pré-visualização e edição).
- Disparo manual a partir do nó (ex.: "Enviar link aos N elegíveis"), reutilizando endpoints `/api/admin/send-report-link` e `/api/admin/send-feedback-request` já existentes.
- Regras opcionais de envio automático (ex.: link automático após `relatorio_gerado` + 24h).
- Ligação a `follow-ups` heurísticos para sugerir a ação no nó certo.
- Histórico de execução por nó (drilldown para `product_events` filtrado).