# DataForSEO Lite — "Sinais de Mercado" (v1)

## Posição no produto

Nova **camada independente** sobre o relatório de Instagram já existente.
Renderiza como secção `Sinais de Mercado` no fim do `ReportPage`, depois do bloco IA.
Apify continua a ser a fonte primária; DataForSEO é enriquecimento opcional, **não-bloqueante**, com timeout duro de 60 s.

## Decisões já fixadas (do briefing)

- Produção directa (`api.dataforseo.com`).
- Live API síncrono.
- Kill-switch + allowlist obrigatórios.
- Free = 1 query · Paid = 5 queries.
- Free vê resumo; full keyword tables só Paid.
- Não tocar em Apify, `/report/example`, PDF, email, billing.
- Decisão sobre tabelas só depois de provada necessidade.

## 1. Endpoints recomendados (e quais cortamos para v1)

DataForSEO tem 7 famílias listadas no onboarding. Nem todas trazem ROI imediato. Recomendo:

| Família | v1 Free | v1 Paid | Justificação |
|---|---|---|---|
| **Keywords Data — Google Trends** | sim | sim | sinal "interesse" ao longo do tempo, 1 chamada serve para vários keywords |
| **DataForSEO Labs — Keyword Ideas** | não | sim | tabela de keywords/CPC/volume; só faz sentido na vista paga |
| **SERP — Google Organic** | não | sim | "presença orgânica" do handle/marca; 1 chamada por keyword principal |
| Competitor Analysis (Labs) | não | não | duplica info do SERP organic em v1; reavaliar em v2 |
| AI / LLM Mentions | não | não | beta, ruído alto, deixar para v2 |
| Content Optimization | não | não | requer corpus + URL; fora do scope |
| Building SaaS Tool | n/a | n/a | é meta-doc, não endpoint |

**Custo agregado por relatório:**

| Plano | Endpoints chamados | Custo estimado |
|---|---|---|
| Free (1 query) | Google Trends Explore | ~$0.0006 |
| Paid (até 5 queries) | Trends + Keyword Ideas (limit 50) + SERP Organic (depth 10) ×3 keywords | ~$0.0006 + $0.01 + 3×$0.002 = **~$0.017** |

Cap real garantido pelo `MAX_QUERIES_*` por sessão de relatório.

## 2. Live API é aceitável para v1?

**Sim.** Justificação:

- volume baixo (1 a 5 chamadas por relatório, e cada utilizador gera relatórios esporádicos)
- task-based exigia tabela `dataforseo_tasks` + endpoint público `/api/public/dataforseo-callback` + worker — overkill para o tráfego actual
- Live tem latência típica de **2–8 s** por endpoint (Trends ~3 s, Keyword Ideas ~4 s, SERP ~5 s)
- com timeout de 60 s temos margem 7×

Threshold para migrar para task-based: > 100 relatórios/dia ou > $50/dia em DataForSEO.

## 3. Latência esperada (timing budget)

```text
Apify (já existente)    ........................  10–30 s   (caminho crítico)
DataForSEO Free (1)     ............ 2–4 s        (paralelo, opcional)
DataForSEO Paid (3-5)   ............ 6–15 s       (paralelo, opcional)
Hard timeout            ........................  60 s
```

DataForSEO **nunca** está no caminho crítico. Se exceder 60 s mostra fallback.

## 4. Fluxo de pedido (exacto)

```text
Browser → /analyze/$username
  ↓ POST /api/analyze-public-v1            [Apify, já existente, inalterado]
  ↓ GET  /api/public/analysis-snapshot     [já existente, inalterado]
  ← snapshot pronto → ReportPage renderiza JÁ

Em paralelo, ao montar ReportPage:
Browser → POST /api/market-signals
                body: { username, plan: "free" | "paid", snapshotId }
  ↓ server route (createFileRoute)
    ├─ requireAdminSession() OU validação de snapshotId+plan derivado
    ├─ isDataForSeoEnabled() ? senão devolve { status: "disabled" }
    ├─ isAllowed(username)   ? senão devolve { status: "blocked" }
    ├─ derivar até N keywords do snapshot (hashtags top + nicho)
    │     N = MAX_QUERIES_FREE | MAX_QUERIES_PAID
    ├─ Promise.race([
    │     buildSignals(keywords, plan),     // chama 1..5 endpoints
    │     timeout(60_000)
    │   ])
    └─ devolve { status: "ready", signals } ou { status: "timeout" }
  ← UI substitui skeleton pela secção real, ou pelo fallback editorial
```

