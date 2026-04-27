## Tab Sistema do Admin

Última tab do redesign. Substitui o stub em `/admin/sistema` por uma vista operacional/técnica completa: estado, segredos, custos detalhados, alertas, e acesso ao cockpit legado.

Mantém as convenções já consolidadas das 5 tabs anteriores: `AdminPageHeader` no topo, secções verticais com `gap-7`, `AdminSectionHeader` com barra colorida + tooltip "i", reutilização total dos componentes partilhados.

---

## Estrutura

```text
┌─ AdminPageHeader (Sistema · acções: Smoke test, Atualizar) ─┐
├─ Secção 1 · Estado do sistema (cinza) ──────────────────────┤
│   Cartão único:                                             │
│   ├ Readiness strip — 5 chips com semáforo                  │
│   └ Smoke test — 5 verificações em lista vertical           │
├─ Secção 2 · Segredos e configuração (cinza) ────────────────┤
│   ├ Cartão Segredos (4 chips mono)                          │
│   ├ Cartão Apify config (grid 2×2)                          │
│   └ Sub-cartão Allowlist (badge + chips)                    │
├─ Secção 3 · Custos detalhados (âmbar/expense) ──────────────┤
│   ├ 4 KPICard size lg                                       │
│   ├ Cartão Últimas chamadas (tabela 8 colunas, 10 linhas)   │
│   └ Cartão Alertas (2 alertas + ver todos)                  │
└─ Secção 4 · Cockpit legado (cinza, accordion) ──────────────┘
    Header colapsável → link "Abrir em nova aba ↗"
```

---

## Secção 1 · Estado do sistema

`accent="neutral"`, info tooltip a explicar semântica das cores.

**Cartão único** (`AdminCard`):

**Readiness strip** — `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-admin-border-soft rounded-lg overflow-hidden`. Cada chip:
- Header: dot 8px (verde/âmbar/vermelho via `healthOk`/`healthWarn`/`healthCritical`) + eyebrow uppercase mono 10px tertiary
- Valor: 13px primary

5 chips: APIFY · RESEND · OPENAI · MODO TESTE · ALLOWLIST.

**Smoke test** — separado por `border-t border-admin-border mt-7 pt-6`:
- Header: "Verificações de runtime" 16px medium + sub 12px tertiary + `<AdminBadge variant="revenue">Pronto</AdminBadge>` à direita
- Lista de 5 linhas (não tabela), cada uma `flex justify-between py-3 border-b border-admin-border` (excepto última)
- Esquerda: nome 13px primary; direita: detalhe 12px com `text-admin-revenue-700` + `<Check size={14}>`

---

## Secção 2 · Segredos e configuração

`accent="neutral"`, grid 2 colunas (`lg:grid-cols-2 gap-4`).

**Cartão Segredos** (esquerdo):
- Header com tooltip "Apenas estado de presença. Os valores nunca são expostos no admin."
- Lista de 4 chips em `flex flex-col gap-2`:
  - `bg-admin-bg-subtle rounded-lg px-3.5 py-3 flex items-center justify-between`
  - Esquerda: nome em mono 12px primary
  - Direita: `<AdminBadge variant="revenue">Configurado</AdminBadge>` ou `variant="danger">Em falta`

**Cartão Apify config** (direito):
- Header com tooltip
- Grid 2×2 (`grid grid-cols-2 gap-px bg-admin-border-soft rounded-lg overflow-hidden`):
  - APIFY_ENABLED · MODO TESTE · CUSTO/PERFIL · CUSTO/POST
  - Cada cell: eyebrow uppercase mono 10px + valor mono 14px + sub 11px tertiary

**Sub-cartão Modo de teste** (full-width, `mt-4`, `AdminCard` ou box dentro da secção):
- Header 14px medium + texto 12px secondary
- Linha: `<AdminBadge variant="revenue">Activo</AdminBadge>` + chips mono dos handles + botão pequeno "Editar allowlist →" (mock)

---

## Secção 3 · Custos detalhados

`accent="expense"`, info tooltip a deixar claro que é estimativa interna, não fatura.

**4 KPICard size="lg"** num `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`:
1. Custo Apify · 24h → `$1.42` / 12 chamadas
2. Custo OpenAI · 24h → `$0.87` / 8 análises IA
3. Cache hits · 24h → `15` / 61% das pesquisas
4. Poupança · cache → `$0.82` / vs sem cache

**Cartão "Últimas chamadas ao provedor"**:
- Header dentro do cartão: 16px medium + sub
- Tabela 8 colunas: Quando · Provedor · Actor/Modelo · Handle · Estado · HTTP · Duração · Custo
- 10 linhas, padding `py-3`, border-top entre linhas, hover bg subtle
- Provedor: `AdminBadge` âmbar (`expense`) para Apify, azul (`info`) para OpenAI
- Estado: `revenue` Sucesso · `expense` Cache · `danger` Falha
- Restantes colunas: mono 12px com `tabular-nums`

**Cartão "Alertas"**:
- Header: "Alertas" 16px medium + `<AdminBadge variant="expense">2 abertos</AdminBadge>`
- Lista de 2 cards `border-l-[3px]` + bg suave usando `ACCENT_BG_50`:
  - **Aviso** (`signal` → âmbar): eyebrow mono uppercase + título 13px + detalhe 12px secondary + tempo
  - **Crítico** (`danger` → vermelho): mesma estrutura
- Botão rodapé: "Ver todos os alertas →" (mock)

---

## Secção 4 · Cockpit legado (accordion)

`accent="neutral"`, info tooltip a explicar transição.

