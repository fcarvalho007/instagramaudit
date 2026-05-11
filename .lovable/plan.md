# Consolidação CRM admin — Contactos com vistas Pipeline e Tabela

## 1. Nova navegação (sidebar)

**Grupo "Negócio"**
- Visão geral
- Receita
- ~~Clientes~~ (removido — era mock; conteúdo absorvido pelo Pipeline real)

**Grupo "Pipeline"** (renomear para **"Contactos"**)
- ~~Leads~~ → **Pipeline** (`/admin/beta-leads`, mesma URL)
- ~~Pedidos~~ (removido do sidebar; rota mantém-se acessível via deep-link/command palette)
- Automações

**Grupos restantes**: Produto, Laboratório, Sistema — sem alterações.

Resumo:
- Sidebar passa de 12 para 10 itens.
- "Pedidos" deixa de ser item primário; visível dentro da ficha de contacto (tab Relatório, já existe).
- "Clientes" mock-only desaparece do sidebar.

## 2. Rotas

| Rota | Antes | Depois |
| --- | --- | --- |
| `/admin/beta-leads` | "Beta Leads" (Kanban) | **"Pipeline"** com tabs Pipeline + Tabela |
| `/admin/beta-requests` | "Pedidos" (sidebar) | mantida, **fora do sidebar** (acessível por command palette + links existentes) |
| `/admin/clientes` | "Clientes" mock (sidebar) | **removida do sidebar**; ficheiro de rota e componentes mock mantidos para não partir histórico (sem links de entrada) — eliminação real fica para fase de cleanup |

URLs mantidas para não partir links externos / command palette / `automacoes/people-tab`.

## 3. `/admin/beta-leads` — nova estrutura

`AdminPageHeader`:
- title: **"Pipeline"**
- subtitle: **"Acompanha contactos desde o primeiro relatório até à conversão."**
- (manter contagem `N leads · N ativos` como linha secundária ou descartar — proponho descartar para alinhar com copy pedida; contagem fica visível dentro do Kanban)

Abaixo do header, `Tabs` (`@/components/ui/tabs`) com dois separadores:

### Tab "Pipeline"
- Renderiza o `KanbanBoard` existente, sem alterações de comportamento.
- Mantém: `lead-card`, badges de feedback, próxima ação, indicadores de comunicação.
- Mantém deep-link `?lead=<id>` que abre `LeadDetailSheet`.

### Tab "Tabela"
- Novo componente `LeadsTable` (`src/components/admin/v2/beta-leads/leads-table.tsx`).
- Recebe os mesmos `EnrichedLead[]` da query `["admin", "beta-leads"]` (sem fetch novo).
- Colunas:
  - Nome
  - Email
  - Instagram (handle do último relatório)
  - Estado (badge de `commercial_status`, reutilizar `status-badge`)
  - Último relatório (data + nome do report)
  - Último email (data + tipo, do `lead-communication-timeline` data source)
  - Feedback (ícone/badge via `interpretFeedback`)
  - Criado em
  - Ações (botão "Abrir" → abre `LeadDetailSheet`)
- Linha clicável → abre o mesmo `LeadDetailSheet` via estado local (já suportado pelo `KanbanBoard`; extraio o controlo de sheet para o nível da página para o partilhar entre as duas tabs).
- Tabela usa primitivos shadcn `Table` + tokens admin (`--admin-*`). Mobile-first: scroll horizontal numa wrapper `overflow-x-auto`.

### Estado partilhado
- O `LeadDetailSheet` é içado para a `BetaLeadsPage` (atualmente vive dentro de `KanbanBoard`).
- Ambas as tabs disparam `setActiveLeadId(id)`; sheet único renderizado no fim da página.
- Search param `?lead=` continua a funcionar.
- Tab ativa controlada por search param `?view=pipeline|tabela` (default: `pipeline`) para deep-link e refresh-safe.

## 4. Ficha de contacto (LeadDetailSheet)

