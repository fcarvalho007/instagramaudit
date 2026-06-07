# Audit · Profile vs Competitor in Pro Report

## 1. Como os dados de concorrência fluem hoje

Pipeline: `/api/analyze-public-v1` → `analysis_snapshots.normalized_payload` → `snapshotToReportData` → `ReportShellV2` → cards.

**Fetch (route `analyze-public-v1.ts`, linhas 991–1130):**
- Para cada competitor é chamado `fetchProfileWithPostsLogged(handle)` **sem `windowCfg`** → competitors ficam sempre em **baseline** (comentário explícito linhas 980–983).
- Resultado é normalizado para `CompetitorAnalysis` (success) com apenas:
  - `profile: PublicAnalysisProfile` (username, display_name, avatar, bio, followers, following, posts_count, is_verified, category, external_urls, is_business)
  - `content_summary: PublicAnalysisContentSummary` (posts_analyzed, dominant_format, average_likes, average_comments, average_engagement_rate, estimated_posts_per_week)
- **Não é guardado**: `latestPosts`, `format_stats`, `enriched posts`, hashtags, captions, thumbnails, comment_intelligence, AI insights, market signals, visual_cover, caption_semantic.

**Persistência (linhas 1181–1214):** `normalized_payload.competitors = competitorResults` — array de `CompetitorAnalysis` com a forma reduzida acima.

**Adapter (`snapshot-to-report-data.ts`, linhas 1267–1282):** ⚠️ Hoje o adapter **descarta** as métricas reais dos competitors. Quando há ≥1 competitor no payload, emite apenas uma linha (o próprio perfil) com `engagement = keyMetrics.engagementRate`. Os competitors reais não chegam ao `ReportData.competitors`.

**Componente actual (`ReportCompetitors`):** desenha um gauge horizontal de `engagement` por linha (mock tem 3 entradas). Só suporta um único eixo de comparação.

## 2. O que existe vs. o que falta por competitor

| Métrica                          | Disponível no payload do competitor | Fonte |
| -------------------------------- | ----------------------------------- | ----- |
| Followers                        | ✅                                  | `profile.followers_count` |
| Posts analisados                 | ✅                                  | `content_summary.posts_analyzed` |
| Engagement médio %               | ✅                                  | `content_summary.average_engagement_rate` |
| Média de likes / post            | ✅                                  | `content_summary.average_likes` |
| Média de comentários / post      | ✅                                  | `content_summary.average_comments` |
| Frequência semanal               | ✅                                  | `content_summary.estimated_posts_per_week` |
| Formato dominante (label)        | ✅                                  | `content_summary.dominant_format` |
| Distribuição de formato (mix %)  | ❌                                  | precisaria de `format_stats` do competitor |
| Distribuição por dia da semana   | ❌                                  | precisaria de posts brutos |
| Heatmap / posting rhythm         | ❌                                  | precisaria de posts brutos |
| Top posts                        | ❌                                  | nem URLs nem métricas por post |
| Hashtags / keywords / themes     | ❌                                  | precisaria captions+hashtags |
| Caption patterns / CTA / tom     | ❌                                  | precisaria caption_semantic pago |
| Visual covers                    | ❌                                  | requer visual_cover pago |
| Comment intelligence             | ❌                                  | scraper de comentários pago |
| AI insights / editorial verdict  | ❌                                  | OpenAI pago |
| Market signals / links           | ❌                                  | DataForSEO + bio links |

Janela: hoje **competitors são sempre baseline**, mesmo quando o perfil principal pede 30d/90d. Para qualquer comparação “like-for-like” no Pro 30d/90d, ou (a) refazemos competitor com a mesma window, ou (b) marcamos a tabela com nota “competitor em baseline”.

## 3. Tabela de viabilidade por card

