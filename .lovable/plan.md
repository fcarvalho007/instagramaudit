## Auditoria — Apify call paths vs. `provider_call_logs`

**Sem alterações de código. Sem chamadas Apify. Sem testes contra Apify.**

---

### 1. Inventário de call sites Apify (grep)

| # | Call path | Ficheiro | Actor | Classificação | Escreve `provider_call_logs`? | Escreve `apify_lab_runs`? | Incluído no custo `/admin`? | Risco |
|---|---|---|---|---|---|---|---|---|
| 1 | Produção pública (análise) | `src/routes/api/analyze-public-v1.ts:241,297,325` via `runActorWithMetadata` | `apify/instagram-scraper` | production public analysis | **Sim** (`recordProviderCall` sempre — success + http_error + timeout, linhas 297 e 325) | Não | Sim | Baixo |
| 2 | Enrich comments (sync + sweep pg_cron) | `src/routes/api/public/enrich-comments.ts:133,194` → `comment-scraper.server.ts:270` | `apify/instagram-comment-scraper` | production + cron safety-net | **Sim** (`recordProviderCall` em success e erro) | Não | Sim | Baixo |
| 3 | Apify Lab (admin) | `src/routes/api/admin/apify-lab.ts:171,297,451` | `apify/instagram-scraper` | admin Apify Lab | **Não** | **Sim** (`apify_lab_runs`) | **Não** (KPIs `/admin` lêem só `provider_call_logs`) | **Alto — gap contabilístico** |
| 4 | Cost sync (Apify usage) | `src/lib/admin/cost-sync.server.ts:65` → `GET /v2/users/me/usage/monthly` | n/a (endpoint usage, não actor) | maintenance | n/a (não é actor run; não conta no contador de runs do dashboard) | Não | Reconciliação Apify mensal | Baixo |
| 5 | Outros usos do `APIFY_TOKEN` no código | só diagnósticos / preflight (`refresh-profile-preflight.ts`, `diagnostics.ts`, `system-queries.server.ts`) | — | infra/diagnóstico (não invoca actors) | n/a | n/a | n/a | Nenhum |

Sem outras chamadas a `https://api.apify.com/v2/acts` ou `actor-runs` no código. Sem actors `apify-client` SDK (usamos `fetch` directo via wrapper `runActorWithMetadata`).

### 2. Janela 2026-06-01 21:01-21:09 UTC (consulta real à DB)

```
apify_lab_runs   (20:55-21:15 UTC): 0 rows
provider_call_logs apify (20:55-21:15 UTC): 0 rows
último apify_lab_runs:            2026-06-01 20:09:15 UTC
último provider_call_logs apify:  2026-06-01 16:07:53 UTC
apify_lab_runs total lifetime:    36 (todos a 2026-06-01, das 18:18 às 20:09)
```

**Os 11 runs do dashboard Apify entre 21:01-21:09 UTC NÃO estão em NENHUMA das duas tabelas.** Não foram nem produção, nem comment-scraper, nem Lab. **São externos à aplicação.**

### 3. Schedules / pg_cron

- `pg_cron` agenda apenas:
  - `/api/public/hooks/sync-apify-costs` → endpoint de usage, **não** corre actors.
  - `/api/public/hooks/cleanup-expired-report-snapshots` → não toca Apify.
  - sweeps periódicos de `enrich-snapshot` / `enrich-comments` → quando correm, **logam** em `provider_call_logs`. Zero rows na janela ⇒ não foi este o caminho.
- `supabase/config.toml`: sem schedules de edge functions.
- Não temos `cron.job` legível (sem permissões), mas todas as rotas /api/public/hooks invocadas por cron são contabilizadas — e logam.

### 4. Diagnóstico do gap dashboard ↔ DB

Dois gaps distintos, com causas diferentes:

**A. Lab-only (gap conhecido, contabilístico, não-bug do logging):**
- 36 runs Lab em 2026-06-01 estão em `apify_lab_runs` mas **não** em `provider_call_logs`.
- KPIs `/admin/visão geral` e `cost-sync` lêem **só** `provider_call_logs` ⇒ Lab fica fora dos KPIs e do P&L.
- Explica boa parte da diferença "89 dashboard vs 72 PCL".