Sem alterações. Tabs já existentes:
- Resumo
- Relatório (cobre "Pedidos" — request status, PDF, ações)
- Feedback
- Comunicação
- Histórico

Esta é a justificação para tirar "Pedidos" do sidebar primário.

## 5. Topbar / breadcrumbs

`admin-topbar.tsx`:
- Atualizar mapa de títulos:
  - `/admin/beta-leads`: `"Leads"` → `"Pipeline"`
  - `/admin/beta-requests`: `"Pedidos"` → `"Pedidos (utilitário)"` (ou apenas manter "Pedidos"; não aparece no sidebar mas pode ser deep-linked)
- Remover qualquer referência visível a "Beta".

## 6. Command palette

`admin-command-palette.tsx` mantém `/admin/beta-leads?lead=<id>`. Adicionar entradas:
- "Pipeline" → `/admin/beta-leads?view=pipeline`
- "Contactos · Tabela" → `/admin/beta-leads?view=tabela`
- Manter "Pedidos" como utilitário (deep link para `/admin/beta-requests`).

## 7. Ficheiros a alterar / criar

**Alterar**
- `src/components/admin/v2/admin-sidebar.tsx` — remover `/admin/clientes` e `/admin/beta-requests`; renomear "Leads" → "Pipeline"; renomear grupo "Pipeline" → "Contactos".
- `src/components/admin/v2/admin-topbar.tsx` — atualizar labels.
- `src/components/admin/v2/admin-command-palette.tsx` — entradas para vistas.
- `src/routes/admin.beta-leads.tsx` — adicionar `Tabs`, gerir `?view=`, içar `LeadDetailSheet`, novo header copy.
- `src/components/admin/v2/beta-leads/kanban-board.tsx` — tornar abertura do sheet controlada do exterior (props `activeLeadId` + `onActiveLeadChange`), mantendo fallback interno se não vier prop.

**Criar**
- `src/components/admin/v2/beta-leads/leads-table.tsx` — nova tabela.
- `src/components/admin/v2/beta-leads/__tests__/leads-table.test.tsx` — testes de render e click → callback.

**Não tocar**
- `src/routes/admin.clientes.tsx` e `src/components/admin/v2/clientes/*` — apenas deixam de ter entrada de sidebar. Cleanup numa fase posterior.
- `src/routes/admin.beta-requests.tsx` — intacto.
- `LeadDetailSheet`, `lead-card`, `lead-communication-timeline`, `commercial-followup-dialog`, `kanban-columns`.
- BD, Brevo, providers, public report, `src/styles.css`.

## 8. Constraints respeitados

- Sem alterações de schema.
- Sem chamadas a providers, sem envio de emails.
- Reutiliza componentes existentes (Kanban, LeadDetailSheet, status-badge, feedback-intent).
- Mobile-first: tabs shadcn responsivas; tabela em wrapper com scroll horizontal.
- Apenas tokens semânticos `--admin-*` (sem hardcoded colors, sem slate-*).

## 9. Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (incluindo novo teste de `leads-table`)
- Manual:
  1. Sidebar mostra "Pipeline" sob grupo "Contactos"; sem "Leads", "Pedidos", "Clientes".
  2. `/admin/beta-leads` carrega com header "Pipeline" e subtítulo correto.
  3. Tab Pipeline mostra Kanban como hoje.
  4. Tab Tabela mostra os mesmos leads em formato tabular.
  5. Clicar linha ou card abre `LeadDetailSheet` em ambas as tabs.
  6. `?lead=<id>` continua a abrir o sheet.
  7. Nenhum título admin contém "Beta".
  8. `/admin/beta-leads` não erra ao carregar dados (query mantida).

## 10. Fora desta fase

- Eliminar fisicamente `/admin/clientes` e componentes mock.
- Mover `/admin/beta-requests` para `/admin/sistema/pedidos` (renomeação de URL).
- Filtros e search na tab Tabela (próxima iteração).
- Persistência da preferência `?view=` por utilizador.

☐ Aprovas para implementar?
