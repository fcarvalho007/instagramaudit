## Resposta às perguntas (parte informativa)

### 1. A informação do `/analyze/$username` já é real?

**Sim, na maior parte.** O endpoint `/api/analyze-public-v1` chama o Apify (`apify/instagram-scraper`), normaliza o perfil e até 12 publicações recentes, persiste em `analysis_snapshots` e devolve dados reais ao cliente. O que vê para `@frederico.m.carvalho` é o teu perfil real:

- **Real**: `profile` (seguidores, bio, avatar), `content_summary` (envolvimento médio, frequência semanal, formato dominante, médias de likes/comments), `posts[]` enriquecidos, `format_stats` por formato.
- **Real (server-side)**: `benchmark_positioning` resolvido contra a tabela `benchmark_references`.
- **Mock/placeholder**: o bloco "Conteúdo premium" (`PremiumLockedSection`) com 4 cartões fechados — `estimatedReach`, `aiInsightsCount`, `opportunitiesCount`, `recommendations30d` — são valores estáticos definidos em `PREMIUM_TEASERS` dentro de `public-analysis-dashboard.tsx`. Não há, hoje, motor real para alcance estimado nem insights de IA.

### 2. O que é o "benchmark" e qual é a fonte?

A tabela `benchmark_references` na base de dados (com fallback em `src/lib/benchmark/reference-data.ts`, dataset `v1.0-2025-04`). É uma matriz **escalão × formato** com taxas de envolvimento de referência:

```text
                Reels   Carrosséis   Imagens
Nano (<10K)     5,6%    4,2%         3,1%
Micro (10–50K)  3,2%    2,4%         1,8%
Mid (50–250K)   1,8%    1,3%         0,95%
Macro (250K–1M) 1,1%    0,8%         0,55%
Mega (1M+)      0,7%    0,5%         0,35%
```

**Como é calculado:** o motor (`computeBenchmarkPositioning`) classifica o perfil por `followers_count` no escalão correspondente, lê a referência do `dominant_format`, e calcula `delta = (engagement - referência) / referência × 100`. Acima de ±10% diz "acima/abaixo"; entre ±10% diz "alinhado".

**Origem dos números:** valores **editoriais** — uma curadoria interna inspirada em estudos públicos do mercado (ordem de grandeza HypeAuditor / Phlanx / Later 2024–2025), não uma média estatística de uma população amostrada por nós. Não há ainda agregação de "todos os perfis analisados pelo InstaBench". Por isso o dataset tem versão (`v1.0-2025-04`) — é editável por SQL sem redeploy à medida que recolhemos a nossa própria base.

No teu caso real: 152 seguidores → escalão **Nano**, formato dominante **Carrosséis**, referência **4,2%**. Engagement 0,15% → -96,4% vs benchmark.

### 3. O que é transferível do `/report/example`?

Praticamente tudo o que falta no `/analyze` para parecer um relatório completo. O `/report/example` é uma maquete editorial polida em modo claro (ReportThemeWrapper) com 12 secções; o adaptador `snapshotToReportData` já existe e converte um snapshot real para o mesmo `ReportData` que o `ReportPage` consome (é exactamente o que o admin usa em `/admin/report-preview/snapshot/$snapshotId`).

Secções do `/report/example` mapeáveis a partir do snapshot real actual:

| Secção                       | Estado a partir do snapshot real |
|------------------------------|---------------------------------|
| Header + perfil              | Real |
| Métricas-chave (4 KPI)       | Real |
| Posicionamento benchmark     | Real |
| Evolução temporal            | Parcial (só ~12 pontos do sample) |
| Repartição por formato       | Real (com benchmarks per-format) |
| Concorrentes                 | Real **se** `?vs=…` for usado, senão vazio |
| Top publicações (5)          | Real |
| Heatmap de publicação        | Parcial (12 pontos, leitura indicativa) |
| Melhores dias da semana      | Parcial |
| Hashtags + palavras-chave    | Real (extraído das captions) |
| Insights por IA              | **Vazio** (motor ainda não existe) |
| Footer                       | Real |

---

## Plano de implementação

**Objectivo:** mostrar o relatório completo, real, no layout do `/report/example`, sem bloqueio premium, usando os dados reais já recolhidos pelo Apify para o handle pedido. Ambiente clean e elegante. Continua privado (sem login público, mas o teu acesso de admin não é pré-requisito).

### Mudança principal

Substituir o componente que renderiza `/analyze/$username`. Deixa de usar `PublicAnalysisDashboard` (layout dark com cartões + bloqueio premium) e passa a usar `ReportPage` em modo claro (mesmo wrapper do `/report/example` e do `/admin/report-preview/snapshot/...`), alimentado pelo adaptador `snapshotToReportData` que já existe.

### Passos

1. **Novo endpoint público de leitura por handle** — `GET /api/public/analysis-snapshot/:username`
   - Lê a snapshot mais recente em `analysis_snapshots` por `instagram_username`.
   - Resolve `benchmark` server-side via `buildReportBenchmarkInput` (já existe).
   - Devolve `{ payload, meta, benchmark }` no mesmo formato que o endpoint admin equivalente.
   - Sem auth (rota pública sob `/api/public/*`), apenas leitura. `Cache-Control: no-store`.
   - Se não houver snapshot, devolve 404 estruturado para o cliente disparar a análise via `/api/analyze-public-v1`.

