
## Diagnóstico

Confirmado no DB: existem **apenas 7 snapshots reais** em `analysis_snapshots`, mas `social_profiles.analyses_total` tem valores inflacionados (frederico=1627, lg_portugal=194, martimsilvai=143, …). Razão: esse contador soma TODOS os pedidos (cache + fresh + falhas), não análises reais.

Assim, qualquer "166 análises" que aparece em /admin/perfis vem de:
- `social_profiles.analyses_total` (lifetime, inclui cache hits e tentativas), exposto em badges e na coluna "Análises lifetime", OU
- pesquisas repetidas a contar como "análise".

A coluna **Cache** representa precisamente isso: quando um pedido para o mesmo handle chega dentro do TTL, devolvemos o snapshot guardado em vez de chamar a Apify novamente (poupa custo e latência). O contador `analyses_cache` incrementa em cada cache hit. É um sinal operacional útil mas **não é uma análise nova**.

---

## Plano

### 1. /admin/perfis — clarificar "análise" vs "cache" vs "pesquisa"

**Conceito**: 1 análise = 1 snapshot gerado (linha em `analysis_snapshots`). Tudo o resto é **pesquisa** (request) que pode resolver via cache ou produzir nova análise.

- `MetricsSection`:
  - **Remover** o 4º KPI "Conversão · 30d / análise → report" (pedido explícito).
  - Renomear "Perfis únicos" → mantém, mas tooltip explícito: "perfis com pelo menos 1 análise nova (snapshot) na janela".
  - "Perfis repetidos" passa a usar `analyses_in_window ≥ 2` (snapshots, não `analyses_total` que inclui cache). Endpoint `profiles.metrics` ajustado em conformidade.
  - "Com relatório" mantém.
  - Grid passa a 3 colunas.

- `ProfilesTableSection`:
  - Renomear coluna **"Análises"** → **"Análises"** (mantém, mas valor = `analyses_in_window`, real, ≤ 7 hoje). Tooltip no header: "snapshots gerados na janela".
  - Renomear coluna **"Cache"** → **"Cache hits"** com tooltip: "pesquisas servidas a partir de snapshot guardado (não geraram análise nova). Usado para poupar custo de provider."
  - Adicionar pequena legenda por baixo da tabela: "Análise = snapshot novo. Cache = pesquisa repetida servida do cache (sem custo)."
  - Filtro "Repetidos" passa a usar `analyses_in_window ≥ 2`.

- `IntentOpportunitiesSection`:
  - Substituir o atual `EmptyStateCard` por uma versão **realmente útil** já que existe sinal: ler `analysis_events` agrupado por `handle` (não-`request_ip_hash`-dependente) e listar perfis com `count_events ≥ 3` mas `0 snapshots gerados na janela` ou `0 reports`. Ou seja: **handles muito pesquisados mas sem conversão para snapshot/email**.
  - Novo endpoint `GET /api/admin/profiles/intent-opportunities?period=…` que devolve `[{ handle, searches, last_search_at, has_snapshot, has_lead }]` (top 20).
  - UI: tabela compacta com handle, nº pesquisas, último timestamp, badge "sem snapshot" / "sem lead" e CTA "Forçar análise" (reusa endpoint existente `refresh-profile`).
  - Manter nota curta a explicar limitação (sem dedup por user real até existir auth pública).

### 2. /admin/relatorios — KPIs, custo, tabela

- `MetricsSection`:
  - **Remover** KPI "Entrega · sucesso" (pedido explícito).
  - Reordenar para destacar o que importa (pedido do utilizador):
    1. **Pediram análise** — total de snapshots/pesquisas na janela (fonte: `analysis_snapshots`, valor real, hoje = 7).
    2. **Submeteram email (lead magnet)** — `with_unlock` + `unlock_rate_pct` como sub.
    3. **Custo médio · análise** — mantém, mas ver ponto seguinte.
  - Tornar grid responsivo (3 colunas em vez de 4).

