## Tab Clientes · `/admin/clientes`

Substitui o stub actual e implementa as 3 secções (Pipeline · Lista · Ficha) reutilizando integralmente o sistema de design já criado nas tabs Visão Geral e Receita.

---

### 1 · Mock data (`src/lib/admin/mock-data.ts`)

Adicionar **no topo** um bloco de comentário JSDoc com o modelo `Customer` / `CustomerNote` / `CustomerActivity` (futura migração Supabase).

Adicionar exports tipados no final do ficheiro:

- `MOCK_PIPELINE` — 4 estados com `count`, `eyebrow`, `sub`, `accent` e 3 transições (`from → to`, qty)
- `MOCK_PIPELINE_FOOTER` — taxas de conversão + churn
- `MOCK_CUSTOMERS_LIST` — 7 clientes (Pedro, Ana, Inês, Joana, João, Carla, Rui) com campos: `id`, `initials`, `name`, `email`, `state`, `badge` (`{label, variant}`), `avatarColor` (`'revenue'|'leads'|'neutral'`), `ltv`, `reports` (string ou number), `lastActivity`, `signal` (`{kind, label?}`)
- `MOCK_CUSTOMERS_TOTALS` — para os 4 botões pill (Todos · Subscritores · Avulso · Em risco)
- `MOCK_SELECTED_CUSTOMER` — Ana Marques completa: nome, email, location, plano, mensalidade, desde, kpis (4 cells), health bars
- `MOCK_CUSTOMER_ACTIVITY` — 6 eventos com `type` (`payment|report|free_analysis|subscription_started`), título, detalhe, tempo
- `MOCK_CUSTOMER_PROFILES` — 3 perfis analisados pela Ana
- `MOCK_CUSTOMER_NOTES` — nota interna Nike

### 2 · Componentes partilhados (novos · reutilizáveis para futuras tabs)

**`src/components/admin/v2/admin-search-input.tsx`** — input com `<Search>` à esquerda, 220px, estilo coerente com `PeriodSelect` (border, radius lg, focus ring `admin-leads-500`).

**`src/components/admin/v2/admin-action-button.tsx`** — botão genérico mono (default 32px, `size="sm"` 28px). Usado em "Exportar", "Enviar email", "Oferecer upgrade", filtros pill e paginação. Suporta `variant="default" | "active"` para o filtro pill activo.

**`src/components/admin/v2/admin-avatar.tsx`** — avatar circular com iniciais. Props: `initials`, `variant: AdminAccent`, `size: 32 | 56`. Usa `ACCENT_500` para fundo, texto branco.

### 3 · Secções da tab (`src/components/admin/v2/clientes/`)

**`pipeline-section.tsx`**
- `<AdminSectionHeader accent="leads" title="Pipeline" subtitle="movimento entre estados nos últimos 30 dias" />`
- `<AdminCard className="!px-7 !py-6">` com grid `[1fr_30px_1fr_30px_1fr_30px_1fr]`
- 4 mini-cards (border-left 3px da accent + fundo tom 50, padding 14×16, radius `0 .5rem .5rem 0`) — usa cores literais do prompt para garantir coerência exacta
- 3 conectores SVG centrados (qty verde + arrow); SVG inline com `currentColor` ou hex literal
- Footer flex com taxas de conversão e churn

**`customers-table-section.tsx`**
- `<AdminSectionHeader accent="revenue" title="Lista de clientes">` com 4 botões pill alinhados via `ml-auto` (slot novo no header **OU** wrapper externo `<div className="flex items-center mb-3.5">` colocando header + filtros lado a lado — vou usar **wrapper externo** para não tocar no `AdminSectionHeader`)
- `<AdminCard className="!px-5 !py-4">` com `<table>` semântica
- Linhas com `border-t-[0.5px] border-admin-border-strong cursor-pointer hover:bg-admin-neutral-50`; linha Ana com `bg-admin-neutral-50`
- Avatar via `<AdminAvatar size={32} />`
- Estado via `<AdminBadge variant="..." />`
- Sinal: lógica condicional → `"activo"` em texto verde, ou `<AdminBadge>` (signal/danger/expense), ou `"—"`
- Footer com texto + 2 botões `<` `>` via `AdminActionButton size="sm"`

