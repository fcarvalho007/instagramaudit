# Editorial V2 — auditoria read-only da camada de apresentação do relatório público

Resposta às quatro perguntas. Nada foi alterado no código.

## 1. Inventário dos ficheiros que participam no relatório público

Rota e entrada
- `src/routes/analyze.$username.tsx` — rota pública, `ssr: false`, fetch da análise, gating, tracking, ConversionSheet, entitlements. LOCKED.
- `src/routes/admin_.report-preview.$username.tsx`, `src/routes/admin_.report-preview.snapshot.$snapshotId.tsx`, `src/routes/admin.report-lab.tsx`, `src/routes/admin-report-lab.full-preview.$handle.tsx` — pré-visualizações internas que montam a mesma shell com `state`/`variant`.
- `src/routes/reports.$snapshotId.tsx` — relatório histórico na área privada.
- `src/routes/report.example.tsx` — mockup editorial. LOCKED.
- `src/routes/report.print.$snapshotId.tsx` — rota de impressão usada pelo PDF.

Shell e chrome
- `src/components/report-redesign/v2/report-shell-v2.tsx` — orquestrador actual (composição de blocos, gates, camada comparativa).
- `src/components/report-redesign/v2/report-hero-v2.tsx`, `report-block-section.tsx`, `report-block-nav.tsx`, `report-grid-row.tsx`, `report-utility-bar.tsx`, `back-to-top-button.tsx`, `report-shortcut-dialog.tsx`, `use-active-block.ts`, `use-report-keyboard-shortcuts.ts`, `report-tokens.ts`.
- `src/components/report-redesign/report-shell.tsx`, `report-hero.tsx`, `report-kpi-grid.tsx`, `report-framed-block.tsx`, `report-section-frame.tsx`, `report-ai-reading.tsx`, `report-methodology.tsx` — shell v1 ainda presente para rollback. Todos LOCKED.
- `src/components/report/report-theme-wrapper.tsx`, `src/styles/tokens-light.css`, `src/styles/analyze-header-collapse.css`, `src/styles/pdf-print.css`. `tokens-light.css` e toda a pasta `src/components/report/*` estão LOCKED.

Secções e cartões
- Overview: `v2/report-overview-block.tsx`, `v2/overview/editorial-identity-card.tsx`, `score-card.tsx`, `score-grid.tsx`, `score-ring.tsx`, `score-orbit-background.tsx`, `engagement-kpi-row.tsx`, `frequency-card.tsx`, `format-card.tsx`, `diagnostic-summary.tsx`, `methodology-line.tsx`, `insight-callout.tsx`, `external-source-note.tsx`.
- Publicações: `v2/report-post-comparison.tsx`.
- Conversas: `v2/report-comment-intelligence.tsx`.
- Diagnóstico e prioridades: `v2/report-diagnostic-block.tsx`, `report-diagnostic-card.tsx`, `report-diagnostic-grid-v2.tsx`, `report-diagnostic-group.tsx`, `report-diagnostic-summary-cards.tsx`, `report-diagnostic-verdict.tsx`, `report-diagnostic-priorities.tsx`.
- Comparação com concorrentes: `v2/compare/*`, `v2/competitor-*.tsx`, `v2/overview/comparison-hero.tsx`, `comparison-header.tsx`, `competitor-modal.tsx`, `competitor-overview-compare.tsx`.
- Lab / enriquecimento: `v2/caption-diagnostics-card.tsx`, `hashtag-diagnostics-card.tsx`, `visual-cover-analysis-card.tsx`, `report-themes-feature.tsx`, `report-benchmark-evidence.tsx`, `strategic-context-card.tsx`, `enrichment-placeholder-card.tsx`, `src/components/report-enriched/*`, `src/components/report-market-signals/*`.
- Conversão dentro do relatório: `v2/end-of-free-block.tsx`, `sticky-unlock-bar.tsx`, `premium-teaser-card.tsx`, `premium-callout.tsx`, `premium-cta-context.tsx`, `premium-interest-dialog.tsx`, `consume-credit-dialog.tsx`, `src/components/report-tier/*`, `src/components/report-share/*`, `src/components/conversion/*`.

