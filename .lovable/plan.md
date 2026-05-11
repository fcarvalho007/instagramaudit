## Auditoria — o que ficou feito e o que falta

### Já corrigido (verificado)
- `LeadCard`: moeda em USD com tooltip, `USER_TYPE_LABELS` (chaves EN), `REPORT_STATUS_LABELS` em pt-PT (sem `pending_review`), ícone `PhoneCall`, fallback "Sem nome", badge lead-magnet.
- `KanbanBoard`: chips agrupados (Estado/Atenção), contador, "Limpar filtros", drag-drop com toast `Anular` (sem `confirm()`), accordion mobile re-sync, ordenação por `last_interaction desc`, optimistic update no `admin.beta-leads.tsx`.
- `LeadsTable`: chips partilhados, contador, "Limpar filtros", coluna Lead-magnet, fallback "Sem nome".
- `lead-filter-chips.ts`: chips `novos_hoje`, `inativos_7d`, `lead_magnet_ativo`, `marketing_ok`.
- `leads-kanban.ts` (API): agrega `lead_magnet`, devolve `marketing_consent`, `archived_at`.
- `EnrichedLead`: campos novos presentes.
- `PeopleTab`: link "Pipeline", bloco de erro tipado, `staleTime 15s`/`refetchInterval 30s`, pill "LM activo".
- `TemplatesTab`: agrupado por `CATEGORY_ORDER`, botão "Editar" com `aria-disabled` + tooltip.
- `automation-flow-page.tsx`: eyebrow "Ciclo de vida · Automações".

### Por corrigir (ficou pendente em `lead-detail-sheet.tsx`)

1. **`USER_TYPE_LABEL` e `USER_TYPE_ACCENT` desalinhados** (linhas 107–121).
   Ainda usam chaves pt antigas (`marca`, `agencia`, `freelancer`, `criador`, `estudante`). Os leads reais chegam em EN (`brand`, `agency`, `consultant`, `creator`, `student`, `ecommerce`, `other`) → o badge cai sempre em `neutral` e mostra a string crua.
   **Fix:** importar `USER_TYPE_LABELS` de `@/lib/unlock-flow` e reescrever `USER_TYPE_ACCENT` com as mesmas chaves do `LeadCard`.

2. **`STATUS_ACCENT` ainda tem `pending_review`** (linha 127).
   Estado morto após a auditoria anterior. Remover. (Mantém `pending`, `processing`, `ready`, `completed`, `failed`, `not_generated`, `generated`, `sent`, `not_sent`, `approved`, `rejected`.)

3. **KPI "Custo" mostra `€` mas o valor é USD** (linha 486).
   `report_cost_usd` é dólares (custo provider). Trocar para `$X.XX` e adicionar `title="Custo provider (USD)"` no `<p>`, em coerência com `LeadCard`.

4. **Nome sem fallback "Sem nome"** (linhas 386, 404, 411).
   Quando `lead.name` é vazio, o header e o avatar ficam em branco / com iniciais erradas. Aplicar `displayName(lead)` (helper local com `lead.name?.trim() || "Sem nome"`) no `<h2>`, `getInitials(...)` e no `SheetDescription`.

### Fora de scope (não tocar)
- Não alterar schema, eventos, nomes de tabelas, lógica de envio.
- Não mexer em rotas nem em páginas públicas.

### Validação
- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual: abrir um lead com `user_type = "brand"` e outro sem nome → confirmar badge correcto, "Sem nome" no header, custo em USD, sem `pending_review` em lado nenhum.

### Entrega
- Lista de ficheiros editados (apenas `lead-detail-sheet.tsx`).
- Resultado de tsc + vitest.