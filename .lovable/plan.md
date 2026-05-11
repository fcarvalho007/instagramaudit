## Objetivo

Reorganizar a sidebar `/admin`, melhorar o diagnóstico do erro no Pipeline de Contactos, e portar drag-and-drop entre colunas do projeto referência (CRM Webinar) para o Kanban do InstaBench.

---

## 1. Sidebar `/admin` (`src/components/admin/v2/admin-sidebar.tsx`)

**a)** Mover `Automações` para a categoria **Laboratório**, posicionado **por cima** de `Email Lab`.
**b)** Renomear `Email Lab` → **`Templates Email + SMS`**.

Resultado dos grupos:

```text
Negócio          Visão geral · Receita
Contactos        Pipeline
Produto          Relatórios · Perfis · Conhecimento
Laboratório      Report Lab · Automações · Templates Email + SMS
Sistema          Sistema
```

Notas:
- O grupo `Contactos` fica só com `Pipeline` (a tabela continua como tab dentro de `/admin/beta-leads`, não como item de sidebar separado, já que partilham a mesma rota com `?view=tabela`).
- Adicionar `Zap` à lista de imports do Lucide já existente (já está) e remover do bloco `Contactos`.

---

## 2. Auditoria Contactos — diagnóstico do erro do Pipeline

**Causa identificada:** `/api/admin/leads-kanban` devolve **401 `UNAUTHENTICATED`** quando não há sessão admin (cookie/email). Em `src/routes/admin.beta-leads.tsx`, o `fetchLeads` faz apenas `throw new Error("Falha ao carregar leads")` e a UI mostra a mesma mensagem genérica para qualquer falha.

**Correções (ficheiro: `src/routes/admin.beta-leads.tsx`):**

- `fetchLeads()` passa a:
  - ler `res.status` e `res.json()` (best-effort) e atirar um `Error` enriquecido com `{ status, code, message }`.
- O bloco de erro na UI distingue:
  - **401/403** → mensagem clara *"Sessão de admin expirada ou em falta"* + botão **"Iniciar sessão"** com `<Link to="/admin">` (ou `/login` conforme o fluxo atual de admin).
  - **outros** → *"Não foi possível carregar contactos."* + botão **"Tentar de novo"** (`queryClient.invalidateQueries`).
- Mostrar o `status` e `code` em pequeno como `text-eyebrow-sm` para o admin reconhecer rapidamente.

Os dois sub-menus pedidos (**Pipeline** / **Tabela**) **já existem** como `TabsTrigger` em `/admin/beta-leads` (`?view=pipeline|tabela`). Não é preciso criar novas rotas — confirmar que ambos os tabs renderizam após login válido.

---

## 3. Portar drag-and-drop ao Kanban (inspirado no CRM Webinar)

Adicionar D&D HTML5 ao `KanbanBoard` para mover cartões entre colunas (alterando `commercial_status`). Mantém o picker existente como alternativa acessível.

**Ficheiro:** `src/components/admin/v2/beta-leads/kanban-board.tsx`

- Em cada card (`KanbanCard`):
  - `draggable`, `onDragStart` → `e.dataTransfer.setData("text/plain", lead.id)` + `effectAllowed = "move"`.
  - Cursor visual `cursor-grab active:cursor-grabbing`.
- Em cada coluna:
  - State local `dragOverColumn: string | null`.
  - `onDragOver` (preventDefault + `dropEffect = "move"`), `onDragLeave`, `onDrop`.
  - Realce visual quando `dragOverColumn === col.id` (ring com `--admin-info-500`).
  - `onDrop` → confirma diálogo *"Mover «{name}» para «{coluna}»?"* e chama `onUpdate(leadId, { commercial_status: targetStatus })` (já existe).
- Cada coluna do `KANBAN_COLUMNS` mapeia para **um** `commercial_status` representativo (já é assim hoje); o drop atribui esse status.
- Em mobile (accordion), o D&D é desativado — pickers continuam a funcionar.

**Sem alterações** ao endpoint `/api/admin/leads-kanban/$id` (já aceita `commercial_status` no PATCH).

---

## 4. Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual: login em `/admin`, abrir `/admin/beta-leads`, confirmar:
  - Sidebar reflete a nova ordem e o nome `Templates Email + SMS`.
  - Pipeline carrega leads, drag entre colunas funciona com diálogo de confirmação.
  - Tab Tabela funciona, filtros chips e pesquisa intactos.
  - Sem sessão: erro mostra mensagem distinta + botão de iniciar sessão.

---

## Fora de âmbito

- Não copiar o resto do `PipelineView`/`TableView` da referência: usa modelo de dados diferente (`Inscrito` vs `EnrichedLead`) e tokens HSL incompatíveis.
- Não criar rotas separadas `/admin/crm/pipeline` e `/admin/crm/contactos` (mantém-se `/admin/beta-leads?view=...`).
- Sem alterações de schema, providers ou emails.