Gráficos
- LOCKED (pasta `src/components/report/`): `report-temporal-chart.tsx`, `report-benchmark-gauge.tsx`, `report-format-breakdown.tsx`, `report-competitors.tsx`, `report-posting-heatmap.tsx`, `report-best-days.tsx`, `report-hashtags-keywords.tsx`, `report-top-posts.tsx`, `report-key-metrics.tsx`, `ai-insight-box.tsx`.
- Não-locked: `v2/report-engagement-benchmark-chart.tsx`, `v2/overview/score-ring.tsx`, o gráfico semanal dentro de `frequency-card.tsx`, `report-market-signals/market-signals-chart.tsx`, `v2/compare/compare-bar-pair.tsx`.

Selectores e dados
- `src/lib/report/snapshot-to-report-data.ts` (≈2 060 linhas) — adaptador único snapshot → `ReportData` + `enriched`.
- `src/components/report/report-mock-data.ts` (define o tipo `ReportData`) e `report-data-context.tsx` — LOCKED.
- `src/lib/report/post-aggregates.ts`, `tiers.ts`, `cadence.ts`, `cadence-label.ts`, `format-keys.ts`, `pick-thumbnail.ts`, `weekday-iso.ts`, `editorial-verdict*.ts`, `block01-sample.ts`, `block02-diagnostic.ts`, `caption-intelligence.ts`, `retention.ts`, `editorial-patterns.ts`.
- `src/lib/benchmark/*` (`engine.ts`, `reference-data.ts`, `tiers.ts`, `types.ts`), `src/lib/report/benchmark-input.server.ts`.
- `src/lib/analysis/client.ts` + `src/routes/api/public/analyze-public-v1.ts` e `analysis-snapshot.by-id.$snapshotId.ts`.
- `src/lib/report-snapshots/schema.ts` — payload imutável `report.v1`.

Entitlements e gating
- `src/lib/report/report-variant.ts` e `src/lib/report/effective-features.ts` — LOCKED.
- `src/components/report-redesign/v2/access-gating.ts`, `v2/block-config.ts`.
- `src/lib/payments/entitlements.functions.ts`, `products.server.ts`, `eupago.functions.ts`, `src/lib/leads/*` (capture session, checkout identity).
- `src/server/admin/variant-overrides.functions.ts` — LOCKED.

Analytics
- `src/lib/tracking.functions.ts`, `src/lib/analytics/anonymous-funnel.ts`, `v2/report-tracking-context.tsx`, `v2/use-track-once-in-view.ts`, `v2/pro-checkout-search.ts`.

PDF
- `src/routes/api/generate-report-pdf.ts`, `src/routes/report.print.$snapshotId.tsx`, `src/lib/pdf/report-document.tsx`, `render.ts`, `render-via-browser.server.ts`, `providers/pdfshift.server.ts`, `styles.ts`, `format.ts`, `payload-guard.ts`, `recommendations.ts`, `print-url.server.ts`, `storage.ts`.

Ficheiros LOCKED relevantes (de `/LOCKED_FILES.md`): `src/routes/analyze.$username.tsx`, `src/lib/report/report-variant.ts`, `src/lib/report/effective-features.ts`, `src/server/admin/variant-overrides.functions.ts`, toda a pasta `src/components/report/*`, `src/routes/report.example.tsx`, `src/styles/tokens-light.css`, e a shell v1 em `src/components/report-redesign/` (shell, hero, kpi-grid, framed-block, section-frame, ai-reading, methodology). `report-editorial-patterns.tsx` está explicitamente fora do lock.

## 2. Identidade das secções

Existem dois registos de identidade, ambos em `src/components/report-redesign/v2/block-config.ts`.

Blocos de renderização (`BLOCKS`), com `id` como âncora DOM e `featureKey` como chave funcional:
- `overview` — `report-overview-block.tsx` — featureKey `blockOverview`, tier free.
- `diagnostico` — `report-diagnostic-block.tsx` — `blockDiagnosis`, tier pro.
- `performance` — gráficos temporais/heatmap/best-days — `blockPerformance`, tier lab.
- `conteudo` — formatos, top posts, hashtags/temas — `blockContent`, tier lab.
- `procura` — market signals — `blockSearch`, tier lab.
- `benchmark` — comparação — `blockBenchmark`, tier lab.

Secções comerciais da navegação lateral (`COMMERCIAL_SECTIONS`), âncoras para cartões já renderizados dentro de `overview` e `diagnostico`: `overview`, `engagement`, `frequencia`, `publicacoes-chave`, `formatos`, `conversas`, `diagnostico-editorial`, `prioridades`, mais a camada cumulativa `comparacao-concorrente`.

