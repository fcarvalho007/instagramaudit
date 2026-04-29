## Goal

Tornar funcionais 4 categorias UX no `/admin` v2: filtros pill, drawer "Ver report", acções (re-enviar/re-gerar/investigar) e pesquisa. Toda a operação é sobre mock data (sem backend novo nesta fase) com UI honesta — toasts e confirmações reais, mas sem persistência.

## Levantamento — o que JÁ existe

| Área | Estado actual |
|---|---|
| Filtros Relatórios | ✅ funcionais (pills + `useMemo`) |
| Filtros Perfis | ✅ funcionais (pills + `useMemo`) |
| Filtros Clientes | ❌ **inexistentes** — tabela renderiza `MOCK_CUSTOMERS_LIST` directo |
| `AdminSearchInput` | Tem `value`/`onChange`, **falta** clear button + `Cmd+K` |
| Pesquisa Clientes | ❌ não filtra |
| Pesquisa Perfis | ❌ não filtra |
| Drawer Ver Report | ❌ não existe |
| Acções report | ❌ ícones `Eye` actuais não fazem nada |
| `Sheet` Radix | ✅ disponível em `src/components/ui/sheet.tsx` |
| Tabela `report_actions` | ❌ não existe |
| "Últimos relatórios" Visão Geral | ❌ **secção não existe** — prompt assume erradamente que existe |

Decisão sobre "Últimos relatórios": **não criar nova secção** (fora do âmbito visual deste prompt). Triggers do drawer ficam em **Relatórios · ícone Eye** + **Clientes · timeline** (já existe na `customer-card-section.tsx`). Tab Visão Geral fica fora — registar nota para iteração futura.

## Plano de implementação

### Parte A — Componente partilhado `<FilterPills>`

Criar `src/components/admin/v2/filter-pills.tsx`:
- Genérico `<T extends string>`, props `{options, value, onChange}`
- Usa **tokens admin** (`admin-border`, `admin-text-*`, `admin-bg-elevated`) em vez de hex inline (corrigir desvio do prompt vs. regras de design tokens)
- Exporta `<FilterPills>` e tipo `FilterOption<T>`
- Refactor de **Relatórios** e **Perfis** para usarem o componente partilhado (DRY — eliminam-se as 2 cópias inline)

### Parte B — Filtros funcionais em Clientes

Em `src/components/admin/v2/clientes/customers-table-section.tsx`:
- Adicionar `useState<CustomerFilter>('all')` + `useMemo` filtragem
- Mapear filtros → predicados sobre `CustomerRow.state` e `CustomerRow.signal.kind`:
  - `subscribers` → `state === 'subscription'`
  - `one_off` → `state === 'one_time' || state === 'recurring'`
  - `at_risk` → `signal.kind === 'at_risk'`
- Footer "A mostrar X de Y" + estado vazio amigável
- Adicionar `<FilterPills>` no header da tabela

### Parte C — Pesquisa funcional

1. **`AdminSearchInput`** ganha:
   - Botão `X` (lucide `X`) à direita quando `value.length > 0` → limpa + foco
   - `ref` interno + `useImperativeHandle` para expor `focus()` ao parent
   - **NÃO** muda assinatura existente (compatibilidade)

2. **Hook** `src/hooks/use-cmd-k.ts`:
   - Listener global `keydown` para `Cmd+K`/`Ctrl+K` → chama callback de foco
   - `preventDefault` no atalho

3. **Hook** `src/hooks/use-debounced-value.ts`:
   - `useDebouncedValue<T>(value, delayMs=200)`

4. **Aplicar em Clientes**:
   - `searchQuery` + `debouncedQuery` (200ms)
   - Filtragem combinada (AND): `filter` pill + match em `name`/`email` (case-insensitive)
   - Cmd+K foca o input
   - Estado vazio: "Sem resultados para «{query}»" + botão "Limpar pesquisa"

5. **Aplicar em Perfis**:
   - Igual mas match em `handle` + `category` (verificar campos exactos no `MockProfileRow`)

### Parte D — Drawer "Ver report"

1. **Mock data novo** — adicionar a `src/lib/admin/mock-data.ts`:
   ```ts
   export interface MockReportDetail { ... }
   export function getMockReportDetail(id: string): MockReportDetail
   ```
   Função determinística que deriva detalhe a partir de `MOCK_REPORTS_LIST.find(r => r.id === id)`, preenchendo phases/costs/events com base no `status`. Para id desconhecido devolve fallback genérico. **Não duplicar** a lista de reports.

2. **Componente** `src/components/admin/v2/report-drawer.tsx`:
   - Wrapper sobre `Sheet` (`side="right"`, `className` para 640px largura desktop, full em mobile)
   - Composição em sub-componentes locais: `DrawerHeader`, `PhasesGrid`, `CostsTable`, `EventsTimeline`, `ActionsBar`, `SnapshotAccordion`
   - Tokens admin only — zero hex inline
   - Acordeon usa `<details>` nativo (sem dependência nova) ou `Accordion` de `src/components/ui/accordion.tsx` se existir; caso contrário `<details>`
   - Esc + click overlay + botão X fecham (gratuito via `Sheet`)

3. **Conteúdo das 5 secções** conforme prompt:
   - Cabeçalho: id, origem, handle, nome cliente, datas, badge status, custo
   - 4 mini-KPIs phases com `Check`/`Loader2`/`X` por status
   - Tabela custos (apify/openai/other)
   - Timeline 8 eventos com timestamp mono
   - Acções (ver Parte E)
   - JSON snapshot dentro de `<details>` colapsado

