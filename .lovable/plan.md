
# Prompt A — Auditoria da fuga de logging Apify

Sem alterações de código. Sem chamadas Apify. Pura auditoria.

## 1. Inventário de call sites do `runActor*`

A única porta de saída para a API Apify é `src/lib/analysis/apify-client.ts`
(`runActor` e `runActorWithMetadata`). Os 3 únicos call sites confirmados são:

| # | Ficheiro | Wrapper | Escreve em `provider_call_logs`? | Escreve em `apify_lab_runs`? |
|---|----------|---------|----------------------------------|------------------------------|
| 1 | `src/routes/api/analyze-public-v1.ts` (linha 241) | `runActorWithMetadata` | **Sim** — `recordProviderCall` é chamado 2x (linhas 297 e 325) | Não |
| 2 | `src/lib/analysis/comment-scraper.server.ts` (linha 270), invocado por `src/routes/api/public/enrich-comments.ts` | `runActorWithMetadata` | **Sim** — `recordProviderCall` linhas 133 e 194 de `enrich-comments.ts` | Não |
| 3 | `src/routes/api/admin/apify-lab.ts` (linha 297) | `runActorWithMetadata` | **Não** — só faz `insert` em `apify_lab_runs` | Sim |

`/api/analyze/refresh.ts` e `/api/admin/generate-beta-report.ts` delegam
para `/api/analyze-public-v1` por HTTP server-to-server, pelo que o
logging ocorre dentro de `analyze-public-v1` (caso #1). Não introduzem
nova superfície.

Não existe nenhum outro `fetch` para `api.apify.com` no repo
(`grep apify.com` confirma só `apify-client.ts`).

## 2. Cruzamento com a janela "Apify dashboard 21:01–21:09 UTC, 11 runs"

A última row em `provider_call_logs` (provider=apify) é
`2026-06-01 16:07:53 UTC`. Entre 16:07 e a meia-noite só existe actividade
no Lab. Contagem em `apify_lab_runs`:

| Janela | Rows no Lab |
|--------|-------------|
| 2026-06-01 18:00–19:00 UTC | 21 |
| 2026-06-01 19:00–20:00 UTC | 2  |
| 2026-06-01 20:00–21:00 UTC | 13 |
| **2026-06-01 20:01–20:10 UTC** | **13** (todas com `apify_run_id`) |

O burst de 20:01–20:09 UTC corresponde a uma matriz Lab (3 perfis ×
5 janelas com alguns retries/timeouts) — `frederico.m.carvalho`,
`martimsilvai`, `mariiana.ai` em `baseline / 30d / 60d / 90d`.

A diferença horária bate certo com **WEST (UTC+1)**: o dashboard Apify
em hora local de Lisboa mostra `21:01–21:09`, mas em UTC são
`20:01–20:09`. Os "11 runs" do dashboard mapeiam quase 1-para-1 com as
13 rows de Lab nessa janela (a diferença de 2 explica-se pelas runs
`status='failed'`/`timeout` sem `apify_run_id`, que o dashboard pode
agregar de forma diferente, ou por filtro de duração no dashboard).

Conclusão: **nenhum dos 11 runs em falta corresponde a uma chamada
fora do wrapper**. Todos passam por `runActorWithMetadata`. O que
falta é a escrita em `provider_call_logs` para o caminho Lab.

## 3. Causa identificada

A fuga é **estrutural, não acidental**:

- `src/routes/admin.apify-lab.tsx` (linha 351) declara explicitamente
  que "Nada é escrito em `report_snapshots`, `provider_call_logs`,
  `leads` ou pipelines de produção".
- `src/routes/api/admin/apify-lab.ts` insere apenas em `apify_lab_runs`
  e nunca chama `recordProviderCall`.

Resultado: cada execução do Lab consome créditos reais Apify, aparece
no dashboard Apify, mas é invisível para:

- `/admin` Despesa 24h / 30d (lê `provider_call_logs`)
- `cost_daily` (agregado de `provider_call_logs` via
  `cost-sync.server.ts`)
- `apify-budget.server.ts` (kill-switch baseado em
  `provider_call_logs.estimated_cost_usd`)
- Reconciliação `provider_billing_imports`

## 4. Resposta às hipóteses do prompt

| Hipótese | Veredicto |
|----------|-----------|
| (1) Runs do `/admin/apify-lab` que não entram em `provider_call_logs` | **CONFIRMADO** — é esta a causa |
| (2) Calls directas fora do wrapper | **Descartado** — único `fetch` para `api.apify.com` está em `apify-client.ts` |
| (3) Scheduled actors / uso externo do `APIFY_TOKEN` | **Não evidenciado no repo.** Resta a pergunta operacional (Apify Console): se houver schedules/webhooks/actor calls com o mesmo token feitos fora desta app, só a Apify Console os mostra. As 11 runs em causa são integralmente explicadas pelo Lab — esta hipótese fica em aberto como verificação manual mas sem indício de drift. |

## 5. Ficheiros implicados

- `src/lib/analysis/apify-client.ts` — wrapper único
- `src/lib/analysis/events.ts` — `recordProviderCall` (a função que o Lab não chama)
- `src/routes/api/admin/apify-lab.ts` — call site sem logging
- `src/routes/admin.apify-lab.tsx` — UI que documenta o gap como intencional
- `src/lib/admin/cost-sync.server.ts` — consumidor a jusante (não vê Lab)
- `src/lib/security/apify-budget.server.ts` — kill-switch a jusante (não vê Lab)

## 6. Resultado

- **Bug de logging real?** Não no sentido clássico — é uma decisão
  documentada do Lab para não poluir métricas de produção. Mas é um
  **gap de accounting real**: créditos Apify queimados pelo Lab são
  invisíveis na contabilidade global.
- **Drift Lab → dashboard:** as 11 runs órfãs do dashboard são Lab,
  não chamadas fantasma.
- **Próximo passo recomendado (a fazer noutro prompt, em Plan Mode):**
  adicionar `source_context` em `provider_call_logs`
  (`public_analysis | admin_lab | admin_refresh | backfill`) e fazer
  o Lab escrever uma linha com `source_context='admin_lab'` em paralelo
  com `apify_lab_runs`. `/admin` passa a poder filtrar/segmentar custo
  por origem em vez de esconder Lab. Reconciliação contra Apify
  Console deixa de ter falsos positivos.

## 7. Verificação operacional pendente (fora do repo)

Para fechar a hipótese (3) com 100%:

- Apify Console → **Schedules**: confirmar que não há schedules activos.
- Apify Console → **Integrations / Webhooks**: confirmar que o token
  não está colado em outro produto.
- Apify Console → **API tokens**: confirmar que só existe o token
  configurado em Lovable.

Sem isto, a auditoria por código não consegue provar (3) — pode apenas
afirmar que dentro do repo não há outro caller.
