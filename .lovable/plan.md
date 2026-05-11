## Auditoria — Consolidação CRM (`/admin/beta-leads`) — read-only

`bunx tsc --noEmit` → **PASS** (0 erros)
`bunx vitest run` → **PASS** (31 ficheiros, 334 testes)

### Checklist

#### 1. Sidebar (`src/components/admin/v2/admin-sidebar.tsx`)
- ✅ Sem entrada "Clientes" mock — não existe item para `/admin/clientes` na navegação primária.
- ✅ Sem "Pedidos" como item primário — `/admin/beta-requests` não está na sidebar.
- ✅ Group label claro: **"Contactos"** (eyebrow) com itens "Pipeline" e "Tabela".
- ✅ "Pipeline" visível e aponta para `/admin/beta-leads` (sem `view`, default = pipeline).
- ✅ "Tabela" aponta para `/admin/beta-leads` com `search={ view: "tabela" }`; estado activo desambiguado por `matchView` na lógica `isActive` (linhas 146-158).

#### 2. `/admin/beta-leads` (`src/routes/admin.beta-leads.tsx`)
- ⚠️ **Título da página é "Contactos"** (linha 164), não "Pipeline" como no enunciado da auditoria. Decidir intencionalidade — ver "Issues" abaixo.
- ✅ Não há texto "Beta Leads" visível no UI da rota nem no `AdminPageHeader`.
- ✅ Tab Pipeline renderiza `<KanbanBoard leads={leads} … />` com dados reais de `/api/admin/leads-kanban` (sem mocks).
- ✅ Tab Tabela renderiza `<LeadsTable leads={leads} … />` — mesma fonte, mesmo array; nenhum hardcode numérico.
- ✅ `?lead=<id>` abre `LeadDetailSheet` via `activeLead` derivado do search param (linhas 151-154, 234-241).
- ✅ Clique no card chama `onOpenDetail={openDetail}` → `setActiveLeadId` → atualiza URL → abre sheet.
- ✅ Clique na linha da tabela usa o mesmo `openDetail`.
- ✅ `validateSearch` aceita `view: "pipeline" | "tabela"` e ignora outros valores.

#### 3. `/admin/clientes` (`src/routes/admin.clientes.tsx`)
- ✅ Não está na sidebar.
- ✅ É **redirect** server-side (`beforeLoad → throw redirect({ to: "/admin/beta-leads", replace: true })`) — não há números fake porque o componente nunca renderiza.

#### 4. `/admin/beta-requests` (`src/routes/admin.beta-requests.tsx`)
- ✅ Não está na sidebar.
- ✅ Continua acessível por URL directa (utilitário). Página intacta.
- ✅ Sem imports partidos (tsc passa). Topbar mantém label "Pedidos de relatório" (`admin-topbar.tsx:25`) para mostrar título correcto se alguém aceder via URL.

#### 5. Command palette (`src/components/admin/v2/admin-command-palette.tsx`)
- ❌ **Não tem entradas de página**. Hoje só pesquisa leads (resultados vão para `/admin/beta-leads?lead=<id>`). "Pipeline" e "Tabela / Contactos" como atalhos de navegação não estão implementados. Pesquisar "Pipeline" no palette **não funciona** como navegação.
- ✅ Nenhum resultado primário aponta para `/admin/clientes`.

#### 6. Mobile (375px)
- ✅ `TabsList` com 2 triggers cabe sem overflow a 375px (largura mínima ~28ch).
- ✅ `LeadsTable`: container tem `overflow-hidden` no card e `overflow-x-auto` no wrapper interno (`leads-table.tsx:235`) — tabela faz scroll horizontal sem partir layout.
- ✅ `LeadDetailSheet` é `Sheet` do shadcn (lateral) → continua usável; URL `?lead=<id>` continua a abrir o mesmo sheet em mobile.

### Issues encontradas

| # | Severidade | Local | Problema |
|---|-----------|-------|----------|
| 1 | Média | `admin.beta-leads.tsx:164` | Título da página é "Contactos" mas a auditoria espera "Pipeline". A sidebar tem item "Pipeline" + "Tabela" sob o group "Contactos", o que sugere que o título correcto da **página** devia espelhar o item activo (Pipeline / Tabela) ou ficar simplesmente "Contactos". O actual "Contactos" é coerente com o group label. |
| 2 | Baixa | `admin-command-palette.tsx` | Faltam entradas de navegação no palette (Pipeline, Tabela). O palette atual só tem leads — pesquisar "Pipeline" devolve `Nenhuma lead encontrada`. |
| 3 | Cosmética | `admin-topbar.tsx:24` | Mapeamento `"/admin/beta-leads": "Contactos"` — está alinhado com o título da página, mas se decidirmos mudar o título para "Pipeline / Tabela" dinâmico, o topbar tem de seguir. |

### Recomendação de fixes (não aplicar agora — fora do scope read-only)

1. **Decidir título canónico de `/admin/beta-leads`** entre três opções:
   - (A) Manter "Contactos" — coerente com group label da sidebar. Recomendada.
   - (B) Trocar para "Pipeline" / "Tabela" dinâmico baseado em `view`. Mais explícito mas duplica info da tab activa.
   - (C) "Contactos · Pipeline" / "Contactos · Tabela" — verboso, evitar.
2. **Adicionar página-shortcuts ao command palette**: novo `CommandGroup heading="Páginas"` com items para Pipeline (`/admin/beta-leads`), Tabela (`/admin/beta-leads?view=tabela`), Visão geral, Receita, Relatórios, etc. Custo trivial; melhora UX.
3. **Manter `/admin/clientes` como redirect** indefinidamente para preservar bookmarks. Não apagar.
4. **Considerar mover `/admin/beta-requests` para sub-area** "Operações" se voltarmos a precisar dele com frequência; por agora, utilitário escondido é aceitável.

### Veredicto global

**PASS condicional.** Os pontos críticos (sidebar limpa, sem mocks, redirect de `/admin/clientes`, deep-link `?lead=<id>`, mobile usável, build verde) estão verificados. Faltam apenas:
- decisão sobre o título "Contactos" vs "Pipeline" (cosmética / linguística);
- atalhos de página no command palette (UX, não bloqueador).