| # | Bloco / card                      | Padrão | Dados existentes? | Classificação |
| - | --------------------------------- | ------ | ----------------- | ------------- |
| 1 | Overview · profile index / KPIs   | 1      | followers, posts_count, engagement, likes/post, comentários/post — ✅ | **Pronto agora** |
| 2 | Engagement (gauge + benchmark)    | 1      | engagement médio — ✅ (benchmark do competitor não) | **Pronto agora** (sem reposicionar gauge) |
| 3 | Cadence / frequência semanal      | 1      | `estimated_posts_per_week` — ✅ | **Pronto agora** |
| 4 | Format breakdown                  | 2      | só `dominant_format` (label); falta `format_stats` do competitor | **Métrica derivada necessária** (re-emitir `format_stats` no fetch do competitor) |
| 5 | Posting heatmap / dias da semana  | 2      | requer posts brutos do competitor | **Métrica derivada necessária** (persistir `latestPosts` do competitor, mesmo cap=12) |
| 6 | Best days                         | 2      | idem heatmap | **Métrica derivada necessária** |
| 7 | Top posts / publicações-chave     | 3      | nenhum post do competitor é persistido | **Métrica derivada necessária** (e expõe thumbnails — decidir privacidade) |
| 8 | Hashtags & keywords               | 3      | nada (sem captions/hashtags) | **Métrica derivada necessária** |
| 9 | Caption diagnostics / comunicação | 3      | requer caption_semantic | **Necessita enrichment pago** |
| 10| Visual cover analysis             | 3      | requer visual_cover | **Necessita enrichment pago** |
| 11| Comment intelligence              | 3      | requer comment scraper | **Necessita enrichment pago** |
| 12| AI insights / verdict editorial   | 3      | OpenAI por competitor | **Não comparar ainda** (custo + risco) |
| 13| Editorial patterns / temas        | 3      | derivado de captions | **Necessita enrichment pago** |
| 14| Market signals                    | 3      | DataForSEO por competitor | **Não comparar ainda** |
| 15| Links / integração bio            | 3      | `external_urls` já existe ✅ | **Pronto agora** (tabela qualitativa) |
| 16| Prioridades                       | 3      | depende de AI insights | **Não comparar ainda** |
| 17| Diagnóstico editorial             | 3      | depende de captions+AI | **Necessita enrichment pago** |

Resumo:
- **Prontos agora** (Padrão 1 ou 3 qualitativo): Overview/KPIs, Engagement, Cadence, Links/bio.
- **Bloqueados por métricas derivadas deterministas** (precisam persistir mais campos do competitor, sem custo extra de provider — basta guardar mais do que o Apify já devolveu): Format mix, Heatmap, Best days, Top posts, Hashtags & keywords.
- **Bloqueados por enrichment pago**: Captions, Visual cover, Comments, Editorial patterns.
- **Não comparar ainda**: AI insights, Market signals, Prioridades.

## 4. Riscos e dados em falta

- ⚠️ **Adapter perde dados:** `snapshot-to-report-data.ts` (linhas 1267–1282) descarta hoje todos os `content_summary` dos competitors. Qualquer card de comparação precisa de uma nova fatia `ReportData.competitorBreakdown` (ou similar) para passar métricas por competitor às cards.
- ⚠️ **Forma de `ReportData.competitors`** está fixada a `{ username, engagement, followers, isOwn, avatarGradient }`. Não é onde devem viver os novos dados — convém uma nova chave dedicada e manter a actual para o gráfico legado.
- ⚠️ **Window mismatch:** competitor está sempre em baseline. Para Pro 30d/90d, comparar com "últimos 30d do competitor" exige refetch com window — aumenta custo Apify ~2× (1 perfil extra). Decisão de produto pendente. MVP: assumir baseline e rotular claramente “últimos 30d (perfil) vs. baseline (concorrente)”.
- ⚠️ **Mock/locked components:** `ReportCompetitors` actual é o gauge horizontal; manter intacto ou redesenhar? Recomendo deixar como está (compatível com mock) e criar primitivas novas (`CompareStatBlock`, `CompareBarPair`, `CompareTable`) usadas nas restantes cards.
- ⚠️ **Padrão visual:** mobile-first com pares lado-a-lado pode estourar em ≤360px — primitiva precisa de fallback empilhado.
- ⚠️ **/report.example está locked** (memória do projecto) — não tocar; usar `/analyze/$username` para QA visual.
- ⚠️ **Não vamos chamar provider** nesta auditoria; qualquer refetch para popular o competitor é fora de scope.

## 5. Sequência recomendada de implementação

**Fase 0 — Primitivas (sem dados novos):**
1. Criar 3 componentes reusáveis em `src/components/report-redesign/v2/compare/`:
   - `compare-stat-block.tsx` (Padrão 1)
   - `compare-bar-pair.tsx` (Padrão 2)
   - `compare-table.tsx` (Padrão 3)
2. Adicionar tipo `ReportData.competitorBreakdown` ou similar e popular no adapter a partir de `payload.competitors[].content_summary` quando há ≥1 competitor.
3. Expor um helper `getCompetitor(index)` no contexto.

**Fase 1 — Cards "prontos agora" (Padrão 1 + qualitativo):**
- Overview/KPIs · Engagement · Cadence · Links bio.
- Cobertura: 1 competitor, etiqueta clara “concorrente em baseline” quando window do perfil ≠ baseline.