2. **Refactor de `src/routes/analyze.$username.tsx`**
   - Continua com `ssr: false`.
   - Fluxo: chama `/api/analyze-public-v1` (mesma lógica de hoje, garante recolha/cache); ao receber `analysis_snapshot_id`, faz uma segunda chamada a `/api/public/analysis-snapshot/:username` para obter o payload bruto + benchmark e correr `snapshotToReportData(...)` no cliente.
   - Resultado: `AdapterResult { data, coverage }` que alimenta directamente o `ReportPage`.
   - Envolve tudo em `<ReportThemeWrapper>` (paleta clara, idêntico ao `/report/example`).
   - Mantém `AnalysisSkeleton` e `AnalysisErrorState` actuais para os estados de loading/erro.
   - Suporta `?vs=user1,user2` para alimentar concorrentes (já hoje suportado pelo endpoint).

3. **Remover bloqueio premium e camada de conversão**
   - Deixa de renderizar `PostAnalysisConversionLayer` e `PremiumLockedSection` neste fluxo público.
   - O `ReportGateModal` deixa de ser invocado a partir do `/analyze`. (Os componentes ficam intactos no repositório para reuso futuro — não são apagados.)

4. **Faixa discreta de cobertura no topo (versão "lite" da do admin)**
   - Pequena strip editorial acima do `ReportPage` com: `N publicações · janela ≈ X dias · benchmark v1.0-2025-04 · concorrentes (presentes/ausentes)`.
   - Tipografia mono, baixo contraste, igual ao tom da maquete. Sem chips coloridos pesados — alinhado com o "ambiente clean" que pediste.
   - Quando `coverage.benchmark` for `partial` ou `placeholder`, acrescenta legenda curta a explicar (ex.: "benchmarks em afinação para este escalão").

5. **Insights de IA no relatório**
   - Como o motor ainda não existe, o `ReportAiInsights` vai detectar `aiInsights.length === 0` e ou:
     - **Opção A (default desta tarefa):** ocultar a secção, mantendo o relatório clean.
     - Opção B (futura): adicionar um placeholder editorial muito sóbrio ("Insights estratégicos em afinação"). Não é necessária para esta entrega.

6. **Editorial copy / metadados**
   - O adapter já preenche `meta.windowLabel`, `meta.kpiSubtitle`, `meta.sampleCaption`, `meta.temporalLabel`, `meta.topPostsSubtitle` com base no tamanho real da amostra. As secções existentes do report já leem destes campos quando presentes (ver `report-key-metrics.tsx`).
   - Confirmar que cada secção reconhece `meta.benchmarkStatus !== "real"` — ajustar `report-benchmark-gauge` e `report-format-breakdown` para mostrar texto secundário "benchmark editorial" quando `partial`/`placeholder`. Edição mínima, sem alterar layout.

7. **`/report/example` mantém-se intocável**
   - Apenas se reutiliza o componente `ReportPage` e o `ReportThemeWrapper`; nenhum ficheiro listado em `/LOCKED_FILES.md` é editado. Confirmar antes da implementação.

### Detalhes técnicos

- **Onde é chamado o adaptador**: o `snapshotToReportData` é puro, pode correr no browser. O caminho actual já o faz no admin (`admin.report-preview.snapshot.$snapshotId.tsx`). Reaproveitamos a mesma forma.
- **Cobertura**: o `coverage.windowDays` e `coverage.postsAvailable` retornados pelo adapter alimentam a faixa do topo.
- **Concorrentes sem `?vs=`**: o adapter devolve `competitors = []` e a secção mostra estado "em falta"; combinamos com texto curto para o utilizador saber que pode adicionar `?vs=username` ao endereço.
- **Nada se altera em**: `report-mock-data.ts`, qualquer componente em `src/components/report/*`, esquema de base de dados, segredos, Apify allowlist, motor de benchmark.
- **Performance**: dois pedidos sequenciais (analyze + snapshot-by-handle). O segundo é leitura simples Postgres, < 100 ms. Aceitável face ao perfil já recolhido.

### O que NÃO entra nesta tarefa

- Motor de IA para `aiInsights` (fora do âmbito).
- Motor de "alcance estimado" / "oportunidades" / "recomendações 30 dias" (eram placeholders, não voltam neste ecrã).
- Ligação `/report/example` a dados reais (continua a ser apenas maqueta editorial).
- Alterações de schema, de auth ou de payments.
- Guardas de quota públicas (continua o gating actual no `/api/analyze-public-v1`).

### Avaliação de transferibilidade (resumo)

| Componente actual em `/analyze` | Destino                          |
|---------------------------------|----------------------------------|
| `AnalysisHeader`                | Substituído por `ReportHeader`   |
| `AnalysisMetricCard` (4×)       | Substituído por `ReportKeyMetrics` |
| `AnalysisBenchmarkBlock`        | Substituído por `ReportBenchmarkGauge` |
| `AnalysisCompetitorComparison`  | Substituído por `ReportCompetitors` |
| `PostAnalysisConversionLayer`   | Removido deste ecrã (ficheiro fica) |
| `PremiumLockedSection`          | Removido deste ecrã (ficheiro fica) |
| `ReportGateModal`               | Removido deste ecrã (ficheiro fica) |

Ganhos novos no ecrã: gráfico temporal, repartição por formato com barras, top 5 publicações, heatmap, melhores dias, hashtags + keywords, footer editorial.

---

## Checkpoint

- ☐ Endpoint `GET /api/public/analysis-snapshot/:username` criado e a devolver `payload + meta + benchmark`.
- ☐ Rota `/analyze/$username` reescrita para usar `ReportThemeWrapper` + `ReportPage` alimentada pelo adapter.
- ☐ Bloqueio premium removido deste fluxo (componentes não são apagados do repo).
- ☐ Faixa discreta de cobertura no topo (publicações, janela, dataset, concorrentes).
- ☐ Secção de insights IA escondida quando vazia.
- ☐ `/report/example` e `LOCKED_FILES.md` intactos.
- ☐ `bunx tsc --noEmit` e `bun run build` limpos.