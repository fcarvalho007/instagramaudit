# Refinar visual do Kanban /admin/beta-leads (CRM-style)

## Auditoria

**CRM Webinar (`src/components/crm/PipelineView.tsx`, projeto bacfa751):**
- Header de coluna com **strip de cor 1px** no topo + cartão branco com título + pill de contagem
- Cartões: branco, `rounded-[10px]`, `shadow-card`, hover `-translate-y-px` + `shadow-card-md`
- Toolbar: pill-group de filtros (Todos / Pré / Pós) + search à direita
- Mobile: accordion por coluna com chevron rotativo
- Drag & drop nativo HTML5 com `dragOverCol` highlight (azul)

**InstaBench atual (`kanban-board.tsx`, `lead-card.tsx`):**
- Funcional, real Supabase, 11 colunas em `KANBAN_COLUMNS`
- Header: `borderLeft 3px` + bg tinted — visual menos definido que CRM Webinar
- Cards: `AdminCard` com hover-shadow, sem lift, sem topo colorido
- Sem toolbar (search/filtros) ao nível do board
- Sem mobile accordion (apenas scroll horizontal)
- DnD: não existe — mudança via `<Select>` no cartão

**Reusável:** padrão visual do header (strip + pill), elevação dos cards, accordion mobile, toolbar pill-group.
**Não reusável:** mocks `Inscrito`, `WEBINAR_CONFIG`, `WebinarBadge`, `BulkInvoiceButton`, `genderEmoji`, lógica de `payment_status` / `step_reached`.

## Locked files
`/LOCKED_FILES.md` — sem entradas para `beta-leads/*`. Livre para editar.

## Estrutura final do board

11 colunas mantidas (`KANBAN_COLUMNS`, `commercial_status`):
Novo pedido · Em análise · Relatório gerado · Link enviado · Relatório visto · Feedback pedido · Feedback recebido · Interessado · Potencial cliente · Convertido · Arquivado

Toolbar acima do board:
- **Search** (nome, email, handle) — local, no estado
- **Filter chips** pill-group: Todos · Em análise · Com relatório · Com feedback · Potencial cliente · Arquivados
  - mapeiam para subconjuntos de `commercial_status`:
    - "Em análise" → `novo_pedido`, `em_analise`
    - "Com relatório" → `relatorio_gerado`, `link_enviado`, `relatorio_visto`
    - "Com feedback" → `feedback_pedido`, `feedback_recebido`
    - "Potencial cliente" → `interessado`, `potencial_cliente`, `convertido`
    - "Arquivados" → `arquivado`
  - chip activo esconde colunas fora do subset (resto continua a renderizar com 0)

## Mudanças por batch

### Batch 1 — Tokens (admin-tokens.css)
Adicionar tokens neutros de board:
- `--admin-board-column-bg`: `rgb(var(--admin-neutral-50))` (fundo das listas das colunas)
- `--admin-board-card-shadow` / `--admin-board-card-shadow-hover` (sombras card subtis)
- `--admin-board-chip-active-bg`: `rgb(var(--admin-info-500))`
- `--admin-board-chip-active-text`: branco
Sem novos hex hardcoded — só compor sobre tokens existentes.

### Batch 2 — `kanban-board.tsx` (refactor visual)
- Adicionar estado `search` e `filterChip` ('todos' default)
- Top toolbar: `<div>` com pill-group + search input (estilo `admin-input`, h-9, rounded-lg)
- Computar `visibleColumns` por chip e `filteredLeads` por search
- Coluna:
  - wrapper `min-w-[260px] max-w-[280px]` (mais compacto, alinhado com CRM Webinar)
  - **header** com top strip 2px na cor da coluna (`col.color`) + bloco branco com título 13px medium + pill de contagem (bg `col.color` 14% / texto `col.color`)
  - **lista** com fundo `--admin-board-column-bg`, `rounded-b-xl`, padding 8px, min-h 240px, espaço entre cards 8px
- Empty state: ícone subtil + "Sem leads" 12px text-tertiary, sem border dashed pesado
- Mobile (`md:hidden`): accordion — cada coluna num card colapsável com chevron, primeira aberta por defeito
- Desktop (`hidden md:flex`): horizontal scroll dentro do board (`overflow-x-auto`), sem afetar página

### Batch 3 — `lead-card.tsx` (refinar)
- `AdminCard` → div próprio mais leve: `bg-white rounded-[10px] border border-admin-border p-3 shadow-[var(--admin-board-card-shadow)] hover:shadow-[var(--admin-board-card-shadow-hover)] hover:-translate-y-px transition-all`
- Hierarquia compactada:
  - Linha 1: nome (13px medium, truncate) + ações dropdown
  - Linha 2: email (12px text-secondary, truncate)
  - Linha 3: @handle (12px text-tertiary)
  - Linha 4: badges flex-wrap (user_type, report_status, feedback)
  - Linha 5: meta row (€custo · views · há Xd · 📞 se contactado)
  - Removido o `<Select>` inline → mover para dropdown actions ("Mover para…") para reduzir altura. O detalhe completo já está no LeadDetailSheet.
- Próxima ação: linha discreta com Lightbulb 12px só se severity ≠ info
- `onClick` no cartão (excepto dropdown) abre `LeadDetailSheet`

### Batch 4 — Validação
- `bunx tsc --noEmit`
- `bunx vitest run` (existem testes em `__tests__`)
- Manual no preview:
  - `/admin/beta-leads` carrega
  - chips filtram colunas correctamente
  - search filtra cards
  - clique no cartão abre `LeadDetailSheet`
  - `/admin/beta-leads?lead=<id>` continua a abrir directamente
  - mobile 375px: accordion abre/fecha, sem overflow horizontal da página
  - desktop: scroll horizontal contido no board

## Fora de âmbito
- Drag & drop entre colunas (mantém-se dropdown "Mover para…" no menu de ações)
- Schema, providers, emails
- LeadDetailSheet interno (só abertura)
- `commercial_status` lifecycle

## Riscos
- Remover o `<Select>` inline muda fluxo de mudança de status. Mitigação: substituir por item "Mover para…" no `DropdownMenu` com submenu (ou abrir `LeadDetailSheet` que já tem o controlo). Confirmar preferência se for crítico.
- Testes em `__tests__/` podem assumir markup do card — vou verificar e ajustar se quebrarem (apenas o teste, não a lógica).

## Entregáveis
- `src/styles/admin-tokens.css` (novos tokens board)
- `src/components/admin/v2/beta-leads/kanban-board.tsx` (toolbar + colunas refinadas + accordion mobile)
- `src/components/admin/v2/beta-leads/lead-card.tsx` (visual + remover select inline)
- Eventuais ajustes em `__tests__/` se markup mudar
- Resultados `tsc` + `vitest` + checklist manual