Cartão único com Radix `Collapsible` (já disponível via shadcn). Header sempre visível:
- Título 14px medium "Cockpit técnico legado"
- Sub 12px tertiary
- `<ChevronRight>` à direita que roda 90° quando aberto (CSS transition)
- Cursor pointer + hover bg subtle

Conteúdo expandido (`border-t mt-4 pt-4`):
- Link explícito em vez de iframe (decisão: evita duplo header e estilos colidirem):

```tsx
<a
  href="/admin/sistema/cockpit-legado"
  target="_blank"
  rel="noopener"
  className="inline-flex items-center gap-2 text-[13px] text-admin-info-700 hover:underline"
>
  Abrir cockpit legado em nova aba <ExternalLink size={14} />
</a>
```

Verificar se `@radix-ui/react-collapsible` já está nas deps (shadcn instala-o via `accordion`/`collapsible`). Se não estiver, adicionar com `bun add @radix-ui/react-collapsible` antes de criar o ficheiro.

---

## Mock data — adicionar a `src/lib/admin/mock-data.ts`

```ts
export type MockHealthStatus = 'operational' | 'attention' | 'critical';

export interface MockSystemHealthChip { service: string; status: MockHealthStatus; detail: string; }
export interface MockSmokeCheck { name: string; status: 'ok' | 'warn' | 'fail'; detail: string; }
export interface MockSecret { name: string; configured: boolean; }
export interface MockProviderCall {
  when: string;          // "26/04 21:14"
  provider: 'Apify' | 'OpenAI';
  model: string;         // "apify/instagram-scraper" | "gpt-4o"
  handle: string;        // "@nikeportugal" ou "analysis #2843"
  status: 'success' | 'cache' | 'failure';
  http: number;          // 200 / 429 / 500
  duration: string;      // "6.4s" / "184ms"
  cost: string | null;   // "$0.011" ou null → "—"
}
export interface MockAlert {
  severity: 'warning' | 'critical' | 'info';
  title: string;
  detail: string;
  when: string;
}
```

Constantes: `MOCK_SYSTEM_HEALTH`, `MOCK_SMOKE_CHECKS`, `MOCK_SECRETS`, `MOCK_APIFY_CONFIG`, `MOCK_COST_METRICS`, `MOCK_PROVIDER_CALLS` (10 entradas conforme tabela), `MOCK_ALERTS` (2 entradas).

Sem dados sensíveis, sem secrets reais — só nomes de variáveis e estado boolean. `secrets--fetch_secrets` não é necessário porque tudo é mock; o admin nunca expõe valores.

---

## Ficheiros

**Criar:**
- `src/components/admin/v2/sistema/health-section.tsx`
- `src/components/admin/v2/sistema/secrets-config-section.tsx`
- `src/components/admin/v2/sistema/costs-detail-section.tsx`
- `src/components/admin/v2/sistema/legacy-access-section.tsx`

**Editar:**
- `src/routes/admin.sistema.tsx` — substituir stub pela página completa (mesmo padrão das outras tabs: `AdminPageHeader` + 4 secções verticais)
- `src/lib/admin/mock-data.ts` — adicionar tipos e constantes

**Não tocar:**
- `src/routes/admin.sistema.cockpit-legado.tsx` (acessível via link da secção 4)
- `/report/example`
- Lógica de routing existente

---

## Reutilização (zero duplicação)

- `AdminPageHeader` · `AdminSectionHeader` (com `info`) · `AdminCard` (variant default + flush)
- `AdminBadge` (variants `revenue`, `expense`, `danger`, `info`, `signal`)
- `KPICard size="lg"` para a strip de custos
- `AdminActionButton` para "Smoke test" e "Atualizar" no header
- `AdminInfoTooltip` (vem do `info` prop do header)
- Tokens: `ADMIN_LITERAL.healthOk/Warn/Critical` para os dots, `ACCENT_BG_50` para o background dos alertas
- Sem novos componentes partilhados — só componentes locais à secção (chip, smoke row, secret row, provider row, alert card, accordion header)

---

## Detalhes técnicos

- **Recharts**: não necessário nesta tab (não há gráficos, só tabela e KPIs).
- **Estado local**: o accordion da secção 4 usa `useState<boolean>` simples. Sem persistência (reset por navegação é aceitável).
- **Acessibilidade**: o accordion deve ser `<button aria-expanded aria-controls>` com painel `<div id role="region">`. Se Radix Collapsible já estiver disponível, preferir.
- **Mobile**: readiness strip cai para `grid-cols-2` em sm e `grid-cols-1` em mobile; tabela de chamadas mantém scroll horizontal via `overflow-x-auto` (já é o padrão das outras tabelas).
- **Nav**: a tab activa em `/admin/sistema` continua a usar a regra do nav (sublinhado neutral-900) — não requer alteração.

---

## Validação

```bash
bunx tsc --noEmit
bun run build
```

---

## Checklist

- ☐ Tab Sistema acessível em `/admin/sistema` (substitui stub)
- ☐ Readiness strip de 5 chips com cores semânticas
- ☐ Smoke test com 5 verificações em lista vertical
- ☐ Secção segredos com 4 chips mono e badges de estado
- ☐ Apify config em grid 2×2
- ☐ Sub-cartão modo teste com handles em chips mono
- ☐ 4 KPICards lg de custos com tooltips
- ☐ Tabela "Últimas chamadas" com 10 linhas e 8 colunas, badges semânticas
- ☐ Cartão alertas com 2 itens (aviso âmbar + crítico vermelho) e border-left
- ☐ Cockpit legado em accordion com link "Abrir em nova aba ↗" (não iframe)
- ☐ Reutiliza todos os componentes partilhados, zero duplicação
- ☐ `bunx tsc --noEmit` ✓
- ☐ `bun run build` ✓