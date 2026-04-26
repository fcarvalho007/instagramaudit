Plano de refinamento UX da pré-visualização admin do relatório real

Estado observado
- A rota `/admin/report-preview/snapshot/$snapshotId` já tem banner admin + bloco "Limitações conhecidas". O bloco menciona nº de publicações e janela em dias.
- Os componentes do relatório (ex.: `report-key-metrics`, `report-temporal-chart`, `report-top-posts`, `report-competitors`) têm strings fixas "30 dias" / "últimos 30 dias" em subtítulos. Isto é enganador no preview real (snapshot do `frederico.m.carvalho` tem 12 posts, não 30 dias).
- O snapshot real tem 0 concorrentes; o adapter já força "só perfil analisado" mas a secção `ReportCompetitors` continua a mostrar texto fixo "vantagem estreita … 0,18 p.p." no rodapé (texto do mock).
- O snapshot tem 0 insights de IA → o adapter devolve `aiInsights: []`. A secção `ReportAiInsights` faz `.map` sobre array vazio: render visualmente vazio, mas título/cabeçalho continua → estado vazio confuso.
- O `ReportHeader` mostra sempre o pill "Relatório completo" e botões "Exportar PDF" / "Partilhar" — no preview admin estas acções não estão ligadas; cria expectativa errada.
- O adapter NÃO consome `thumbnail_url`/`avatar_url` reais; já usa gradientes. Cumpre o requisito de "não proxy/store de media IG".
- `/report/example` usa exactamente o mesmo `ReportPage` via mock. Toda a alteração tem de ser feita sem mudar visualmente o exemplo.

Princípio
- Tornar dinâmicas as strings "30 dias" e os textos fixos sensíveis à amostra, com defaults que mantêm o mock idêntico.
- Esconder ou substituir por estado vazio editorial as secções sem dados reais (concorrentes, AI insights).
- Adicionar nota explícita no banner admin (posts, janela, competitors, secções derivadas).
- Não tocar no PDF, no email, no `/analyze/$username`, no landing público.
- Não chamar Apify.

Alterações detalhadas

1. `src/components/report/report-mock-data.ts`
   - Estender `reportData` com campos opcionais novos (todos com defaults compatíveis com o mock):
     - `meta.windowLabel`: `"últimos 30 dias"` (default usado pelo mock).
     - `meta.windowShortLabel`: `"30 dias"`.
     - `meta.kpiSubtitle`: `"janela de 30 dias"`.
     - `meta.isAdminPreview?: boolean` (false no mock).
   - Adicionar tipo `ReportData["meta"]` ao tipo exportado.

2. Componentes do relatório (substituir strings fixas por `meta.*`, mantendo defaults):
   - `report-key-metrics.tsx`: `subtitle = meta?.kpiSubtitle ?? "janela de 30 dias"`.
   - `report-temporal-chart.tsx`: label = `Evolução temporal · ${meta?.windowLabel ?? "últimos 30 dias"}`.
   - `report-top-posts.tsx`: subtitle = `Ordenadas pelo envolvimento percentual nos ${meta?.windowLabel ?? "últimos 30 dias"}.`
   - `report-competitors.tsx`: subtitle dinâmica; o parágrafo final ("vantagem estreita …") só aparece quando há > 1 competitor; caso contrário, mostrar texto editorial neutro indicando que apenas o perfil foi analisado neste snapshot.
   - `report-ai-insights.tsx`: se `aiInsights.length === 0`, renderizar estado vazio editorial ("Insights ainda não gerados para este snapshot.") em vez de cabeçalho sem conteúdo.
   - `report-header.tsx`: pill "Relatório completo" + botões "Exportar PDF" / "Partilhar" passam a ser ocultados quando `meta?.isAdminPreview === true` (default false → mock inalterado). Substituir por chip neutro "Pré-visualização admin".

