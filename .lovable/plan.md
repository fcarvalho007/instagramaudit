## Objectivo

Substituir o stub de `/admin/perfis` por uma tab completa que responde a 3 perguntas: quais os perfis mais analisados, quais convertem em receita, e onde estão os sinais de oportunidade (pesquisas repetidas sem report).

Sem novas funcionalidades de backend. Reutiliza todos os primitivos partilhados.

---

## Estrutura

```text
AdminPageHeader (Perfis + AdminSearchInput + PeriodSelect + ExportCsvButton)

Section 1 · Visão de perfis              (accent: expense / âmbar)
Section 2 · Top perfis                   (accent: signal / coral)
Section 3 · Oportunidades de conversão   (accent: signal / coral)
Section 4 · Tabela de perfis             (accent: expense / âmbar)
```

Espaçamento entre secções: `gap-7` (igual a Receita / Relatórios).

---

## Pré-requisito · estender `AdminSectionHeader`

Adicionar prop opcional `info?: string` ao `AdminSectionHeader` que renderiza um `<AdminInfoTooltip>` ao lado do título (ícone `i`). Backwards-compatible — todas as instâncias actuais continuam a funcionar sem mudança.

```tsx
interface AdminSectionHeaderProps {
  title: string;
  subtitle?: ReactNode;
  accent: AdminAccent;
  info?: string; // NEW
}
```

---

## Ficheiros a criar

### 1. `src/components/admin/v2/perfis/metrics-section.tsx`

`AdminSectionHeader title="Visão de perfis" subtitle="últimos 30 dias" accent="expense" info="..."` + grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3` com 4 KPIs `accent-left` (size lg) com tooltip `i` em todos. Reutiliza o componente local `ReportKpi` como referência mas exposto inline (composição idêntica à de `relatorios/metrics-section.tsx`).

| KPI | accent | delta | tooltip |
|---|---|---|---|
| Perfis únicos · 30d | expense | up +47 novos | "Perfis Instagram diferentes que foram pesquisados ou geraram relatórios pagos." |
| Repetidos · 2+ análises | signal | — | "Perfis pesquisados múltiplas vezes pelo mesmo utilizador. Sinal forte de intenção de compra." |
| Conversão · pesquisa → report | revenue | up +2.1 p.p. | "Percentagem de perfis pesquisados que geraram pelo menos um relatório pago." |
| Receita média · por perfil | revenue-alt | — | "Receita total dividida pelo número de perfis únicos analisados." |

### 2. `src/components/admin/v2/perfis/top-profiles-section.tsx`

`AdminSectionHeader accent="signal" title="Top perfis" subtitle="ranking por volume" info="..."` + `AdminCard` com grid `grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12`.

**Esquerda — Ranking top 10**:
- Lista vertical `gap-3.5`. Cada item:
  - Posição mono 11px tertiary (largura fixa `w-6` para alinhar)
  - `<AdminAvatar size={32}>` com inicial + cor variando por categoria (mapping local: marca→expense, retalho→leads, influencer→revenue, desporto→info, outros→neutral)
  - Bloco texto + barras (`flex-1 min-w-0`):
    - Linha 1: `@handle` 13px medium primary + `categoria · sub` 11px tertiary
    - Linha 2: barra horizontal 6px cinza `#888780` largura proporcional ao valor relativo a max(análises)
    - Linha 3: barra horizontal 6px coral `#D85A30` largura proporcional ao mesmo max
  - Stats à direita (text-right, mono 12px): `47 análises` primary + `12 reports` em coral
- Fonte: `MOCK_TOP_PROFILES` com 10 perfis listados no spec.

**Direita — Donut por categoria**:
- Header: "Por categoria" + "Distribuição de perfis analisados"
- `<ResponsiveContainer h=200>` com `<PieChart>`+`<Pie data={MOCK_PROFILES_BY_CATEGORY} dataKey="count" innerRadius={60} outerRadius={90} paddingAngle={2}>` + `<Cell>` por entrada usando `entry.color`.
- Centro do donut: posicionamento absoluto com `font-mono text-3xl` "284" + label "perfis" 11px tertiary.
- Legenda em baixo (lista vertical 5 items): swatch 10×10 + categoria primary + pct mono primary + count tertiary.
- Tooltip Recharts inline (mesmo padrão das outras tabs).

Cores das categorias adicionadas a `ADMIN_LITERAL`:
```ts
categoryBrand: "#BA7517",
categoryRetail: "#534AB7",
categoryInfluencer: "#1D9E75",
categorySport: "#185FA5",
categoryOther: "#888780",
```

### 3. `src/components/admin/v2/perfis/intent-opportunities-section.tsx`

`AdminSectionHeader accent="signal" title="Oportunidades de conversão" info="..."` + grid `grid-cols-1 lg:grid-cols-2 gap-4`.

**Esquerdo — Pesquisas repetidas** (`AdminCard`):
- Header interno: "Pesquisas repetidas" + "Mesmo perfil pesquisado por mesmo utilizador"
- Lista de 6 itens (`MOCK_REPEATED_SEARCHES`), cada um:
  - `bg-admin-canvas` + `rounded-lg` + `px-3.5 py-3` + `flex items-center justify-between`
  - Esquerda: `@handle` 13px primary + `por <strong>Nome</strong>` 11px secondary (em duas linhas)
  - Direita: contador mono coral `7×` (16px medium) + janela `48h` 10px tertiary
- Botão no fim: `<AdminActionButton size="sm">Ver oportunidades completas →</AdminActionButton>`