**`customer-card-section.tsx`**
- `<AdminSectionHeader accent="leads" title="Ficha · Ana Marques" subtitle="selecionada na tabela acima" />`
- `<AdminCard className="!px-7 !py-6">`:
  - Header flex: `<AdminAvatar size={56} variant="leads" initials="AM" />` + bloco central (h3 + Badge revenue + tertiary "desde …" + linha email/cidade) + 2 `AdminActionButton`
  - Grelha 4 KPIs: implementada como `<div className="grid grid-cols-4 gap-px rounded-md overflow-hidden bg-admin-border-strong mb-6">` com cells brancas (truque das bordas via gap+fundo). Última cell tem 5 barras 14×4px (4 verdes + 1 cinza)
  - Grid 2 colunas `[1.3fr_1fr] gap-6`:
    - Esquerda: timeline com `position: relative; pl-5` + linha vertical absoluta + 6 itens com ponto colorido por tipo (helper `dotColor(type)`)
    - Direita: bloco "Perfis analisados" (3 items pill cinza claro) + bloco "Notas internas" (cartão rosa-coral com border-left `#D4537E`, fundo `#FBEAF0`, textos `#72243E` / `#4B1528`)

### 4 · Rota (`src/routes/admin.clientes.tsx`)

Substitui o `StubTab` por:

```tsx
<AdminPageHeader
  title="Clientes"
  subtitle="312 leads · 125 clientes · 38 subscritores activos"
  actions={
    <>
      <AdminSearchInput placeholder="Pesquisar cliente..." />
      <AdminActionButton>Exportar</AdminActionButton>
    </>
  }
/>
<div className="flex flex-col gap-7">
  <PipelineSection />
  <CustomersTableSection />
  <CustomerCardSection />
</div>
```

### Notas técnicas

- **Cores literais do prompt** (border-left e fundos dos 4 cartões do pipeline, cor do verde `#3B6D11` dos conectores, rosa `#D4537E`/`#FBEAF0`/`#72243E`/`#4B1528` da nota): mantidas como hex inline para fidelidade exacta. Os tokens `admin-leads-*`, `admin-revenue-*`, `admin-expense-*` cobrem o resto.
- **Linha 0.5px**: usar `border-t border-admin-border-strong` (já validado nas outras tabs em 1× DPR).
- **AdminBadge**: já suporta `revenue | leads | expense | neutral | danger | signal`. Para o sinal "candidato sub" uso `signal` (coral); para "7× repetiu" e "em risco" uso `danger`.
- **Paginação e filtros**: apenas visuais (sem estado funcional) — coerente com `PeriodSelect`/`ExportCsvButton` da Receita.
- **Acessibilidade**: tabela usa `<thead>`/`<tbody>`, botões pill recebem `aria-pressed`, avatares têm `aria-label` com nome completo.

### Ficheiros tocados

**Novos:**
- `src/components/admin/v2/admin-search-input.tsx`
- `src/components/admin/v2/admin-action-button.tsx`
- `src/components/admin/v2/admin-avatar.tsx`
- `src/components/admin/v2/clientes/pipeline-section.tsx`
- `src/components/admin/v2/clientes/customers-table-section.tsx`
- `src/components/admin/v2/clientes/customer-card-section.tsx`

**Editados:**
- `src/routes/admin.clientes.tsx` (substitui stub)
- `src/lib/admin/mock-data.ts` (adiciona blocos no fim + comentário modelo no topo)

### Checkpoint

- ☐ Pipeline horizontal renderiza 4 cards + 3 conectores SVG verdes
- ☐ Tabela de 7 clientes com avatares coloridos por estado e linha Ana destacada
- ☐ Filtros pill no header da secção 2 (Todos activo)
- ☐ Ficha com header + 4 KPIs (saúde com 4/5 barras) + timeline 6 eventos + perfis + nota Nike rosa
- ☐ Comentário do modelo `Customer/Note/Activity` no topo de `mock-data.ts`
- ☐ Reutiliza `AdminPageHeader`, `AdminSectionHeader`, `AdminCard`, `AdminBadge`, `KPICard` (não cria duplicatas)
- ☐ `tsc --noEmit` + `bun run build` passam