3. `src/lib/report/snapshot-to-report-data.ts`
   - Calcular `windowLabel`/`windowShortLabel`/`kpiSubtitle` a partir de `windowDays` real e do nº de posts:
     - `kpiSubtitle = "amostra de N publicações · X dias"` (ou `"amostra de N publicações"` se windowDays = 0).
     - `windowLabel = "amostra recente"` quando windowDays < 7 ou postsAvailable < 20; senão `"últimos X dias"`.
     - `windowShortLabel = "X dias"` quando aplicável; senão `"amostra"`.
   - Definir `meta.isAdminPreview = true` no `data` retornado.
   - Devolver `competitors: []` quando o snapshot não tem competitors reais (em vez de devolver só o perfil próprio), para que `ReportCompetitors` possa entrar no caminho de estado vazio.
     - Acrescentar fallback no componente: se `competitors.length === 0`, esconder secção inteira.

4. `src/routes/admin.report-preview.snapshot.$snapshotId.tsx`
   - Reforçar `CoverageNotice`:
     - Sempre indicar `N publicações analisadas · janela aproximada de X dias`.
     - Linha sobre concorrentes: "Concorrentes não recolhidos — secção ocultada." quando vazio.
     - Linha sobre AI: "Insights de IA ainda não gerados — estado vazio na secção."
     - Linha sobre miniaturas: "Miniaturas e avatar usam gradientes editoriais — não são proxy de imagens do Instagram."
     - Linha sobre benchmark continua, agora reflectindo `coverage.benchmark === "real" | "partial" | "placeholder"`.

5. Espelhar mesmas atualizações na rota gémea `src/routes/admin.report-preview.$username.tsx` (banner + CoverageNotice).

Sem alterações
- `/report/example`: o mock fornece os mesmos defaults antigos via `meta`; texto do `ReportCompetitors` permanece visualmente idêntico (vai pelo caminho `> 1 competitor`).
- PDF / email: usam dataset próprio; intactos.
- `/analyze/$username`: intacto.
- Landing público: intacto.

Validação
- `/admin/report-preview/snapshot/$snapshotId` abre.
- KPI "Publicações analisadas" mostra "amostra de 12 publicações · X dias", sem "30 dias" fixo.
- Subtítulo do gráfico temporal e das top posts deixa de prometer 30 dias quando a amostra é menor.
- Secção de concorrentes oculta para o snapshot do `frederico.m.carvalho` (0 competitors).
- Secção de AI insights mostra estado vazio claro.
- Header em modo admin esconde "Exportar PDF" / "Partilhar" e substitui pelo chip "Pré-visualização admin".
- `/report/example` permanece visualmente idêntico (mock injeta defaults antigos).
- `bunx tsc --noEmit` ✓ e `bun run build` ✓.
- Sem chamadas Apify.

Ficheiros previstos
- editar: `src/components/report/report-mock-data.ts` (acrescentar campo `meta` opcional + defaults)
- editar: `src/components/report/report-key-metrics.tsx`
- editar: `src/components/report/report-temporal-chart.tsx`
- editar: `src/components/report/report-top-posts.tsx`
- editar: `src/components/report/report-competitors.tsx` (estado vazio + texto dinâmico)
- editar: `src/components/report/report-ai-insights.tsx` (estado vazio)
- editar: `src/components/report/report-header.tsx` (modo admin vs público)
- editar: `src/lib/report/snapshot-to-report-data.ts` (popular `meta`, devolver `[]` em competitors quando vazio)
- editar: `src/routes/admin.report-preview.snapshot.$snapshotId.tsx` (CoverageNotice mais rico)
- editar: `src/routes/admin.report-preview.$username.tsx` (paridade)

Checkpoint
☐ Mock sem alterações visuais em `/report/example`
☐ Strings "30 dias" deixam de ser fixas no preview real
☐ Concorrentes vazios → secção oculta
☐ AI insights vazios → estado vazio editorial
☐ Header admin esconde acções não ligadas
☐ CoverageNotice cobre posts, janela, concorrentes, IA, miniaturas
☐ Sem Apify, sem PDF, sem email, sem migrações
☐ tsc + build ok