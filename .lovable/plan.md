## Causa-raiz do erro "Não foi possível carregar contactos"

O endpoint `/api/admin/leads-kanban` exige o header **`X-Admin-Email`** (lido em `src/lib/admin/session.ts`). Existe um helper `adminFetch` (`src/lib/admin/fetch.ts`) que injeta automaticamente esse header a partir de `localStorage` — é o que o resto do `/admin` usa.

Em `src/routes/admin.beta-leads.tsx` eu chamei `fetch("/api/admin/leads-kanban", { credentials: "include" })` **sem** passar pelo `adminFetch`, por isso o servidor recebe sempre o pedido sem header e devolve 401 — mesmo quando há sessão admin válida no browser. Por isso continua a aparecer "Não foi possível carregar contactos."

(O `/api/admin/snapshot/...` funciona porque outras páginas já usam `adminFetch`, e o cookie `x-admin-email` aparece no header da request — visto na network.)

## Correções

### 1. Pipeline volta a carregar (root cause)

`src/routes/admin.beta-leads.tsx`:
- Importar `adminFetch` de `@/lib/admin/fetch`.
- Substituir `fetch(...)` por `adminFetch(...)` em `fetchLeads()` e `updateLead()`.
- Manter o tratamento de erro 401/403 que já adicionei (caso a sessão expire mesmo).

Resultado: com sessão válida no browser, `useQuery` recebe os leads e o Kanban renderiza. O "Tentar de novo" e o botão "Iniciar sessão" ficam para casos reais de erro.

### 2. Sidebar — adicionar "Tabela" por baixo de "Pipeline"

`src/components/admin/v2/admin-sidebar.tsx`, grupo **Contactos**:

```text
Contactos
  ├─ Pipeline   →  /admin/beta-leads            (vista kanban)
  └─ Tabela     →  /admin/beta-leads?view=tabela
```

Detalhes:
- Ambos os itens apontam para a rota `/admin/beta-leads`. O `view` é uma search param já suportada pela rota.
- Para o estado activo correcto, usar `<Link>` com `search={{ view: "tabela" }}` no item Tabela e `activeOptions={{ exact: false, includeSearch: true }}` (ou um match manual via `useRouterState` lendo `location.search.view`) para que apenas um esteja realçado de cada vez.
- A Tab interna (`TabsList` com Pipeline/Tabela) dentro da página passa a ser redundante visualmente, mas mantém-se para utilizadores que cheguem por link directo. Alinhamos o estado da tab com a search param (já está).

### 3. Sobre o "não copiou nada do outro projecto"

O drag-and-drop entre colunas (padrão do `PipelineView` do CRM Webinar) **foi** portado para o `KanbanBoard` no commit anterior — `draggable` nos cards, `onDragOver/onDrop` nas colunas, diálogo de confirmação e realce visual. Não dava para ver porque o Kanban nem chegava a renderizar (erro 401). Após a correcção (1), o D&D fica visível e funcional.

Não copiei o resto do `PipelineView`/`TableView` da referência porque o modelo de dados é incompatível (`Inscrito` com `plan`/`payment_status`/`webinar` vs `EnrichedLead` com `commercial_status`/`feedback`/`report_request`). Foi escolha alinhada na conversa.

## Validação

- `bunx tsc --noEmit`
- Manual em `/admin/beta-leads`: kanban com leads visível; arrastar card para outra coluna pede confirmação e actualiza `commercial_status`.
- Sidebar: Pipeline e Tabela aparecem como itens distintos; clicar em Tabela navega para `?view=tabela` e activa o item correcto.

## Fora de âmbito

- Nenhuma alteração ao endpoint nem ao schema.
- Não tocar em `requireAdminSession` nem no fluxo de login do `/admin`.