A secção `MarketSignalsSection` no `ReportPage` arranca em estado `loading` e nunca bloqueia a hidratação do resto.

## 5. Recolha de keywords (sem perguntar ao utilizador)

Não pedimos input. Derivamos do snapshot Apify:

1. Top 3 hashtags mais usadas no perfil (já no `normalized_payload`).
2. Display name do perfil (fallback se hashtags forem fracas).
3. Nicho declarado / categoria (se já tivermos, senão skip).

Cap = `MAX_QUERIES_FREE` ou `MAX_QUERIES_PAID`. As 5 queries pagas correspondem a:
- 1 × Google Trends (passa keywords como array)
- 1 × Keyword Ideas (seed = top hashtag)
- 3 × SERP Organic (top 3 keywords)

## 6. Free vs Paid (UX)

| Bloco | Free | Paid |
|---|---|---|
| Trends sparkline | ✓ (pequena, 1 keyword) | ✓ (multi-keyword) |
| Resumo "interesse a subir/descer" | ✓ | ✓ |
| Tabela Keyword Ideas | — (teaser blur + CTA) | ✓ (até 50 linhas) |
| SERP visibility do handle | — (teaser) | ✓ |
| Cruzamento Instagram × Search | — | ✓ (texto curto) |

**Não** introduzimos billing nem sistema de planos novo nesta tarefa. O `plan` é parâmetro recebido do client; por defeito = `"free"`. Quando billing existir, é trivial ligar.

## 7. Schema de base de dados — proposta minimal

**Não** vou criar tabela nova nesta primeira versão. Razão:
- toda a chamada já é registada em `provider_call_logs` (provider='dataforseo')
- os payloads das respostas DataForSEO **não** precisam de persistência inicial — são derivados de input determinístico e podemos cachear na mesma estrutura

**Cache de payloads**: usamos uma coluna nova `payload_cache jsonb` ou tabela dedicada SÓ se observarmos que o mesmo handle volta a pedir o mesmo enriquecimento dentro do TTL. Para v1, recomputar é mais barato que migração.

**Único campo recomendado** (opcional, para análise futura): adicionar `dataforseo_summary jsonb` em `analysis_snapshots` para guardar o resultado curto e poder regenerar PDFs sem nova chamada. Decidir depois de v1 estar a funcionar — *não* incluir migration no primeiro prompt.

## 8. Ficheiros — criar

```text
src/lib/dataforseo/endpoints/keyword-ideas.ts          # já planeado, falta criar
src/lib/dataforseo/endpoints/serp-organic.ts           # já planeado, falta criar
src/lib/dataforseo/market-signals.ts                   # orquestrador + derivação keywords + Promise.race
src/lib/dataforseo/plan-limits.ts                      # lê MAX_QUERIES_FREE/PAID
src/routes/api/market-signals.ts                       # POST handler não-bloqueante
src/components/report/report-market-signals.tsx        # secção UI (loading + ready + fallback + teaser)
src/components/report/report-market-signals-paywall.tsx # bloco "desbloqueia" para Free
src/lib/dataforseo/derive-keywords.ts                  # extrai keywords do snapshot
```

## 9. Ficheiros — editar

```text
src/components/report/report-page.tsx
  → adicionar <ReportMarketSignals /> entre <ReportAiInsights /> e <ReportFooter />,
    apenas quando recebe prop `data` (relatórios reais), nunca no mock /report/example

src/routes/analyze.$username.tsx
  → após receber snapshot, disparar fetch para /api/market-signals (fire-and-forget)
    e passar estado para o ReportPage via novo contexto leve OU prop opcional
```

## 10. Ficheiros explicitamente NÃO tocados

- Tudo `apify-*`, `/api/analyze-public-v1`
- `src/components/report/report-mock-data.ts` e `/routes/report.example.tsx`
- `report-ai-insights.tsx`
- PDF, email, billing
- `LOCKED_FILES.md`

