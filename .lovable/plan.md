## Diagnóstico

`/admin/beta-leads` (Tabela) hoje só permite abrir o detalhe por clique na linha — não há selecção nem eliminação. O endpoint `PATCH /api/admin/leads-kanban/$id` só faz update; não existe DELETE. Os filtros são bons (chips por estado + atenção + pesquisa) mas falta limpar, ordenar e ver o que está activo.

A tabela `leads` não declara FKs explícitas, mas há tabelas que referenciam `lead_id`: `report_requests`, `report_snapshots`, `beta_feedback`, `profiles`, `product_events`. Apagar só `leads` deixa órfãos. A eliminação tem de ser feita em ordem segura no servidor.

## Plano

### A. Selecção (1 ou múltiplos) — `LeadsTable`

- Adicionar coluna de checkbox à esquerda usando `@/components/ui/checkbox`.
- Header: checkbox tri-state que selecciona/desselecciona **apenas as linhas actualmente filtradas** (não a base inteira).
- Por linha: checkbox com `onClick: stopPropagation` para não abrir o `LeadDetailSheet`.
- Estado local `selectedIds: Set<string>`; quando os filtros mudam, intersectar com `filtered` para não manter selecções fantasma fora do viewport actual.
- Linha seleccionada ganha tint subtil (`bg-[var(--admin-board-column-bg)]`) + indicador visual.

### B. Barra de acções em massa (bulk bar)

- Componente novo `BulkActionsBar` montado no topo da tabela (dentro do toolbar existente) quando `selectedIds.size > 0`.
- Conteúdo: `"X seleccionado(s)"` · botão ghost `Limpar selecção` · botão destrutivo `Apagar (X)` (vermelho, `variant="destructive"`).
- Aparece com transição leve (slide-down) para não saltar layout.

### C. Confirmação "hard-confirm" (c.1)

- `AlertDialog` (shadcn já existe) ao clicar em "Apagar (X)".
- Conteúdo:
  - Título: `Apagar X contacto(s) permanentemente?`
  - Lista os primeiros 5 (nome · email), com `+N mais` se aplicável.
  - Aviso `Esta acção é permanente. Vão ser removidos:`
    - relatórios pedidos (`report_requests`)
    - snapshots de relatório (`report_snapshots`)
    - feedback beta (`beta_feedback`)
    - eventos de produto (`product_events`)
    - ligações ao perfil (`profiles.lead_id` ← null)
  - Input de texto: tem de escrever exactamente **`APAGAR`** para activar o botão `Apagar definitivamente`.
- Botão fica disabled enquanto a request está em flight; mostra spinner.

### D. Endpoint novo — `DELETE /api/admin/leads-bulk`

Ficheiro: `src/routes/api/admin/leads-bulk.ts` (server route, `requireAdminSession`).

```
DELETE /api/admin/leads-bulk
Body: { "ids": ["uuid", ...] }   // Zod: 1..200 UUIDs únicos
```

Ordem de eliminação (não há transação cross-table no PostgREST; fazemos sequencial, abortando em erro):

1. `update profiles set lead_id=null where lead_id in (ids)`
2. `delete from beta_feedback where lead_id in (ids)`
3. `delete from report_snapshots where lead_id in (ids)`
4. `delete from report_requests where lead_id in (ids)`
5. `delete from product_events where lead_id in (ids)`
6. `delete from leads where id in (ids)`

Resposta: `{ success: true, deleted: number, details: { profiles_unlinked, feedback, snapshots, requests, events, leads } }`.

Auditoria: 1 insert em `product_events` com `event_type="leads_bulk_deleted"`, `metadata={ count, ids_sample: ids.slice(0,10) }`.

### E. Wiring no front

- `LeadsTable` recebe novo prop `onBulkDelete(ids: string[]) => Promise<void>` ou faz `useMutation` próprio com `adminFetch`.
- Após sucesso: `queryClient.invalidateQueries({ queryKey: ["admin", "beta-leads"] })` + `toast.success("X contactos apagados")` via sonner já existente.
- Em erro: `toast.error(...)` com mensagem do servidor sanitizada (sem stack), mantém selecção.

### F. Melhorias de filtros e UX (alínea d/e)

Dentro da toolbar existente (não muda layout global):

1. **Pill "Limpar tudo"** aparece à direita das chips quando há filtros activos (já existe `clearFilters`, falta expô-lo).
2. **Indicador visual de filtros activos**: contador `"3 filtros activos"` ao lado do `counterLabel`.
3. **Ordenação**: novo `Select` simples (shadcn `select` se existir, senão `<select>` nativo estilizado): `Mais recentes` (default), `Mais antigos`, `Nome A→Z`, `Estado`.
4. **Pesquisa** já cobre nome/email/handle via `matchesQuery` — confirmar e adicionar placeholder mais claro: `Pesquisar nome, email ou @handle…`.
5. **Empty states**: ajustar mensagem quando há selecção + filtro vazio para não confundir.
6. **Sticky header da tabela** dentro do scroll horizontal para não perder colunas em listas longas.

### G. Acessibilidade

- Checkbox header tem `aria-label="Seleccionar contactos filtrados"`.
- AlertDialog tem foco inicial no input de confirmação.
- Keyboard: `Esc` fecha o dialog; `Enter` no input dispara delete se válido.

## Checkpoint

- ☐ `LeadsTable` com coluna de checkbox + estado de selecção
- ☐ `BulkActionsBar` na toolbar com contador, limpar e apagar
- ☐ `AlertDialog` de confirmação com input `APAGAR`
- ☐ Novo endpoint `DELETE /api/admin/leads-bulk` com Zod + ordem de cascata + auditoria
- ☐ Mutation no client + invalidate + toast
- ☐ Filtros: limpar tudo, contador de filtros activos, ordenação
- ☐ Sticky header + tint de linha seleccionada
- ☐ Tests rápidos: confirmar que `frederico.carvalho@digitalfc.pt` (lead com snapshot e profile) consegue ser apagado sem erro

## Restrições

- Sem mexer em `KanbanBoard`, `LeadDetailSheet` nem na vista Pipeline.
- Sem alterar lógica de leads existente fora do endpoint novo.
- Sem migrations (estrutura já suporta).
- Sem expor secrets nem detalhes Supabase ao cliente.