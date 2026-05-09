## Objetivo

Adicionar um Command Palette leve dentro de `/admin/*` para pesquisar rapidamente leads beta por nome, email, handle Instagram e empresa, abrindo o `LeadDetailSheet` existente.

## Inspeção (read-only)

- Source: `bacfa751-…/src/components/crm/CRMCommandPalette.tsx` — usa `cmdk` (`CommandDialog`/`CommandInput`/`CommandItem`), atalho ⌘K via `keydown`, props `inscritos` + `onSelectInscrito`, tokens webinar (`hsl(var(--ink-*))`) e mocks. **Adoptamos apenas o padrão de UX** (cmdk + ⌘K + lista compacta + footer de atalhos).
- InstaBench:
  - `src/components/ui/command.tsx` (shadcn cmdk) já existe — reutilizar.
  - `src/routes/admin.tsx` é o layout `/admin/*` com `AdminAuthShell`; ponto natural para montar a palette globalmente.
  - `src/routes/admin.beta-leads.tsx` carrega `useQuery(['admin','beta-leads'])` via `/api/admin/leads-kanban` — devolve `EnrichedLead[]` com `name`, `email`, `handle`, `company`. **Reutilizamos esta query** (mesma chave) para evitar endpoint novo: a query é montada quando o admin entra no kanban e fica em cache; a palette consome-a também.
  - `KanbanBoard` mantém `detailLead` num `useState` interno — não há padrão `?lead=<id>`. A maneira mais simples e isolada de abrir a ficha a partir de qualquer rota admin é navegar para `/admin/beta-leads?lead=<id>` e fazer o board reagir a esse search param.

## Decisão

Para manter o trabalho pequeno e respeitar "não tocar no public/relatórios/providers":
- A palette **prefetch+lê** a mesma query `['admin','beta-leads']` que o Kanban já usa. Quando montada fora de `/admin/beta-leads`, dispara `ensureQueryData` na primeira abertura. Custo: 1 GET admin (já existente, sem providers).
- Selecionar uma lead → `navigate({ to: '/admin/beta-leads', search: { lead: id } })`.
- `KanbanBoard` passa a aceitar um `initialDetailLeadId` opcional (vindo do search param) e o route `admin.beta-leads.tsx` lê `useSearch` com `validateSearch` (`{ lead?: string }`), passando o id ao board. Quando a sheet fecha, limpa o param.

## Ficheiros a criar / alterar

1. **Criar** `src/components/admin/v2/admin-command-palette.tsx`
   - Atalho ⌘K / Ctrl+K + ESC (cmdk já trata).
   - Usa `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`.
   - `useQuery({ queryKey: ['admin','beta-leads'], queryFn: fetchLeads, enabled: open })` — mesma chave do kanban; quando o utilizador já lá esteve, há cache imediato.
   - `value` de cada `CommandItem` concatena `name + email + handle + company` para a fuzzy-search interna do cmdk filtrar nos 4 campos.
   - Lista até 50 resultados ordenados por `last_interaction desc`.
   - Item: avatar (1.ª letra do nome), nome, badge `commercial_status` (cor de `getLifecycleMeta`), linha secundária `email · @handle · company`.
   - Estados: loading (placeholder), empty ("Nenhuma lead encontrada"), erro neutro.
   - Footer com kbd ⌘K · ↑↓ · ↵ · ESC.
   - `onSelect` → `navigate({ to: '/admin/beta-leads', search: { lead: id } })` + `setOpen(false)`.
   - Tokens admin (`bg-admin-surface`, `text-admin-text-*`, `border-admin-border`); zero hex hardcoded.

2. **Editar** `src/routes/admin.tsx`
   - Importar `AdminCommandPalette` e renderizá-la dentro de `AdminAuthShell`, ao lado do `<Outlet />` (uma única instância para todo o `/admin/*`).

3. **Editar** `src/routes/admin.beta-leads.tsx`
   - Adicionar `validateSearch: (s): { lead?: string } => ({ lead: typeof s.lead === 'string' ? s.lead : undefined })`.
   - `const { lead: leadParam } = Route.useSearch()` e passar `initialDetailLeadId={leadParam}` ao `KanbanBoard`.
   - Handler `onClearLeadParam` que faz `navigate({ search: {} })` quando a sheet fecha.

4. **Editar** `src/components/admin/v2/beta-leads/kanban-board.tsx`
   - Aceitar `initialDetailLeadId?: string | null` e `onDetailClose?: () => void`.
   - `useEffect` que, sempre que `initialDetailLeadId` mudar, encontra a lead em `leads` e chama `setDetailLead(found)`.
   - Quando a sheet fecha, chamar `onDetailClose?.()` antes de `setDetailLead(null)`.

## Restrições respeitadas

- Sem schema, sem providers, sem alterações ao public report ou geração.
- Sem novo endpoint (reutiliza `/api/admin/leads-kanban`).
- Tokens admin apenas; pt-PT; sem mocks; sem terminologia webinar.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual em qualquer rota `/admin/*`:
  - ⌘K (Mac) / Ctrl+K (Win/Linux) abre a palette.
  - Pesquisa por nome, email, handle, empresa filtra correctamente.
  - ↑↓ navega, ↵ abre `/admin/beta-leads?lead=<id>` e a sheet aparece.
  - ESC fecha a palette; fechar a sheet limpa o `?lead=` do URL.

## Output final pós-implementação

- Source inspecionado.
- Ficheiros alterados (4).
- Comportamento UX descrito.
- Resultado de `tsc` e `vitest`.