- **Validação do custo médio**:
  - Fonte actual em `report-requests.metrics`: soma `provider_call_logs.actual_cost_usd ?? estimated_cost_usd` na janela ÷ `total_analyses`. Hoje: 157 logs em 30d ÷ 7 snapshots = média artificialmente alta (inclui re-runs, cache lookups que NÃO geraram snapshot, OpenAI insights, etc.).
  - Correcção: dividir por `count(provider_call_logs WHERE actor LIKE 'apify%')` agrupado, OU mostrar **dois valores**:
    - "Custo total na janela" (soma real)
    - "Custo por análise nova" (soma ÷ snapshots da janela)
  - Adicionar tooltip a apontar que esta linha bate com a soma exposta em `/admin/receita` (waterfall + cost_daily reconciliação Apify). Já é o caso pela query, mas explicitar e cross-link.
  - Nota de auditoria: confirmar manualmente alinhamento com `cost_daily` (provider='apify') e com `provider_billing_imports` reconciliados antes de fechar.

- `ReportsTableSection`:
  - **Remover coluna "Duração"** (`formatDuration` deixa de ser usado).
  - **Renomear coluna "Lead"** → **"Registo"**, com:
    - Se `lead != null` e `lead.email` presente → badge verde "Email submetido" + nome/email por baixo.
    - Se `lead == null` (snapshot anónimo) → badge cinza "Anónimo".
  - **Botão "Ver relatório"** explícito (substitui o ícone Eye discreto):
    - Para `kind === "request"` → botão pequeno `<AdminActionButton>` com label "Ver" que abre o `ReportDrawer` actual.
    - Para `kind === "snapshot"` (análise pública sem request) → botão "Ver análise" que abre `/analyze/$username` em nova tab (snapshots não têm drawer, mas têm página pública).
  - Manter a coluna "Origem" e badges existentes.

### 3. Endpoints a tocar

- `src/routes/api/admin/profiles.metrics.ts` — `repeated` passa a usar snapshots em janela.
- `src/routes/api/admin/profiles.list.ts` — adicionar `last_search_at` se necessário (já tem `last_analyzed_at`).
- **Novo**: `src/routes/api/admin/profiles.intent-opportunities.ts`.
- `src/routes/api/admin/report-requests.metrics.ts` — opcional, expor `total_cost_usd` separado de `avg_cost_usd`.

### 4. Componentes a tocar

- `src/components/admin/v2/perfis/metrics-section.tsx`
- `src/components/admin/v2/perfis/profiles-table-section.tsx`
- `src/components/admin/v2/perfis/intent-opportunities-section.tsx` (reescrito)
- `src/components/admin/v2/relatorios/metrics-section.tsx`
- `src/components/admin/v2/relatorios/reports-table-section.tsx`

### Fora de scope (não tocar)

- `social_profiles.analyses_total` continua a contar tudo (é útil em outras vistas). Só mudamos a **interpretação** na UI de /admin/perfis.
- /admin/receita — apenas verificação manual de alinhamento, sem alterações.

---

## Checkpoint

- ☐ /admin/perfis: KPI "Conversão · 30d" removido; grid 3 colunas.
- ☐ Coluna "Cache" renomeada para "Cache hits" com tooltip claro; legenda por baixo da tabela.
- ☐ "Perfis repetidos" usa snapshots na janela (não `analyses_total`); valores realistas (hoje ~0).
- ☐ "Oportunidades de conversão" mostra handles com ≥3 pesquisas sem snapshot/lead, via novo endpoint.
- ☐ /admin/relatorios: KPI "Entrega · sucesso" removido.
- ☐ KPIs reordenados (Pediram análise → Email submetido → Custo médio).
- ☐ Custo médio confirmado contra `/admin/receita` e tooltip ligado.
- ☐ Tabela: coluna "Duração" removida; "Lead" → "Registo" com badge anónimo/email submetido.
- ☐ Botão "Ver" explícito por linha (drawer para requests, página pública para snapshots).
- ☐ Build verde, sem warnings TS.