4. **Estado em cada tab** (Relatórios + Clientes):
   - `useState` para `drawerOpen` + `selectedReportId`
   - Helper `openReport(id)` passado como prop a tabela/timeline

5. **Wiring**:
   - `reports-table-section.tsx`: ícone `Eye` em cada row chama `openReport(row.id)` (corrigir wire-up inerte actual)
   - `customer-card-section.tsx`: timeline events de tipo "report gerado" ganham `onClick`
   - **Visão Geral**: skip (secção inexistente — registar nota)

### Parte E — Acções operacionais (UI honest, sem backend novo)

**Decisão importante:** o prompt pede edge functions reais (`resend-report-email`, `regenerate-report-pdf`) e tabela `report_actions`. Como o admin opera quase 100% sobre mock data e o utilizador disse "Não criar novos endpoints reais ainda — edge functions podem retornar 200 com mock", vou:

1. **NÃO criar** edge functions nem migration nesta fase. Em vez disso:
2. Criar `src/lib/admin/report-actions.client.ts` com 3 funções stub:
   - `resendReportEmail(id)`, `regenerateReportPdf(id)`, `retryReportFull(id)`
   - Retornam `Promise<{ ok: true }>` após `setTimeout(800ms)` (simula latência)
   - Comentário no topo a marcar claramente como STUB e a apontar para os endpoints futuros
3. Componentes UI usam estas stubs hoje; trocar para `fetch` real quando endpoints existirem (uma única alteração).

**Componentes**:
- `<ConfirmDialog>` reutilizável em `src/components/admin/v2/confirm-dialog.tsx` (Radix Dialog) com props `{open, onConfirm, onCancel, title, description, confirmLabel, variant}`
- Toasts via `sonner` (já no projecto, ver knowledge — `import { toast } from 'sonner'`)
- Botões dentro do drawer:
  - "Re-enviar email" → confirm → stub → toast success/error
  - "Re-gerar PDF" → idem
  - "Ver no /report/example" → `<a target="_blank" href="/report/example">` (não tocar nessa rota — locked)
  - Se `status === 'failed'`: "Investigar erro" → modal `<ErrorInvestigationModal>` com error code, message, mock stack trace, botão "Re-tentar pedido completo"

**Auditoria**: secção colapsável "Histórico de acções" no drawer → renderiza array em memória (lifted state durante a sessão). Adicionar TODO comment a apontar para `report_actions` futura.

### Parte F — Validação

- `bunx tsc --noEmit` deve passar
- Build não deve introduzir warnings novos
- Sem novas deps (radix-dialog, lucide, sonner já presentes)

## Ficheiros a criar / editar

**Criar:**
- `src/components/admin/v2/filter-pills.tsx`
- `src/components/admin/v2/report-drawer.tsx`
- `src/components/admin/v2/confirm-dialog.tsx`
- `src/components/admin/v2/error-investigation-modal.tsx`
- `src/hooks/use-cmd-k.ts`
- `src/hooks/use-debounced-value.ts`
- `src/lib/admin/report-actions.client.ts` (stubs)

**Editar:**
- `src/components/admin/v2/admin-search-input.tsx` (clear button + ref)
- `src/components/admin/v2/clientes/customers-table-section.tsx` (filtros + pesquisa + drawer)
- `src/components/admin/v2/clientes/customer-card-section.tsx` (timeline → drawer)
- `src/components/admin/v2/relatorios/reports-table-section.tsx` (FilterPills partilhado + Eye → drawer)
- `src/components/admin/v2/perfis/profiles-table-section.tsx` (FilterPills partilhado + pesquisa)
- `src/lib/admin/mock-data.ts` (`getMockReportDetail` + tipo + 8 eventos por status)

**Não tocar:**
- `src/routes/report.example.tsx` (locked)
- Estruturas existentes de `MOCK_REPORTS_LIST` / `MOCK_CUSTOMERS_LIST` / `MOCK_PROFILES_LIST` (apenas adicionar `getMockReportDetail`)

## Critérios de aceitação

- Pills funcionam nas 3 tabs (Clientes ganha novo, Relatórios/Perfis migram para componente partilhado)
- Drawer abre via Eye em Relatórios e via timeline em Clientes; fecha por Esc/X/overlay
- Drawer mostra 5 secções: cabeçalho, phases, custos, timeline, acções, snapshot colapsável
- Re-enviar / Re-gerar pedem confirmação e dão toast
- Falhados têm botão "Investigar erro" com modal
- Pesquisa Clientes (nome/email) e Perfis (handle/categoria) com debounce 200ms
- Cmd+K / Ctrl+K foca o input de pesquisa
- Clear button limpa input
- Filtros + pesquisa combinam (AND)
- Estado vazio amigável em ambos os casos
- Tokens admin only, sem hex hardcoded em componentes novos
- `bunx tsc --noEmit` passa

## Notas / desvios face ao prompt original

1. **Sem edge functions reais**: substituídas por stubs client-side (alinhado com instrução "edge functions podem retornar 200 com mock" e "não criar novos endpoints reais ainda"). Quando o backend existir, trocar uma linha em `report-actions.client.ts`.
2. **Sem tabela `report_actions`** (idem; auditoria fica em memória de sessão).
3. **Trigger do drawer em "Visão Geral · Últimos relatórios"** não é implementado porque essa secção **não existe** hoje. Registar como follow-up.
4. **Drawer em Perfis** explicitamente fora de âmbito (prompt já diz "próxima iteração").
5. **`FilterPills` usa tokens admin** em vez dos hex inline do snippet do prompt (alinhamento com regras workspace de design tokens).
