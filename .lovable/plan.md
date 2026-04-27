# Integração DataForSEO — Plano

## Decisões já tomadas
- **Endpoints**: Keywords Data (Google Trends), DataForSEO Labs (Keyword Ideas / Related), SERP (Google Organic).
- **Ambiente**: produção directa (`https://api.dataforseo.com`).
- **Modo**: Live API síncrono (sem tasks/postbacks).
- **Idioma/locale por defeito**: `pt`, `Portugal`, `desktop` (parametrizável por chamada).

## Princípios de segurança e custo (espelham o padrão Apify)

1. **Kill-switch obrigatório** — `DATAFORSEO_ENABLED` tem de ser literalmente `"true"`. Default OFF.
2. **Allowlist enquanto testamos** — `DATAFORSEO_TESTING_MODE !== "false"` força que apenas handles em `DATAFORSEO_ALLOWLIST` (CSV) possam disparar chamadas live.
3. **Credenciais server-only** — `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` em texto simples; Base64 feito em runtime dentro de `createServerFn` / server route. Nunca prefixar com `VITE_`.
4. **Cache agressiva** — todos os pedidos passam por `provider_call_logs` + cache em `analysis_snapshots` extra-payload (TTL: Trends 24h, Labs 7 dias, SERP 12h).
5. **Cap de custo por chamada** — defensivamente limitar `limit`/`depth` por endpoint antes do POST.
6. **Logging completo** — toda a chamada (sucesso, falha, blocked, cache_hit) escreve linha em `provider_call_logs` com `provider='dataforseo'`, `actor=<endpoint>`, custo estimado e devolvido pela API (campo `cost` da resposta DataForSEO).
7. **Sem expansão de scope** — não tocar em Apify, `/report/example`, `/analyze/$username`, billing, PDF, email.

## Ficheiros a criar

```text
src/lib/security/dataforseo-allowlist.ts        # gate + kill-switch (espelho do Apify)
src/lib/dataforseo/client.ts                    # fetch wrapper + Basic Auth + erros tipados
src/lib/dataforseo/types.ts                     # tipos partilhados + erros
src/lib/dataforseo/endpoints/google-trends.ts   # Keywords Data → Google Trends Explore
src/lib/dataforseo/endpoints/keyword-ideas.ts   # Labs → Keyword Ideas / Related Keywords
src/lib/dataforseo/endpoints/serp-organic.ts    # SERP → Google Organic Live Advanced
src/lib/dataforseo/cost.ts                      # parser de custo a partir da resposta
src/lib/dataforseo/cache.ts                     # camada de cache thin (chave determinística)
src/routes/api/admin/dataforseo-diagnostics.ts  # endpoint admin: status + últimas chamadas
src/routes/api/admin/dataforseo-test.ts         # endpoint admin: smoke-test um keyword/handle
```

## Ficheiros a editar

```text
src/components/admin/v2/sistema/secrets-config-section.tsx
  → adicionar status visível dos 4 secrets DataForSEO (apenas presente/ausente)

src/components/admin/cockpit/panels/diagnostics-panel.tsx
  → adicionar bloco "DataForSEO" (kill-switch, allowlist, últimas 5 chamadas, custo 30d)

src/lib/admin/diagnostics.ts (se existir; senão criar adapter no panel)
  → ler provider_call_logs filtrado por provider='dataforseo'
```

## Ficheiros explicitamente NÃO tocados
- `src/lib/analysis/apify-client.ts`, `src/lib/security/apify-allowlist.ts`
- `src/routes/analyze.$username.tsx`, `src/routes/report.example.tsx`
- `src/routes/api/analyze-public-v1.ts` (DataForSEO entra como camada futura, não automática)
- Tudo em `LOCKED_FILES.md`

## Migração de base de dados

Nenhuma tabela nova. `provider_call_logs` já tem `provider text DEFAULT 'apify'` — basta passar `provider: 'dataforseo'` nos inserts. Validei no schema: todas as colunas necessárias existem (`actor`, `handle`, `status`, `http_status`, `duration_ms`, `estimated_cost_usd`, `actual_cost_usd`, `error_excerpt`).

**Único ajuste opcional**: index parcial para queries do diagnóstico:

```sql
CREATE INDEX IF NOT EXISTS idx_provider_call_logs_dataforseo
  ON public.provider_call_logs (created_at DESC)
  WHERE provider = 'dataforseo';
```

## Secrets a pedir ao utilizador (4)