**B. 11 runs externos a 21:01-21:09 UTC (não atribuíveis ao código):**
- Não estão em `apify_lab_runs` nem em `provider_call_logs`.
- Nenhum call site no código corre actors a essa hora.
- pg_cron schedules confirmados não correm actors ou logam quando o fazem.
- **Causa provável**: actor disparado fora da aplicação — Apify Console (run manual), scheduled actor configurado no painel Apify, webhook/integração Apify-side, ou uso do `APIFY_TOKEN` em CLI/Postman/script externo.

**C. Não há evidência de call-site no código a falhar o log**: os três caminhos de actor (analyze, enrich, lab) têm cobertura `try/catch` que persiste linha de log mesmo em erro/timeout (analyze) ou row em `apify_lab_runs` (lab). O bug "runs sem log" no código está descartado para este episódio.

**D. Impossível atribuir 100% sem o painel Apify**: confirmar pede inspecção humana ao Apify Console.

### 5. Pedido de confirmação manual ao utilizador (Apify Console)

Por favor confirma no painel Apify, sem alterar nada:

1. **Scheduled actors** em https://console.apify.com/schedules — existe algum a correr `instagram-scraper` ou `instagram-comment-scraper`?
2. **Webhooks/integrações** em Settings → Integrations a usar o mesmo `APIFY_TOKEN`?
3. **API Tokens** em Settings → API & Integrations — quantos tokens existem? O `APIFY_TOKEN` configurado nos Secrets foi usado fora da app (CLI, Postman, script local)?
4. Para os 11 runs 21:01-21:09 UTC: clica em qualquer um e mostra `Origin` / `User-Agent` / `Source` — distingue actor run iniciado por SDK vs. Console vs. Schedule.

### 6. Recomendação — plano mínimo de correção (próximo prompt, não agora)

1. **Incluir Lab no P&L** — `/admin` deve somar `apify_lab_runs.actual_cost_usd` (ou `estimated_cost_usd` quando o actual é null) como linha separada "Custo I&D / Lab" para que o total bata com o dashboard Apify.
2. **Unificar wrapper** — manter `runActorWithMetadata` como único entrypoint, mas adicionar ao chamador um parâmetro obrigatório `sourceContext: "public_analysis" | "admin_lab" | "admin_refresh" | "enrich_comments" | "backfill"`. Hoje Lab é a única excepção — formalizar evita regressões.
3. **Adicionar coluna `source_context`** (texto) a `provider_call_logs` e fazer Lab passar a escrever **também** uma linha em `provider_call_logs` (com `source_context='admin_lab'`), mantendo `apify_lab_runs` como tabela rica de debug. KPIs lêem PCL com filtro `source_context <> 'admin_lab'` para o custo público e total inclui Lab.
4. **Alerta de drift** — job `pg_cron` diário que compara `sum(actual_cost_usd from /v2/users/me/usage/monthly)` com `sum(provider_call_logs + apify_lab_runs)` e abre `usage_alerts` se a diferença ultrapassar X%.
5. Após (1)-(4), os 11 runs externos continuarão visíveis no dashboard Apify mas serão atribuídos a "external/manual" no alerta — o que é o comportamento desejado.

### 7. Veredicto

- **Não há bug de logging no código aplicacional.** Os três call paths logam.
- **Há gap contabilístico real**: Lab não entra nos KPIs `/admin` (36 runs em 2026-06-01).
- **Há actividade Apify externa ao código** (11 runs 21:01-21:09 UTC) — pede confirmação humana no Apify Console para classificar (schedule Apify-side, Console run manual, ou token reutilizado fora da app).
- Ficheiros implicados: `src/routes/api/admin/apify-lab.ts` (Lab não escreve PCL), `src/lib/admin/system-queries.server.ts` + `src/lib/admin/cost-sync.server.ts` (KPIs lêem só PCL), `src/lib/analysis/apify-client.ts` (wrapper único — sem `source_context`).

### Próximo prompt sugerido

> "Plano em Plan Mode: incluir `apify_lab_runs` na contabilidade de custo `/admin` como linha separada I&D, **sem alterar** o flow público nem o Lab. Mostrar no painel Visão Geral / Receita o total Apify = Produção (PCL) + Lab (apify_lab_runs). Mostrar `usage_alerts` quando o usage Apify (dashboard) divergir da soma local em >10%."
