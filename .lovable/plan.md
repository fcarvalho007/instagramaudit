# Receita e despesas + bugs /admin

## Objetivo

1. Renomear a tab `Receita` para `Receita e despesas`.
2. Trazer a visibilidade das despesas reais (Apify, OpenAI, DataForSEO) para dentro dessa tab — neste momento só estão visíveis dentro de `Sistema`, escondidas a quem quer ler o negócio.
3. Manter os custos sempre reais (já estão — o endpoint `expense-30d` já lê de `provider_call_logs` e `cost_daily`).
4. Corrigir bugs / refinamentos que detectei no /admin.

## Auditoria do estado atual

**O que já funciona bem:**
- Endpoints reais: `/api/admin/sistema/cost-metrics-24h`, `/expense-30d`, `/provider-calls`, `/health` — todos a ler da BD com `supabaseAdmin`.
- BD tem dados reais (últimos 30d): Apify 9 chamadas / $0.099 est., OpenAI 9 chamadas / $0.011 est., DataForSEO 8 chamadas / $0.054 reais.
- Refresh automático cada 60 s (React Query).
- Demo Mode global a respeitar `DemoOnlySection` (custos ficam sempre reais, conforme regra).

**Bugs / refinamentos detetados:**
1. **Endpoint `expense-30d` órfão** — está implementado (`fetchExpense30d`) mas nenhum componente o consome. Tem totais por fornecedor + série diária 30d + saldo DataForSEO. Desperdício total.
2. **Botão "Exportar CSV" em `/admin/receita` é mock** (`console.info` só) — sem feedback, parece partido.
3. **Etiqueta da tab desalinhada com a realidade do negócio** — chamar-se "Receita" sugere apenas entradas; despesa fica escondida em Sistema.
4. **Aviso de pagamentos pendente** — receita está toda em `DemoOnlySection` com `pendingReason` correto. OK, mas o utilizador beneficia se a despesa REAL aparecer mesmo sem receita ligada (mostra que o sistema funciona e quanto está a custar).
5. (Menor) `LegacyAccessSection` ainda visível em Sistema — não é bug, mas valida-se que continua útil.

## Mudanças

### 1. Renomear a tab

`src/components/admin/v2/admin-tabs-nav.tsx`:
- Trocar `label: "Receita"` → `label: "Receita e despesas"`.

`src/routes/admin.receita.tsx`:
- `AdminPageHeader` title `Receita` → `Receita e despesas`.
- Subtitle: `Subscrições e custos reais por fornecedor` (mais honesto que o atual).

(O path `/admin/receita` mantém-se — não vale a pena migração de URL para um cosmético.)

### 2. Nova secção "Despesa real por fornecedor" (sempre visível, sempre real)

Novo ficheiro: `src/components/admin/v2/receita/expense-by-provider-section.tsx`.

- Consome `/api/admin/sistema/expense-30d` via React Query (`refetchInterval: 60_000`, `queryKey: ["admin","receita","expense-30d"]`).
- **Linha 1 — KPIs (4 cards):** Apify 30d / OpenAI 30d / DataForSEO 30d / Total 30d. Cada um mostra USD + nº de chamadas. KPI Total com `delta` se houver série suficiente (semana atual vs anterior).
- **Linha 2 — saldo DataForSEO** (quando `dataforseo_balance != null`): card pequeno com `KPICard size="sm"` + badge `signal` se baixo.
- **Acento** da secção: `expense` (já existe nos tokens, é a mesma cor que Sistema usa para custos — coerência visual).
- Estados: `SectionSkeleton` enquanto carrega, `SectionError` com retry, `SectionEmpty("Sem custos registados nos últimos 30 dias.")` quando totais são zero.
- **NÃO** envolver em `DemoOnlySection` — esta secção é real-first sempre, mesmo com Demo Mode ligado (custos = sagrados, conforme o pedido anterior).

### 3. Nova secção "Despesa diária por fornecedor" (gráfico)

Novo ficheiro: `src/components/admin/v2/receita/expense-daily-section.tsx`.

- Consome o array `daily` do mesmo endpoint (sem segunda chamada — partilha a query key e usa `useQuery` com seletor, ou recebe via prop do parent).
- Gráfico de barras empilhadas (recharts já está no projeto): eixo X = dia (30d), Y = USD, séries = Apify (cor expense), OpenAI (cor info), DataForSEO (cor signal). Tooltip com totais.
- Mesma política: real-first, sem Demo Mode wrapping. Mostra `SectionEmpty` se todos os pontos forem zero.

### 4. Reordenar a tab

Nova ordem em `src/routes/admin.receita.tsx`:

```text
1. MetricsSection            (DemoOnly — receita)
2. WaterfallSection          (DemoOnly — receita)
3. ExpenseByProviderSection  (REAL — despesa) ← novo, em destaque
4. ExpenseDailySection       (REAL — despesa) ← novo
5. PlansSection              (DemoOnly — receita)
6. CohortSection             (DemoOnly — receita)
7. InvoicesSection           (DemoOnly — receita)
```

Justificação da ordem: receita resumida no topo (mesmo que mock pendente), despesa real a seguir para criar contraste com a realidade actual (despesa > 0, receita = 0), e tabelas detalhadas no fundo.

### 5. Correção de bugs colaterais

- **Export CSV mock**: substituir por toast `"Exportação ainda não disponível — em breve."` em vez de `console.info` mudo. (Opção mínima — implementar export real fica fora deste âmbito; só corrige a impressão de "botão partido".)
- **Subtítulo do header** revisto para coerência.
- **Aria-label** da nav: já é "Secções do admin" — ok.

## Não-objetivos (intencionalmente fora)

- Não implementar export CSV real (requer endpoint dedicado; pedir aprovação separada).
- Não criar nova tab `Despesas` independente — fica tudo dentro de `Receita e despesas` conforme o pedido.
- Não duplicar a secção `Custos detalhados` que vive em `Sistema` (essa é técnica: últimas chamadas + alertas + cache hits 24h). A nova vive no plano de negócio: visão 30d por fornecedor.
- Não tocar nos cron hooks de sincronização (`sync-apify-costs`, `sync-openai-costs`, `sync-dataforseo-costs`) — já correm a popular `cost_daily`.
- Não alterar o path da rota (`/admin/receita`).

## Detalhes técnicos

- Tipo `Expense30d` já existe em `@/lib/admin/system-queries.server` — reutilizar.
- `KPICard`, `AdminCard`, `AdminSectionHeader`, `AdminBadge`, `SectionEmpty/Error/Skeleton` — todos já no design system v2.
- Tokens: usar `accent="expense"` no header das duas novas secções; cores das séries do gráfico via `ACCENT_500` para apify/openai/dataforseo.
- Sem novas dependências.
- Sem migração de BD.
- Sem mudanças em secrets ou edge functions.

## Checkpoint

- ☐ Tab `/admin` mostra label `Receita e despesas`.
- ☐ Header da página mostra `Receita e despesas` + subtítulo coerente.
- ☐ Nova secção `Despesa real por fornecedor` aparece com 4 KPIs reais (Apify $0.099, OpenAI $0.011, DataForSEO $0.054 nos dados atuais).
- ☐ Card de saldo DataForSEO presente quando endpoint devolve valor.
- ☐ Novo gráfico diário 30d empilhado por fornecedor.
- ☐ Demo Mode NÃO esconde nem altera as duas secções de despesa (continuam reais).
- ☐ Botão Exportar CSV deixa de ser silencioso.
- ☐ Build passa sem erros TypeScript.
