## Objetivo

Concluir os 5 itens pendentes da checklist anterior: renomear a rota `/admin/beta-leads` para `/admin/leads`, atualizar todas as referências internas, adicionar um banner de conversão e completar o suporte aos 5 estados novos do lifecycle no detail sheet.

---

## Fase 1 — Renomear rota (sem partir links existentes)

**1.1 Criar `src/routes/admin.leads.tsx`**
- Cópia exata de `admin.beta-leads.tsx`.
- Atualizar o path em `createFileRoute("/admin/leads")`.
- Manter o mesmo loader, queryKey, search schema (`lead`, `view`).

**1.2 Transformar `admin.beta-leads.tsx` em redirect permanente**
- Substituir o conteúdo por um `beforeLoad` que faz `throw redirect({ to: "/admin/leads", search: prev, replace: true })`, preservando `?lead=` e `?view=`.
- Manter o ficheiro para não partir bookmarks/emails antigos.

---

## Fase 2 — Atualizar referências internas (6 ficheiros + queryKey)

Substituir `"/admin/beta-leads"` por `"/admin/leads"` e `["admin","beta-leads"]` por `["admin","leads"]` em:

1. `src/components/admin/v2/admin-sidebar.tsx` (linhas 35, 66, 68, 160 + label "Pipeline" mantém-se)
2. `src/components/admin/v2/admin-topbar.tsx` (linha 24 — chave do mapa de títulos)
3. `src/components/admin/v2/admin-command-palette.tsx` (linhas 72, 79, 139 queryKey, 157)
4. `src/components/admin/v2/automacoes/people-tab.tsx` (linhas 46 queryKey, 150, 164 + comentário do topo)
5. `src/components/admin/v2/visao-geral/priority-followups.tsx` (linha 146)
6. `src/routes/admin.clientes.tsx` (linhas 2, 5, 12 — redirect target e comentários)

Também atualizar a queryKey `["admin", "beta-leads"]` para `["admin", "leads"]` no próprio `admin.leads.tsx` e nos hooks internos do beta-leads que façam `invalidateQueries` com essa key (vou fazer `rg "beta-leads"` final para confirmar zero ocorrências fora do ficheiro de redirect).

---

## Fase 3 — Banner de conversão

**3.1 Endpoint** `src/routes/api/admin/leads-funnel.ts`
- GET handler protegido por `requireAdmin`.
- Calcula 3 taxas a partir de `beta_leads` / `report_requests` / pagamentos:
  - **Reports → LM** (`reports_count` → leads com `commercial_status` em fase de Liaison Manager / qualified)
  - **LM → Checkout** (qualified → `checkout_sent` ou equivalente)
  - **Checkout → Pago** (checkout → `paid`)
- Devolve `{ reportsToLm: { rate, numerator, denominator }, lmToCheckout: {...}, checkoutToPaid: {...}, windowDays: 30 }`.

**3.2 Componente** `src/components/admin/v2/beta-leads/leads-conversion-banner.tsx`
- 3 KPI cards horizontais, design tokens do admin (sem cores hardcoded).
- Cada card: label + taxa grande + `numerator/denominator` em micro-linha.
- Skeleton state + empty state ("Sem dados nos últimos 30 dias").
- Mostrar no topo de `admin.leads.tsx`, acima da pipeline.

---

## Fase 4 — Lifecycle: 5 estados novos

**4.1 `src/lib/admin/lead-lifecycle.ts`**
- Adicionar os 5 estados novos ao `LIFECYCLE_STATUSES` (a confirmar nomes exatos durante a implementação — provavelmente `lm_contacted`, `lm_meeting_booked`, `checkout_sent`, `checkout_abandoned`, `paid` ou subset equivalente).
- Estender `suggestNextLeadAction` para devolver a próxima ação recomendada em cada um.
- Adicionar metadados (label pt-PT, descrição curta, ícone/tom) consumíveis pelo detail sheet.

**4.2 `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`**
- Linha 578: trocar `KANBAN_COLUMNS.map(...)` no `<Select>` por `COMMERCIAL_STATUS_OPTIONS.map(...)` — KANBAN_COLUMNS só tem as colunas visíveis do board, COMMERCIAL_STATUS_OPTIONS inclui estados legados/transitórios.
- Linha 334: manter `KANBAN_COLUMNS.find` para o `columnDef` visual (cor da coluna), com fallback caso o estado não exista em colunas.
- Verificar que `suggestedStep` (linha 327) continua a funcionar com os novos estados.

---

## Fora de scope

- Migração de dados em `beta_leads` (estados legados continuam suportados).
- Renomear a tabela `beta_leads` (apenas a rota muda).
- Alterações ao kanban board / colunas visíveis.
- Análise da Socialinsider (outra thread).

---

## Checkpoint final ☐

- [ ] `/admin/leads` carrega tudo o que `/admin/beta-leads` carregava
- [ ] `/admin/beta-leads?lead=xxx` redireciona para `/admin/leads?lead=xxx`
- [ ] `rg "beta-leads" src/` só devolve `admin.beta-leads.tsx` (redirect)
- [ ] Sidebar, topbar, command palette, people-tab, priority-followups e clientes apontam para `/admin/leads`
- [ ] Banner de 3 taxas renderiza no topo da página com dados reais do endpoint
- [ ] Select de status no detail sheet mostra todos os estados (incluindo legados)
- [ ] `suggestNextLeadAction` devolve sugestão coerente para os 5 novos estados
- [ ] Build passa sem erros TypeScript