Onde estes identificadores aparecem fora da apresentação:
- `featureKey` (`blockOverview`, `blockDiagnosis`, …) é o contrato funcional real: vive em `report-variant.ts`, `effective-features.ts`, nos overrides de variante persistidos em base de dados e na UI de admin/Report Lab. É a chave que não se pode renomear sem migração.
- `tier` (`free`, `free_email`, `pro`) é consumido por `access-gating.ts` e espelhado no checkout e nos produtos.
- Os `id` de secção são usados como âncoras de scroll, hash de deep-link (`#conversas`), `scrollToBlock`, `report-cofre`, e em alguns targets de CTA. Aparecem em `conversion.json`/`report.json` como chaves de tradução. Não são chaves de base de dados nem de entitlement.
- Nomes de eventos analíticos são independentes das secções: `comment_intelligence_viewed`, `pro_cta_viewed`, `post_comparison_preview_viewed`, mais o funil anónimo. Não derivam do `id` nem do número.
- O PDF (`src/lib/pdf/report-document.tsx`) tem estrutura própria e não importa `block-config.ts`.

Resposta explícita à pergunta sobre o número de exibição: **não**. Os campos `number` ("01"… "08") são apenas rótulos. Os únicos consumos são `report-block-section.tsx` (linhas 106 e 117), `report-block-nav.tsx` (171, 466, 542) e `admin.report-lab.tsx` (898), todos de renderização de texto. Nenhuma verificação de entitlement, evento de analytics, coluna de base de dados, geração de PDF ou override de admin usa o número. Prova adicional de que é rótulo: `COMPETITOR_COMPARISON_SECTION` reutiliza o número "06" já atribuído a `conversas` sem qualquer efeito funcional. Consequência prática: a numeração pode ser reordenada ou eliminada livremente no Editorial V2; os `id` das âncoras e sobretudo as `featureKey` é que devem ser preservados.

## 3. Disponibilidade dos dados da referência

Já disponível nos selectores actuais
- Handle, nome, seguidores, a seguir, total de publicações, banda de escalão: `result.data.profile` (`username`, `fullName`, `followers`, `following`, `postsCount`, `tier`, `tierRange`, `verified`, `postsAnalyzed`, `windowDays`). Escalão resolvido por `src/lib/report/tiers.ts` com exactamente cinco bandas (Nano 0–10K, Micro 10K–50K, Mid 50K–250K, Macro 250K–1M, Mega 1M+).
- Taxa média de envolvimento do período: `data.keyMetrics.engagementRate`, com `engagementBenchmark` e `engagementDeltaPct`.
- Publicações por semana: `data.keyMetrics.postingFrequencyWeekly` (mais `cadence.ts` com `cadenceSufficient`, `cadenceSampleSize`, `cadenceWindowDays`).
- Divisão de formatos com contagem e percentagem: `data.formatBreakdown` (`format`, `sharePct`, `engagement`, `benchmark`, `status`) e `formatStats` no payload.
- Envolvimento por publicação: cada post traz `engagementPct`, `likes`, `comments`, `format`, `date`, `caption`, `permalink`.
- Melhor e pior publicação: já derivadas em `report-post-comparison.tsx` a partir de `topPosts`/`bottomPosts`, com data, formato, legenda, likes, comentários e taxa.
- Contagem de comentários por publicação: campo `comments` em cada post; agregados em `average_comments` e no Comment Intelligence.
- Publicações por dia da semana: derivadas em `frequency-card.tsx` a partir do `weekday` de cada post; existem também `postingHeatmap` e `bestDays` no adaptador, e `weekdayCountsIso` para concorrentes.

Derivável sem novo fetching
- Mediana do escalão para comparação com o índice: o benchmark por escalão existe (`src/lib/benchmark/reference-data.ts` sobre `benchmark_references`, `benchmark-input.server.ts`), mas o valor de referência actual é uma taxa de envolvimento, não uma mediana de índice 0–100. Uma "mediana do escalão" para o índice teria de ser calculada aplicando `computeGlobalScore` ao par (benchmark do escalão, cadência ideal) — determinístico, sem I/O, mas é uma definição nova a acordar.
- Benchmark de envolvimento nas cinco bandas em simultâneo: as bandas existem e a tabela de referência tem uma linha por escalão; hoje o relatório só carrega a linha do escalão do perfil. Mostrar as cinco na mesma régua exige apenas ler as cinco linhas de referência, sem tocar em providers.

