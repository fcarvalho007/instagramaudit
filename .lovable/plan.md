# Upgrade visual de `/admin/automacoes` (estilo CRM Webinar, 4 tabs)

## Auditoria

**CRM Webinar — `src/components/crm/AutomationFlowTab.tsx` (projeto bacfa751, 2060 linhas, webinar-specific):**
- Padrão visual reusável (sem lógica de domínio):
  - `DayGroupContainer`: barra lateral colorida + label + badge numérico, agrupa nós de uma fase
  - `ArrowConnector`: seta vertical entre grupos
  - Cartão de nó: ícone à esquerda · título + subtítulo · `Tag` (IMEDIATO / AGENDADO / MANUAL / ENVIADO / ERRO) · coluna direita com contagens ("X enviados", "Y por receber", "Z falhas") + botão "Ver email →"
  - Container central `max-w-[800px] mx-auto`
- Não reutilizável: `WEBINAR_CONFIG`, `Inscrito`, `MessageLog`, `EmailRecipientsDrawer`, edge functions `send-video-*`, SMS, `WebinarContext`, `BulkInvoiceButton`, qualquer texto "webinar/masterclass/premium pass".

**InstaBench atual:**
- `src/routes/admin.automacoes.tsx` → `AutomationFlowPage` (read-only)
- `src/components/admin/v2/automacoes/{automation-flow-page,automation-node,automation-edge,eligibility-summary}.tsx`
- API `/api/admin/automation-flow` devolve 7 fluxos com `eligibleCount`, `inFlightCount`, `completedCount`, `recentFailures`, `last24hCount`, `lastEventAt`, `eventTypes`
- 5 templates em `src/lib/email/templates/` (`request-received`, `report-ready`, `feedback-request`, `personal-area-saved`, `commercial-followup`)
- Email Lab: `src/components/admin/v2/email-lab/email-lab-page.tsx` já tem registry `TEMPLATES` com `wired`/`wiredAt`/`render()` — fonte de verdade para a tab Templates

**LOCKED_FILES.md:** ficheiro não existe na raiz. Sem entradas a respeitar.

## Estrutura final da página

Header `Automações · Visualização operacional do ciclo de vida beta` + `Tabs` (shadcn) com 4 separadores:

```
[ Fluxo ]  [ Métricas ]  [ Pessoas ]  [ Templates ]
```

### Tab 1 — Fluxo (default)
- Mantém os 7 cartões de fluxo (`pedido_recebido` … `follow_up_comercial`)
- Agrupa visualmente em 3 fases CRM (apenas visual, lógica intacta):
  - **Captação** (verde-azulado): `pedido_recebido`, `relatorio_gerado`
  - **Entrega** (azul): `link_enviado`, `relatorio_visto`
  - **Conversão** (âmbar): `feedback_pedido`, `feedback_recebido`, `follow_up_comercial`
- Cada grupo num `StageGroup` (novo): barra lateral 3px na cor da fase + header com nome da fase + número + contador agregado de elegíveis
- `AutomationEdge` actual continua a separar nós dentro do grupo; `StageConnector` (novo) entre grupos
- Cartão de nó (`automation-node.tsx`) recebe pequeno refinamento: tag de status à esquerda do título (Automático/Manual/Aguarda/Erro), botão "Ver template →" só quando `action.kind === 'email'` linkando `/admin/email-lab?template=<key>` (read-only)

### Tab 2 — Métricas
Reusa o mesmo `data` (sem fetch novo). Grelha de cards:
- KPIs topo: Leads ativas · Aguardam ação · Em curso · Arquivadas (já existe `EligibilitySummary` — mover para esta tab)
- "Últimos 24h por fase": lista compacta com `last24hCount` por fluxo
- "Falhas (7d) — entrega de link": valor único (`linkFailures7d`)
- "Última atividade por fase": tabela 2 colunas (fase → relativo)
- Sem charts pesados.

### Tab 3 — Pessoas
- Lista compacta de leads elegíveis por fase
- Reusa `/api/admin/leads-kanban` (já existe no kanban) — sem novo endpoint
- Para cada uma das 7 fases: secção com label + até 5 leads (nome · email · handle · "há X") · botão "Abrir →" que navega para `/admin/beta-leads?lead=<id>` (já suportado)
- Vazio: "Sem leads nesta fase"
- Mobile: stack vertical

