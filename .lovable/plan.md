## Diagnóstico atual `/admin/beta-leads` (Contactos)

Validações automáticas: `bunx tsc --noEmit` ✅ 0 erros. Sem ruído de runtime nos logs.

Vistas Pipeline + Tabela renderizam, abertura de ficha partilhada via `?lead=` funciona, e a URL persiste a vista (`?view=`).

### Pontos a refinar (UX / coerência)

1. **Tabela não tem filtros.** Pediste explicitamente "Tabela com filtros". O Kanban tem `FILTER_CHIPS` (Todos / Em análise / Com relatório / Com feedback / Potencial / Arquivados) e a Tabela não tem nada — fica incoerente entre as duas vistas.
2. **Não há pesquisa.** Em vista de tabela espera-se um campo de search por nome, email ou @handle.
3. **Header diz "Pipeline" mas a área é "Contactos".** Quando estás na aba Tabela o título "Pipeline" passa a estranho. Subtítulo está bom.
4. **Coluna "Ações" é redundante** — a linha inteira já é clicável e abre a ficha. O botão "Abrir" duplica a ação e adiciona ruído visual.
5. **Sem totalizador.** Falta um "X contactos" discreto junto às tabs ou ao filtro, para feedback de quantos resultados estão visíveis (especialmente após filtrar).
6. **Estado vazio depende do filtro.** Hoje o empty-state diz "Sem contactos para mostrar" — após filtrar deve dizer "Nenhum contacto corresponde aos filtros" para distinguir lista vazia de filtro restritivo.

## Plano de refinamento

Apenas frontend, sem alterações de schema, sem novos endpoints, sem mexer no Kanban.

### 1. `admin.beta-leads.tsx`
- Mudar `title="Pipeline"` → `title="Contactos"`. Manter subtítulo.
- (Opcional) Mostrar contador `{leads.length} contactos` no `AdminPageHeader` via prop existente — só se já existir; senão deixar para a barra de filtros da tabela.

### 2. `leads-table.tsx` — adicionar barra de filtros + search
Nova faixa acima da `<Table>`, dentro do mesmo card branco:

```text
┌─────────────────────────────────────────────────────────────┐
│ [🔍 Pesquisar nome, email, @handle]   [chips de estado…]    │
│                                              42 contactos   │
├─────────────────────────────────────────────────────────────┤
│ Tabela …                                                    │
└─────────────────────────────────────────────────────────────┘
```

- **Search input** controlado (estado local `query`), filtra `name`, `email`, `handle` (case-insensitive).
- **Chips de estado** reutilizam exatamente o mesmo array `FILTER_CHIPS` do Kanban — extrair para `src/lib/admin/lead-filter-chips.ts` (novo, ~30 linhas) para evitar duplicação. Kanban e Tabela passam a importar da mesma fonte.
- **Contador** `N contactos` (ou `N de M` quando há filtro ativo) à direita da barra, em `text-[12px] text-admin-text-tertiary`.
- Filtros são **estado local da tabela** (não vão para a URL nesta fase) — mantém URL limpa e evita conflitos com `?view=` e `?lead=`. Se quiseres persistir na URL, dizes e fazemos numa fase 2.

### 3. `leads-table.tsx` — limpeza de colunas
- Remover coluna **Ações** + botão "Abrir". A linha continua clicável (`onClick` no `<TableRow>`) e tem `cursor-pointer`. Manter `aria-label` na row para acessibilidade.
- Manter ordem: Nome · Email · Instagram · Estado · Último relatório · Último email · Feedback · Criado em.

### 4. Empty states diferenciados
Dentro de `LeadsTable`:
- `leads.length === 0` → "Sem contactos para mostrar." (mantém atual)
- `filtered.length === 0 && leads.length > 0` → "Nenhum contacto corresponde aos filtros." + botão ghost "Limpar filtros" que reset `query` e chip ativo para `todos`.

### 5. Tokens e tipografia
- Search input: `bg-white border border-[var(--color-admin-border)] rounded-md h-9 text-[13px]` + ícone `Search` lucide à esquerda.
- Chips: replicar exatamente o estilo dos chips do Kanban (mesma cor de ativo, mesmo radius) para coerência visual entre vistas.
- Sem cores hardcoded — só tokens `--admin-*` e `text-admin-text-*` já existentes.

## Ficheiros afetados

- **Editar** `src/routes/admin.beta-leads.tsx` — mudar título "Pipeline" → "Contactos".
- **Editar** `src/components/admin/v2/beta-leads/leads-table.tsx` — adicionar barra search + chips, remover coluna Ações, empty states diferenciados.
- **Editar** `src/components/admin/v2/beta-leads/kanban-board.tsx` — passar a importar `FILTER_CHIPS` do novo ficheiro partilhado (refactor, sem mudança de comportamento).
- **Criar** `src/lib/admin/lead-filter-chips.ts` — fonte única de chips + helper `matchesChip(lead, key)`.
- **Criar** `src/components/admin/v2/beta-leads/__tests__/leads-table.test.tsx` — testes de filtro/search/empty-state.

## Fora de âmbito

- Sem alterações no `LeadDetailSheet`, `LeadCard`, `KanbanBoard` (apenas o import dos chips muda).
- Sem alterações na sidebar / topbar / command palette.
- Sem alterações no DB, providers, Brevo, ou rotas públicas.
- Sem persistência de filtros na URL nesta fase.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (incluindo novo teste `leads-table.test.tsx`)
- Manual: search filtra ao vivo; chips alternam; combinação search+chip funciona; empty-state correto; clicar linha abre ficha; mudar para Pipeline e voltar mantém vista; tabs rapidas sem flicker.

## Checklist de aceitação

- ☐ Header diz "Contactos"
- ☐ Tabela tem search por nome/email/handle
- ☐ Tabela tem os mesmos chips do Kanban (fonte única)
- ☐ Coluna Ações removida; row continua clicável
- ☐ Contador "N contactos" visível
- ☐ Empty state diferencia lista vazia vs filtro vazio
- ☐ `tsc` e `vitest` passam