| Secret | Tipo | Onde se obtém |
|---|---|---|
| `DATAFORSEO_LOGIN` | texto simples | dashboard.dataforseo.com → API Access |
| `DATAFORSEO_PASSWORD` | texto simples | dashboard.dataforseo.com → API Access |
| `DATAFORSEO_ENABLED` | `"true"` ou `"false"` | tu defines — começa `"false"` |
| `DATAFORSEO_ALLOWLIST` | CSV (ex. `frederico.m.carvalho,nike,sephora`) | tu defines |

Não vamos pedir `DATAFORSEO_BASE_URL` — codamos o default `https://api.dataforseo.com` e tornamos override opcional via `process.env.DATAFORSEO_BASE_URL` se um dia precisarmos de sandbox.

## Detalhes técnicos (referência)

### Auth
```ts
const auth = Buffer.from(
  `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
).toString("base64");
// header: Authorization: Basic ${auth}
```

### Endpoints exactos (DataForSEO docs)
- `POST /v3/keywords_data/google_trends/explore/live`
- `POST /v3/dataforseo_labs/google/keyword_ideas/live`
- `POST /v3/serp/google/organic/live/advanced`

### Estrutura de erro
- `4xx` → `DataForSeoUpstreamError` com `status_code`/`status_message` da resposta.
- Campos inválidos → `DataForSeoConfigError`.
- Kill-switch off ou allowlist miss → `DataForSeoBlockedError` (NÃO chama HTTP, regista log com `status='blocked'`).

### Parser de custo
A DataForSEO devolve `cost` (USD) no envelope da resposta. Gravamos em `actual_cost_usd`. Antes da chamada gravamos `estimated_cost_usd` baseado em tabela estática:
- Trends Explore: ~$0.0006/req
- Labs Keyword Ideas: ~$0.01/req
- SERP Organic Advanced: ~$0.002/req

### Cache key
`sha256(provider + endpoint + JSON.stringify(sortedInput))` → guardado em memória do request OU lido do `provider_call_logs` mais recente bem-sucedido dentro do TTL.

## Diagrama de fluxo

```text
caller (server fn)
  → isDataForSeoEnabled()? ─── não ──► throw Blocked, log status='blocked'
        │ sim
  → isAllowed(handle)?    ─── não ──► throw Blocked, log status='blocked'
        │ sim
  → cache lookup (provider_call_logs recente, mesmo input hash)
        │ hit  ──► devolve payload, log status='cache_hit', cost=0
        │ miss
  → Basic Auth POST → api.dataforseo.com/v3/...
        │ 2xx ──► parse cost, log status='success', devolve payload
        │ 4xx/5xx ──► log status='error', http_status, throw Upstream
```

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Burn de créditos em loop bug | kill-switch OFF por defeito + allowlist + cap de `limit` por endpoint |
| Vazamento de credenciais | secrets server-only, sem prefix `VITE_`, Base64 só em runtime |
| Quebra do flow Apify actual | zero tocar em ficheiros `apify-*` ou `/analyze/$username` |
| Esquema de DB | reutiliza `provider_call_logs` que já suporta multi-provider |
| Custo invisível | toda a chamada grava `actual_cost_usd` da resposta da API |

## Checklist de validação (☐)

- [ ] `bunx tsc --noEmit` passa
- [ ] `bun run build` passa
- [ ] Com `DATAFORSEO_ENABLED=false` → `/api/admin/dataforseo-test` devolve 403 blocked sem chamar HTTP
- [ ] Com `DATAFORSEO_ENABLED=true` mas handle fora da allowlist → 403 blocked, sem HTTP
- [ ] Com tudo ligado e handle válido → chamada real, linha em `provider_call_logs` com custo gravado
- [ ] Segunda chamada idêntica dentro do TTL → `cache_hit`, custo=0
- [ ] Painel admin `/admin/sistema` mostra status dos 4 secrets
- [ ] Painel admin `/admin/visao-geral` mostra bloco DataForSEO com últimas chamadas e custo 30d
- [ ] Apify continua a funcionar igual (smoke-test em `frederico.m.carvalho`)
- [ ] `/report/example` e `/analyze/$username` inalterados

## Confirmar antes de avançar

Se tudo bater certo, no próximo turno:
1. peço-te os 4 secrets (`DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `DATAFORSEO_ENABLED`, `DATAFORSEO_ALLOWLIST`);
2. crio a migration do índice parcial;
3. crio os 10 ficheiros e edito os 2 painéis;
4. corro typecheck + build;
5. faço smoke-test contra os 3 endpoints com um keyword seguro (ex. "instagram benchmark portugal").