### Tab 4 — Templates
- Reusa o registry `TEMPLATES` de `email-lab-page.tsx` (extraído para `src/lib/admin/email-template-registry.ts` para partilhar)
- Mapeia também `personal-area-saved` (existe em `src/lib/email/templates/personal-area-saved.ts`)
- Para cada template (5 entradas): cartão com
  - Título + key interna (`request_received`, etc.)
  - Badge `Wired` (verde) ou `Orphan` (cinza) com tooltip do `wiredAt`
  - Variáveis (lista compacta key=value)
  - Botão "Pré-visualizar →" → `/admin/email-lab?template=<key>` (read-only, já existe)
  - Botão "Editar (em breve)" disabled
- Sem edição de DB. Sem envio.

## Mudanças por batch

### Batch 1 — Extrair registry de templates
- Mover constante `TEMPLATES` de `email-lab-page.tsx` para `src/lib/admin/email-template-registry.ts` exportando `EMAIL_TEMPLATES`, tipo `EmailTemplateEntry`, `getTemplateByKey()`. Adicionar entrada `personal_area_saved`.
- `email-lab-page.tsx` passa a importar do registry (mudança transparente, sem alterar UI).

### Batch 2 — Refactor da página em tabs
- `automation-flow-page.tsx` substitui o layout actual por `<Tabs defaultValue="fluxo">` (shadcn) + 4 `<TabsContent>`
- Mantém o `useQuery` ao `/api/admin/automation-flow`
- `Fluxo`: novo wrapper `<StageGroup>` agrupando os nós em 3 fases
- `Métricas`: nova subview com `EligibilitySummary` + `MetricsGrid`
- `Pessoas`: nova subview que faz `useQuery(['admin','beta-leads'])` e agrupa por `commercial_status`
- `Templates`: nova subview que mapeia `EMAIL_TEMPLATES`

### Batch 3 — Componentes novos
- `src/components/admin/v2/automacoes/stage-group.tsx` — wrapper visual com bg subtil + barra lateral colorida + header (label + nº + contador agregado)
- `src/components/admin/v2/automacoes/stage-connector.tsx` — seta vertical entre grupos
- `src/components/admin/v2/automacoes/metrics-tab.tsx`
- `src/components/admin/v2/automacoes/people-tab.tsx`
- `src/components/admin/v2/automacoes/templates-tab.tsx`
- `automation-node.tsx`: adicionar tag `Automático/Manual/Erro` mais proeminente à esquerda + botão "Ver template →" quando `action.kind === 'email'`

### Batch 4 — Validação
- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual:
  - `/admin/automacoes` carrega na tab `Fluxo`
  - todos os 4 separadores trocam sem refetch desnecessário
  - `Templates` mostra 5 entradas com badge wired/orphan correcto
  - botão "Pré-visualizar" navega para `/admin/email-lab?template=<key>`
  - `Pessoas` lista leads por fase e "Abrir →" abre `LeadDetailSheet` em `/admin/beta-leads`
  - `Métricas` mostra KPIs e "últimos 24h"
  - mobile 411px: tabs scrollam horizontalmente sem partir layout, cartões empilham
  - nenhum botão envia email ou executa automação

## Fora de âmbito
- Execução de automações, envio de emails, providers
- Edição de templates em DB
- Schema, lifecycle de leads
- Charts complexos
- Importar `Inscrito`, `WEBINAR_CONFIG`, `MessageLog`, SMS, `WebinarContext`

## Riscos
- **Tab `Pessoas` reutiliza `/api/admin/leads-kanban`**: já carrega todos os leads — para volumes pequenos (beta) é OK. Limitamos a 5 por fase no client. Sem novo endpoint.
- **Refresh de templates**: o registry é estático no código (não vem da DB). Manter assim — alinhado com o estado actual do Email Lab.
- **`AutomationEdge` actual**: continua a ser usada dentro de cada grupo. `StageConnector` entre grupos é estilo distinto (seta com label da fase seguinte).

## Entregáveis
- `src/lib/admin/email-template-registry.ts` (novo)
- `src/components/admin/v2/email-lab/email-lab-page.tsx` (passa a importar do registry)
- `src/components/admin/v2/automacoes/automation-flow-page.tsx` (refactor para Tabs)
- `src/components/admin/v2/automacoes/automation-node.tsx` (tag + "Ver template →")
- `src/components/admin/v2/automacoes/stage-group.tsx` (novo)
- `src/components/admin/v2/automacoes/stage-connector.tsx` (novo)
- `src/components/admin/v2/automacoes/metrics-tab.tsx` (novo)
- `src/components/admin/v2/automacoes/people-tab.tsx` (novo)
- `src/components/admin/v2/automacoes/templates-tab.tsx` (novo)
- Resultados `tsc` + `vitest` + checklist manual