**Direito — Funil por perfil** (`AdminCard`):
- Header interno: "Funil por perfil" + "Análise grátis → relatório pago, top 5 perfis"
- Lista de 5 perfis (`MOCK_PROFILE_FUNNELS`), cada um:
  - Linha header: `@handle` 13px primary à esquerda + `25.5%` mono coral à direita
  - Barra cinza `#B4B2A9` h-1.5 width 100% + label `47 análises grátis` 11px tertiary
  - Barra coral `#D85A30` h-1.5 width % proporcional + label `12 reports pagos` 11px tertiary
  - Espaço entre perfis `pb-3` + `border-b border-admin-border` excepto o último

### 4. `src/components/admin/v2/perfis/profiles-table-section.tsx`

Header com `AdminSectionHeader title="Tabela de perfis" accent="expense" info="..."` + filtros pill no slot direito (igual padrão de `reports-table-section`):
- Todos · 284 / Com reports · 87 / Repetidos · 62 / Sem conversão · 197

Tabela 8 colunas:
- **Perfil**: `<AdminAvatar size={32}>` + `@handle` primary + categoria secondary
- **Tipo**: `<AdminBadge variant>` por tipo (expense/leads/revenue/neutral)
- **Análises**: número mono + mini-barra coral inline 4px (largura proporcional ao max)
- **Reports**: mono coral se >0, tertiary se 0
- **Conversão**: percentagem mono semaforizada (>30% verde / 15-30% âmbar / <15% vermelho)
- **Receita**: mono `€XXX` ou `—`
- **Última**: tempo relativo 12px tertiary
- **Acção**: ícones com Radix Tooltip (`BarChart3`, `Send`, `ExternalLink` da lucide-react). Linha sem reports omite o `Send`.

Linhas: `border-t border-admin-border`, `hover:bg-[var(--color-admin-surface-muted)]`, `cursor-pointer`. 10 linhas mock.

Rodapé: "A mostrar 10 de 284 · ordenado por análises" + paginação `←` `→`.

---

## Ficheiros a editar

### `src/lib/admin/mock-data.ts`

Adicionar no fim:
```ts
export type ProfileCategory = "brand" | "retail" | "influencer" | "sport" | "other";

export const MOCK_PROFILES_METRICS = { uniqueProfiles, repeated, conversion, avgRevenuePerProfile };
export const MOCK_TOP_PROFILES = [...10 perfis];
export const MOCK_PROFILES_BY_CATEGORY = [...5 categorias];
export const MOCK_REPEATED_SEARCHES = [...6 entradas];
export const MOCK_PROFILE_FUNNELS = [...5 perfis];
export const MOCK_PROFILES_LIST = [...10 perfis para tabela];
export const MOCK_PROFILES_COUNTS = { all: 284, withReports: 87, repeated: 62, noConversion: 197 };
```

### `src/components/admin/v2/admin-tokens.ts`

Acrescentar a `ADMIN_LITERAL`:
```ts
categoryBrand: "#BA7517",
categoryRetail: "#534AB7",
categoryInfluencer: "#1D9E75",
categorySport: "#185FA5",
categoryOther: "#888780",
profileBarAnalyses: "#888780",
profileBarReports: "#D85A30",
profileFunnelBase: "#B4B2A9",
```

### `src/components/admin/v2/admin-section-header.tsx`

Adicionar prop `info?: string` (ver pré-requisito acima). Backwards-compatible.

### `src/routes/admin.perfis.tsx`

Substituir stub por composição igual ao padrão de `admin.relatorios.tsx`:

```tsx
const [period, setPeriod] = useState<AdminPeriod>("30d");
const [search, setSearch] = useState("");

<AdminPageHeader
  title="Perfis"
  subtitle="Perfis Instagram analisados, repetições e conversão em relatórios"
  actions={
    <>
      <AdminSearchInput placeholder="Pesquisar perfil..." value={search} onChange={setSearch} />
      <PeriodSelect value={period} onChange={setPeriod} />
      <ExportCsvButton onExport={...} />
    </>
  }
/>
<div className="flex flex-col gap-7">
  <MetricsSection />
  <TopProfilesSection />
  <IntentOpportunitiesSection />
  <ProfilesTableSection />
</div>
```

---

## Não tocar

- Cockpit legado (`/admin/sistema/cockpit-legado/*`)
- `/report/example`
- Outras tabs já implementadas
- `KPICard`, `AdminCard`, `AdminBadge`, `AdminAvatar` (excepto `AdminSectionHeader`, mudança aditiva acima)

---

## Validação final

```bash
bunx tsc --noEmit
bun run build
```

Inspecção visual via `code--view` dos ficheiros novos.

---

## Checklist de aceitação

- ☐ `/admin/perfis` deixa de ser stub
- ☐ 4 KPICards com tooltip "i" em todos
- ☐ Top 10 perfis com avatares 32px, posição mono, barras duplas (cinza análises + coral reports)
- ☐ Donut Recharts com 5 categorias e número 284 centrado
- ☐ Pesquisas repetidas: 6 itens com bg subtil + contador mono coral
- ☐ Funil por perfil: 5 perfis com 2 mini-barras empilhadas + percentagem
- ☐ Tabela 8 colunas com 10 linhas, filtros pill funcionais, conversão semaforizada
- ☐ Reutiliza `AdminPageHeader`, `AdminSectionHeader`, `AdminCard`, `AdminAvatar`, `AdminBadge`, `AdminActionButton`, `AdminSearchInput`, `PeriodSelect`, `ExportCsvButton`, `AdminInfoTooltip`
- ☐ Sem hex hardcoded fora de `ADMIN_LITERAL`
- ☐ Sublinhado da tab activa em neutral-900 (já é regra do `AdminTabsNav`)
- ☐ `bunx tsc --noEmit` ✓
- ☐ `bun run build` ✓