Índice do perfil (0–100)
- Disponível: `computeEnvolvimento` + `computeFrequencia` + `computeGlobalScore` em `v2/overview/score-utils.ts`, pesos 0,6 / 0,4. Nota importante: o terceiro sub-score (interacção) foi removido por não haver fonte fiável. Se o Editorial V2 mostrar três anéis, isso é um requisito de dados novo, não uma questão de apresentação.

Miniaturas das publicações (ponto crítico)
- **Existem URLs reais.** `src/lib/report/pick-thumbnail.ts` resolve, por ordem, `thumbnail_storage_url` (cópia persistida em Storage, estável), `thumbnail_url` (CDN do Instagram) e o alias `thumbnailUrl`. O adaptador injecta `thumbnailUrl` nos posts (linhas ~866-899, ~1803-1890) e o schema `report.v1` valida ambos os campos proibindo data URLs. Existe ainda `persist-thumbnails.server.ts` a copiar as imagens no momento do snapshot, e uma ronda anterior confirmou em runtime 12/12 imagens reais no comparador de publicações.
- Fallback existente: gradientes determinísticos (`THUMB_GRADIENTS`) e ícones de formato quando o URL falha. Ou seja, as capas compostas por CSS da referência já têm equivalente e devem ser tratadas como estado degradado, não como o normal.
- Limitação a assumir: URLs do CDN do Instagram expiram; só a cópia em Storage é estável a longo prazo, e snapshots antigos podem não a ter.

Não disponível
- Mediana do índice por escalão como valor publicado e versionado (ver acima — hoje é derivação, não dado).
- Qualquer sinal de interacção do lado da marca (taxa de resposta a comentários), explicitamente removido do modelo de score.

## 4. Riscos

Risco 1 — pasta `src/components/report/*` está LOCKED e é onde vivem os gráficos. `ReportShellV2` importa dela o gráfico temporal, o gauge de benchmark, o breakdown de formatos, o heatmap, os melhores dias e as hashtags. Um idioma editorial de banda inteira com bloco de interpretação por baixo de cada gráfico exige, ou autorização explícita para editar ficheiros locked, ou uma camada nova de gráficos fora dessa pasta com duplicação temporária. A definição do tipo `ReportData` também vive num ficheiro locked (`report-mock-data.ts`), portanto qualquer campo novo no modelo pede autorização.

Risco 2 — a apresentação e o gating estão entrelaçados. O corte Grátis / Grátis com email / Pro não é um filtro no fim do pipeline: está espalhado por `report-shell-v2.tsx`, `access-gating.ts`, `block-config.ts`, pelos teasers, pelo `end-of-free-block`, pela `sticky-unlock-bar` e pela navegação lateral com badges e cadeados. Reescrever a camada de apresentação em bandas narrativas reescreve, na prática, as fronteiras do gate. É o ponto onde uma migração "só visual" pode partir receita silenciosamente. Recomenda-se extrair o gating para um contrato explícito antes de mexer no layout.

Risco 3 — superfícies paralelas que consomem a mesma shell. O Report Lab, as duas rotas de pré-visualização de admin, o relatório histórico em `/reports/$snapshotId` e a rota de impressão do PDF montam ou espelham a mesma composição. O PDF tem documento próprio (`src/lib/pdf/report-document.tsx`), pelo que um relatório editorial no ecrã e um PDF com o layout antigo divergem visualmente já no primeiro dia, e a rota de impressão pode partir se o DOM mudar. Qualquer migração precisa de uma decisão explícita sobre estas quatro superfícies.

Conflitos com o brief
- O brief chama a estrutura actual "dashboard de cartões empilhados". Não é exactamente isso: já existe uma estrutura editorial de blocos com pergunta humana, subtítulo, sidebar sticky e caixas de leitura em linguagem simples (`AIInsightBox`, `LeituraIaBox`, veredictos por cartão). O Editorial V2 é uma reformulação de densidade e enquadramento, não a introdução de um idioma inexistente — vale calibrar o esforço em conformidade.
- O brief diz que "entitlements, créditos, gating e analytics não podem mudar", mas o gating é presentational-adjacent (Risco 2). Sem uma extracção prévia, "não mudar" e "substituir a camada de apresentação" não podem ser ambos verdade.
- A referência usa capas compostas em CSS. O produto real tem imagens reais e uma ronda dedicada foi gasta a garanti-las. As capas em CSS não devem ser adoptadas como especificação — apenas o estado degradado.
- Os dois ficheiros anexados chamam-se `relatorio-v4.html` e `relatorio-mobile-375.html`; o brief refere `relatorio-v5-desktop.html`. Confirmar se o desktop anexado é a versão pretendida.