**Fase 2 — Métricas derivadas deterministas:**
- Estender o fetch do competitor para persistir `latestPosts` (cap 12) e `format_stats` no payload — sem chamada extra a Apify (a resposta atual já traz `latestPosts`).
- Activar comparação em: Format mix, Heatmap, Best days, Top posts, Hashtags & keywords.

**Fase 3 — Comparação com enrichment pago (decisão de produto):**
- Apenas se o utilizador pagar enrichment para o competitor (custo duplicado).
- Captions · Visual cover · Comments · Editorial patterns.

**Fase 4 — Window alignment (opcional):**
- Refetch do competitor com a window do perfil quando estiver activa.
- Avaliar impacto em créditos antes de avançar.

## 6. Ficheiros prováveis a tocar por fase

**Fase 0:**
- `src/components/report-redesign/v2/compare/compare-stat-block.tsx` (novo)
- `src/components/report-redesign/v2/compare/compare-bar-pair.tsx` (novo)
- `src/components/report-redesign/v2/compare/compare-table.tsx` (novo)
- `src/lib/report/snapshot-to-report-data.ts` (estender adapter — adicionar novo campo, não tocar no array `competitors` legacy)
- `src/components/report/report-mock-data.ts` (acrescentar mock do novo campo)

**Fase 1:**
- `src/components/report-redesign/v2/report-kpi-grid-v2.tsx`
- `src/components/report-redesign/v2/report-overview-cards.tsx`
- `src/components/report-redesign/v2/report-overview-engagement.tsx`
- `src/components/report/report-benchmark-gauge.tsx` (apenas se necessário — preferir wrapper)
- `src/components/report-enriched/report-enriched-top-links.tsx` ou novo card de comparação de links

**Fase 2:**
- `src/routes/api/analyze-public-v1.ts` (persistir `latestPosts` + `format_stats` por competitor)
- `src/lib/analysis/types.ts` (estender `CompetitorAnalysis` success com novos campos opcionais)
- `src/lib/report/snapshot-to-report-data.ts` (calcular hashtags/heatmap/best-days por competitor)
- Cards: `report-format-breakdown.tsx`, `report-posting-heatmap.tsx`, `report-best-days.tsx`, `report-top-posts.tsx`, `report-hashtags-keywords.tsx`
- ⚠️ Mudança de schema do snapshot — bump `schema_version` para 3.

**Fase 3+:** edge functions/server fns de enrichment + cards correspondentes (`caption-diagnostics-card`, `visual-cover-analysis-card`, `report-comment-intelligence`, `report-editorial-patterns`).

## 7. Próximo prompt (Fase 0 — primitivas reusáveis)

> Build mode. Implementar a Fase 0 da feature “Perfil vs Concorrente” sem tocar em providers, créditos, checkout, schema da BD ou Free report.
>
> 1. Criar `src/components/report-redesign/v2/compare/compare-stat-block.tsx` — Padrão 1: dois blocos lado-a-lado (mobile: empilhados), “vs” central, etiqueta deterministica de delta (`+0,42 pp`, `−12%`, `igual`). Props: `label`, `primary: { handle, value, formatted }`, `competitor: { handle, value, formatted }`, `unit: "pp"|"%"|"x"|"abs"`, `higherIsBetter?: boolean`.
> 2. Criar `compare-bar-pair.tsx` — Padrão 2: lista de categorias com 2 barras pareadas (azul = perfil, roxo = concorrente). Props: `categories: Array<{ key, label, primary, competitor }>`, `unit`.
> 3. Criar `compare-table.tsx` — Padrão 3: tabela compacta com 1 coluna por perfil e linhas de labels deterministicas. Props: `rows: Array<{ label, primary, competitor }>`, `caption?`.
> 4. Todas as primitivas usam tokens semânticos (Iconosquare light + Ocean Breeze), Inter para números/labels, sem font-mono, sem hardcoded colors, mobile-first (≥360px), com fallback empilhado.
> 5. Estender `snapshot-to-report-data.ts` para emitir um novo campo `competitorBreakdown: Array<{ username, displayName, followers, summary: PublicAnalysisContentSummary }>` populado quando `payload.competitors[]` tem entradas com `success: true`. Não alterar o array `competitors` legacy (gauge horizontal continua a funcionar).
> 6. Adicionar mock equivalente em `report-mock-data.ts` (1 competitor de exemplo) para QA visual em `/report.example` (sem modificar o resto da página) — confirmar que `/report.example` continua igual sem o novo campo activo.
> 7. Não consumir crédito, não chamar Apify/OpenAI/DataForSEO, não mexer em entitlements, EuPago, preços ou UI fora destas primitivas.
> 8. Entregar: ficheiros criados, diff do adapter, screenshot mobile + desktop de cada primitiva isolada (storybook-style ou rota dev), confirmação de typecheck.
