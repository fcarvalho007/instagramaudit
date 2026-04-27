## Objectivo

Substituir o stub de `/admin/relatorios` por uma tab completa que unifica "Análises" e "Pedidos" do cockpit legado num **pipeline operacional** (Pedido → Análise Apify → PDF → Email), com métricas, gráficos e tabela de relatórios.

Sem novas funcionalidades de backend. Sem mexer no cockpit legado nem em `/report.example`. Reutiliza todos os primitivos partilhados.

---

## Estrutura

```text
AdminPageHeader (Relatórios + PeriodSelect + ExportCsvButton)

Section 1 · Pipeline operacional       (accent: signal/coral)
Section 2 · Métricas operacionais      (accent: revenue/verde)
Section 3 · Volume e timing diário     (accent: signal/coral)
Section 4 · Tabela de relatórios       (accent: revenue/verde)
```

Espaçamento entre secções: `gap-7` (alinhado às restantes tabs já implementadas — usa o mesmo padrão de `admin.receita.tsx`).

---

## Ficheiros a criar

### 1. `src/components/admin/v2/relatorios/pipeline-section.tsx`

`AdminCard padding="loose"` único.

**Topo · 4 fases** (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`):

Cada fase é um cartão interno com:
- `background: var(--admin-bg-subtle)`
- `border-left: 4px solid {accent}`
- `border-radius: 0 12px 12px 0`
- `padding: 20px 24px`
- Eyebrow mono 10px uppercase letter-spacing `0.08em`
- Label 13px secondary
- Valor mono 32px weight 500 letter-spacing `-0.02em` (classe `admin-num`)
- Sub 12px tertiary
- Indicador de saúde no canto inferior direito: `<HealthDot health="ok|warn|critical" />` — círculo 8px com pulse animation suave (`@keyframes admin-pulse` via style inline, ou `animate-pulse` do Tailwind com tonalidade reduzida)

Cores das fases (literais, adicionadas a `ADMIN_LITERAL` para evitar hex soltos):
- `pipelineRequest: #534AB7`
- `pipelineAnalysis: #BA7517`
- `pipelinePdf: #185FA5`
- `pipelineEmail: #1D9E75`

**Rodapé · 4 stats agregados** (`border-top` `--color-admin-border`, `pt-6 mt-6`):

`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` com **divisores verticais** entre colunas (border-left a partir da 2ª, escondida em mobile). Cada stat:
- Eyebrow mono 10px
- Valor mono 22px (cor semântica: verde para successRate, vermelho se failuresToRecover > 0)
- Sub 11px tertiary

Sem `<AdminStat>` aqui porque queremos o tratamento de divisor + cor condicional. Mantém o estilo do rodapé `expense-section.tsx`.

### 2. `src/components/admin/v2/relatorios/metrics-section.tsx`

`AdminSectionHeader title="Métricas operacionais" subtitle="últimos 30 dias" accent="revenue"` + grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3` com **4 `KPICard size="lg"`**, todos com `info` (tooltip).

| KPI | accent | delta | info |
|---|---|---|---|
| Relatórios entregues · 30d | revenue | up +18% | "Total entregue por email com sucesso nos últimos 30 dias." |
| Tempo médio · entrega | info | — | "Tempo médio entre pedido e email entregue. P95 = percentil 95." |
| Taxa de sucesso | revenue | up +0.4 p.p. | "% de relatórios entregues sem intervenção manual." |
| Custo médio · por relatório | revenue-alt | down -$0.04 (verde, despesa a baixar) | "Apify (scraping) + OpenAI (análise) por relatório." |

O KPI de custo com delta `down` mas semanticamente positivo: usar prop existente do `KPICard` se houver `deltaTone` ou senão passar `direction: "down"` e confiar na cor. Verificar o primitivo durante implementação — se necessário, adicionar prop `deltaIntent: "good" | "bad"` ao `AdminStat`/`KPICard` para inverter cor (mudança mínima, opt-in).

### 3. `src/components/admin/v2/relatorios/charts-section.tsx`

`AdminSectionHeader title="Volume e timing diário" subtitle="distribuição e SLA" accent="signal"` + `AdminCard` com 2 gráficos lado a lado (`grid grid-cols-1 lg:grid-cols-2 gap-6`).

**Esquerda · BarChart empilhado (30d)** — séries `delivered` (verde `#1D9E75`), `failed` (vermelho `#E24B4A`), `queued` (cinza `#888780`). Header com título 16px medium + subtítulo 12px + legenda inline (3 swatches). XAxis dia, YAxis mono.

**Direita · LineChart (30d)** — 1 linha coral `#D85A30` + `<ReferenceLine y={300} stroke="#888780" strokeDasharray="4 4" label={{ value: "SLA · 5min", position: "insideTopRight" }} />`. Tooltip formata segundos → `Xm Ys`.

Tooltip dark cinematográfico inline (não há `chart-tooltip.tsx` partilhado — replica o padrão usado em `revenue-section.tsx` e `expense-section.tsx`, que definem o `<Tooltip content={...} />` localmente).

Adicionar literais `chartDelivered`, `chartFailed`, `chartQueued`, `chartTiming`, `slaLine` a `ADMIN_LITERAL`.

### 4. `src/components/admin/v2/relatorios/reports-table-section.tsx`

`AdminSectionHeader title="Relatórios" subtitle="histórico, estado e custo por pedido" accent="revenue"` com **filtros pill** no slot direito do header (4 botões: Todos · 147 / Entregues · 144 / Em curso · 5 / Falhados · 2) — estado local `useState<ReportFilter>`.

Os pills usam `AdminBadge` envolvido em `<button>` com aria-pressed; o seleccionado fica em `revenue` solid, os outros em `neutral` ghost. Como `AdminBadge` actual é só visual, criar componente local `<FilterPill>` no ficheiro (não merece primitivo partilhado ainda — ficaria genérico demais a este ponto).

Tabela `AdminCard className="!px-6 !py-5"` com 8 colunas conforme spec. Cada `<tr>` com `hover:bg-[var(--admin-bg-subtle)]`, `cursor-pointer`, `border-t border-admin-border`.

Coluna de acções usa `AdminActionButton` em variante "icon-only" (verificar se existe — senão usar `<button>` com `aria-label` + Radix Tooltip envolvendo cada ícone Lucide 16px). Ícones: `RotateCw` (re-enviar), `RefreshCw` (re-gerar), `Eye` (ver), `AlertCircle` (investigar — só falhados).

Estado da linha "a processar" inclui `<Loader2 className="animate-spin" size={10} />` inline antes do texto.

Rodapé: `pt-3.5 border-t border-admin-border` com texto à esquerda (11px tertiary) + dois botões `←` `→` à direita (`AdminActionButton` icon-only).

---

## Ficheiros a editar

### `src/lib/admin/mock-data.ts`

Adicionar no fim do ficheiro (sem mexer nos exports existentes):

```ts
export const MOCK_PIPELINE_PHASES = [...]   // 4 fases
export const MOCK_PIPELINE_AGGREGATES = {...}
export const MOCK_REPORT_METRICS = {...}    // 4 KPIs
export const MOCK_DAILY_VOLUME = [...]      // 30d × {date, delivered, failed, queued}
export const MOCK_DAILY_TIMING = [...]      // 30d × {date, avgSeconds}
export const MOCK_REPORTS_LIST = [...]      // 8 linhas conforme tabela do brief
export type ReportStatus = 'delivered' | 'processing' | 'queued' | 'failed'
export type ReportOrigin = 'subscription' | 'one_off'
```

Volume e timing gerados em loop determinístico (seed-like com índice) para parecerem realistas sem aleatoriedade que mude em cada render.

### `src/components/admin/v2/admin-tokens.ts`

Acrescentar ao `ADMIN_LITERAL`:
```ts
pipelineRequest: "#534AB7",
pipelineAnalysis: "#BA7517",
pipelinePdf: "#185FA5",
pipelineEmail: "#1D9E75",
chartDelivered: "#1D9E75",
chartFailed: "#E24B4A",
chartQueued: "#888780",
chartTiming: "#D85A30",
slaLine: "#888780",
healthOk: "#1D9E75",
healthWarn: "#EF9F27",
healthCritical: "#A32D2D",
```

### `src/styles/admin-tokens.css`

Adicionar `@keyframes admin-pulse-soft` + classe `.admin-pulse-dot` (2s ease-in-out infinite, opacity 1 ↔ 0.45). Usado pelo health dot. Mais sóbrio do que `animate-pulse` do Tailwind que oscila demasiado.

### `src/routes/admin.relatorios.tsx`

Substituir stub completo por composição igual ao padrão de `admin.receita.tsx`:

```tsx
<AdminPageHeader
  title="Relatórios"
  subtitle="Pipeline operacional desde o pedido até à entrega"
  actions={<><PeriodSelect .../><ExportCsvButton .../></>}
/>
<div className="flex flex-col gap-7">
  <PipelineSection />
  <MetricsSection />
  <ChartsSection />
  <ReportsTableSection />
</div>
```

`useState<AdminPeriod>("30d")` no topo; export `console.info` mock.

---

## Não tocar

- `/admin/sistema/cockpit-legado/*`
- `/report/example`
- `src/components/admin/v2/admin-card.tsx`, `kpi-card.tsx`, `admin-stat.tsx` (excepto se for preciso adicionar `deltaIntent` opt-in para o KPI de custo — só nesse caso, com default backwards-compatible)
- Outras tabs já implementadas

---

## Validação final

```bash
bunx tsc --noEmit
bun run build
```

E checagem visual rápida via `code--view` dos ficheiros novos.

---

## Checklist de aceitação

- ☐ `/admin/relatorios` deixa de ser stub
- ☐ Pipeline 4 fases com border-left colorido + valor mono 32px + health dot pulsante
- ☐ Rodapé do pipeline com 4 stats agregados e divisores verticais
- ☐ 4 `KPICard size="lg"` com tooltip "i" em todos
- ☐ BarChart empilhado (delivered/failed/queued) + LineChart com `ReferenceLine` SLA 5min
- ☐ Tabela 8 colunas, 8 linhas mock, hover warm, ícones de acção com tooltip
- ☐ Filtros pill (Todos/Entregues/Em curso/Falhados) com estado local
- ☐ Estado "a processar" com `Loader2` em spin
- ☐ Reutilização de `AdminPageHeader`, `AdminSectionHeader`, `AdminCard`, `KPICard`, `AdminBadge`, `PeriodSelect`, `ExportCsvButton`, `AdminActionButton`, `AdminInfoTooltip`
- ☐ Sem hex hardcoded fora de `ADMIN_LITERAL`
- ☐ `bunx tsc --noEmit` ✓
- ☐ `bun run build` ✓