## 11. Secrets — já configurados, faltam 2

Já tens: `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `DATAFORSEO_ENABLED`, `DATAFORSEO_ALLOWLIST`.

Adicionar:
- `DATAFORSEO_MAX_QUERIES_FREE` (= `"1"`)
- `DATAFORSEO_MAX_QUERIES_PAID` (= `"5"`)

Caps adicionais já no código (não em secret): `limit=50` em Keyword Ideas, `depth=10` em SERP — defesa em profundidade.

## 12. Risk assessment

| Risco | Severidade | Mitigação |
|---|---|---|
| DataForSEO lento → relatório atrasado | alto | timeout 60 s + Promise.race; UI nunca bloqueia em DataForSEO |
| Burn de créditos em loop bug | alto | kill-switch OFF por defeito, allowlist obrigatória, cap por plano, cap por endpoint (`limit`/`depth`), logging total |
| Vazamento de credenciais | crítico | server-only, Base64 em runtime, proibido `VITE_*` |
| Resposta DataForSEO mal formada quebra UI | médio | adapter defensivo + secção mostra fallback se shape inválido |
| Mesma keyword em chamadas repetidas | baixo | dedup já no derive-keywords; cache logging via `provider_call_logs` |
| Chamada feita a partir de SSR | médio | `/analyze/$username` tem `ssr: false`; market-signals dispara só no browser via `useEffect` |
| Anonymous abuse (sem auth) | médio | endpoint exige `snapshotId` que apenas existe após Apify legítimo + allowlist enquanto em testing mode |

Nota: não vamos adicionar rate limiting backend (sem primitivas estabelecidas no projecto). A defesa é kill-switch + allowlist + caps por plano.

## 13. Validação (☐)

- `bunx tsc --noEmit` passa
- `bun run build` passa
- `DATAFORSEO_ENABLED=false` → `/api/market-signals` devolve `{status:"disabled"}` em < 50 ms, sem HTTP
- `DATAFORSEO_ENABLED=true` + handle fora da allowlist → `{status:"blocked"}`, sem HTTP
- handle válido → secção `Sinais de Mercado` renderiza com Trends sparkline em < 10 s
- Apify em < 30 s mesmo com DataForSEO desligado
- timeout simulado (mock 70 s) → fallback editorial visível
- `/report/example` inalterado
- `provider_call_logs` regista todas as chamadas com `provider='dataforseo'`

## 14. Sequência de prompts (small batches)

**Prompt A — Endpoints + orquestrador (server-only)**
- Criar `keyword-ideas.ts` e `serp-organic.ts`
- Criar `derive-keywords.ts` e `plan-limits.ts`
- Criar `market-signals.ts` (orquestra, aplica timeout)
- Criar `/api/market-signals.ts`
- Validar com `bunx tsc --noEmit` + `bun run build`
- Pedir os 2 secrets que faltam

**Prompt B — UI da secção (não-bloqueante)**
- Criar `report-market-signals.tsx` (estados loading/ready/timeout/disabled/blocked)
- Criar `report-market-signals-paywall.tsx` (teaser blur + CTA)
- Editar `report-page.tsx` para incluir secção *só* quando recebe `data`
- Editar `analyze.$username.tsx` para disparar `/api/market-signals` em `useEffect`

**Prompt C — Diagnóstico admin**
- Adicionar bloco "DataForSEO" no painel `/admin/visao-geral` (custo 30d + últimas 5 chamadas) — opcional, depende de quereres

**Prompt D (futuro, condicional)** — Persistência de payloads
- Migration para `analysis_snapshots.dataforseo_summary jsonb`
- Só se observarmos chamadas repetidas para o mesmo handle dentro do TTL

## 15. Confirmar antes de avançar

1. Aprovas a lista de endpoints (Trends + Keyword Ideas + SERP) e cortar Competitor/LLM/Content Optimization para v2?
2. Confirmas que **não** crio migration nesta primeira fase (apenas `provider_call_logs` + secrets)?
3. Confirmas que o paywall do Free (teaser blur + CTA) é placeholder visual sem ligação a billing real?
4. Avanço com o **Prompt A** (server-only) primeiro?
