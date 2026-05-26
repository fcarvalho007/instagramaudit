## Plano — Refinar /admin/relatorios

Quatro mudanças, todas frontend (sem alterar schema nem endpoints):

---

### 1. Alinhar Fase 1 do pipeline com o KPI "Pediram análise"
**Ficheiro:** `src/components/admin/v2/relatorios/pipeline-section.tsx`

- Hoje **Fase 1** (`phases.snapshot`) mostra apenas snapshots **sem** unlock por email — não bate certo com "Pediram análise" (`total_analyses` = todos os snapshots) lá em baixo.
- Mudar **Fase 1** para mostrar `data.total_window` (total de análises geradas na janela) e o sub passa a "total na janela". Passa a ser o topo do funil cumulativo.
- **Fase 2 / 3 / 4** continuam a refletir a progressão (subset). Adicionar pequena legenda no header da secção: *"funil cumulativo — Fase 1 é o total de análises geradas, fases seguintes são subconjuntos."*
- Remover o card agregado **"Tempo médio total"** (duplicado e pouco acionável, mesma família que o gráfico que o utilizador pediu para remover). Os 3 agregados restantes — Taxa de sucesso, A recuperar, Custo médio — passam de `lg:grid-cols-4` para `lg:grid-cols-3`.

### 2. Substituir o chart "Tempo médio de entrega" por estatísticas de relatórios gerados
**Ficheiro:** `src/components/admin/v2/relatorios/charts-section.tsx`

- Remover o segundo `AdminCard` com o `LineChart` "Tempo médio de entrega" e toda a série `timing`.
- Renomear a secção para **"Volume de relatórios gerados"**.
- O `ComposedChart` "Volume diário" passa a ocupar **lg:col-span-2** (full width) e ganha:
  - 3 barras empilhadas: **Entregues** (delivered), **Em curso** (with_unlock − delivered − failed), **Falhados** (failed). Sem mexer no endpoint — calculado client-side a partir do payload `volume[]` existente.
  - Linha contínua **Análises geradas** (já existente).
  - Legenda no topo com as 4 séries.
- Adicionar à esquerda do gráfico (mesmo card) **4 mini-stats** verticais derivadas do `volume[]`:
  - **Total na janela** (Σ analyses)
  - **Reports entregues** (Σ delivered)
  - **Média/dia** (Σ analyses ÷ dias)
  - **Pico diário** (max analyses + dia)
- Layout do card: `grid-cols-[200px_1fr]` em desktop, empilhado em mobile.

### 3. Tabela de relatórios — colunas e ações
**Ficheiro:** `src/components/admin/v2/relatorios/reports-table-section.tsx`

- **Remover** colunas `Origem` e `Estado` (e o componente `StatusBadge` + helpers `SOURCE_LABEL` / `sourceLabel` / `deriveStatus` deixam de ser usados na render — manter `deriveStatus` apenas para o filtro client-side de "in_progress").
- **Colunas finais:**
  1. **Quem pediu** — `lead.name` em destaque + `lead.email` em secundário; quando ausente, badge `anónimo` (mantém o `kind="snapshot"` implícito).
  2. **Perfil analisado** — `@{instagram_username}`.
  3. **Rede social** — chip pequeno com ícone Instagram (lucide `Instagram`) + label "Instagram". Hardcoded por agora (toda a base é IG); preparado para futuro multi-rede quando o schema ganhar `network`.
  4. **Início** — timestamp existente.
  5. **Acções** — duas botões lado a lado:
     - **Ver perfil** → abre `/analyze/{instagram_username}` em nova aba (link externo com ícone).
     - **Ver report** → abre o `ReportDrawer` existente quando `kind === "request"`. Para linhas `kind === "snapshot"` (sem unlock por email, não existe report PDF), o botão fica **desativado** com tooltip *"Sem relatório gerado — análise pública sem unlock"*.
- Os filtros pill no topo (Todos / Entregues / Em curso / Falhados) mantêm-se — continuam a ser a forma do admin filtrar por estado, agora que a coluna "Estado" foi removida.
- Header `colSpan` do empty/loading state passa de 6 → 5.

### 4. Out of scope (intencionalmente)
- Não toca em endpoints `/api/admin/report-requests/*`.
- Não altera o `ReportDrawer`.
- Não adiciona coluna `network` ao schema — frontend usa "Instagram" hardcoded.
- Não mexe na exportação CSV nem no `PeriodSelect`.

---

### Verificação
- `bunx tsc --noEmit`
- Confirmar visualmente em `/admin/relatorios` que: Fase 1 = "Pediram análise"; chart é único e full-width; tabela tem 5 colunas e 2 botões por linha.

Aprovas?