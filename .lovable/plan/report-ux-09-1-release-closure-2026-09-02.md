# Report UX 09.1 — Release Closure

Ronda de provas, não de redesign. Só se altera código se algum teste revelar BLOCKER ou MAJOR real.

## Estado verificado antes deste plano

- Existem já as guardas automáticas relevantes em `src/components/report-redesign/v2/__tests__/`: `report-shell-composition`, `access-gating`, `comment-intelligence-truth`, `pro-gate-handoff`, `conversion-hierarchy`, `premium-cta-unification`, `header-consistency`, `card-review-04-05/06/07`.
- O handoff Pro passa por uma única função pura (`buildProCheckoutSearch`), consumida por `premium-cta-context.tsx` — ou seja, Pro Gate e StickyUnlockBar partilham o mesmo construtor de parâmetros. A prova do ponto 7 confirma-se por execução, não por inspecção.

## Execução

### Fase 1 — Provas automáticas
Correr a suite completa do relatório (`src/components/report-redesign/**`) e o typecheck. Registar verde/vermelho por ficheiro. Cobre directamente os pontos 3 (CTA único no Estado A), 6 (Comment Intelligence) e parte de 4/5 (composição).

Para o ponto 7, executar `buildProCheckoutSearch` com um snapshot real e imprimir os parâmetros produzidos por cada uma das duas superfícies (Pro Gate e StickyUnlockBar), em forma sanitizada. Ausência de `report_cache_key` = BLOCKER.

### Fase 2 — Provas visuais por Playwright
Sobre o mesmo snapshot, percorrer `/admin/report-lab` (estado embebido), preview fullscreen admin (`state=a|b|c`) e a rota pública `/analyze/$username`, com captura de ecrã em 320 / 375 / 390 / 430 / 1280 / 1440 / 1728.

Por estado, confirmar explicitamente (não inferir):
- **A** — gate dentro de `PostComparisonPreview` abre o `ConversionSheet`; `StickyFreeCtaBar` com a mesma promessa e o mesmo destino; nenhum `DeepenAnalysisCta` concorrente.
- **B** — PostComparison completo, Formatos, Conversas, Pro Gate; sem Diagnóstico, sem Prioridades, sem gate de email residual.
- **C** — tudo de B mantido, Comment Intelligence presente, Pro Gate e Sticky Pro ausentes, Diagnóstico e Prioridades presentes, faixa de entrada Pro uma única vez, nada visualmente bloqueado.
- **C+** — snapshot Pro com pelo menos um concorrente: camada comparativa acrescenta sem substituir cards base nem remover Conversas/Diagnóstico/Prioridades, sem cair no ramo antigo, sidebar e anchors funcionais.

Paridade Lab ↔ fullscreen ↔ público comparada apenas em ordem, presença/ausência de cards, gates, badges, Pro e comparação — o chrome administrativo é ignorado.

Responsivo: registar overflow horizontal, erros de consola relevantes, headers inline e usabilidade dos CTAs em cada largura.

### Fase 3 — Correcções (condicional)
Só se a Fase 1 ou 2 revelar BLOCKER ou MAJOR. Correcção mínima e dirigida, com o teste de guarda correspondente. Nada de melhorias visuais, nova copy ou mudanças de fórmula.

## Entrega

Matriz Estado × Desktop × Mobile × Composição × Resultado para A / B / C / C+, seguida de listas separadas BLOCKER / MAJOR / MINOR / UX DEBT / ANALYTICAL DEBT, mais a classificação da posição da camada comparativa C+ (`OK AS IS` ou `UX DEBT`, sem a mover).

A dívida analítica conhecida — `medianIndexFromBenchmark` vs pesos 60/40, `chartBenchmarkVal` vs `k.engagementBenchmark`, `sampleComments`, limitations por substring, persistência de `thumbnailUrl` — é registada sem investigação.

Fecho com `REPORT UX READY FOR RELEASE` se BLOCKER = 0 e MAJOR = 0; caso contrário `REPORT UX RELEASE BLOCKED` com a lista do que falta.

## Notas técnicas

Scripts de verificação vivem em `/tmp/browser/`, fora do projecto. Ficheiros de produto que só se tocam em caso de BLOCKER/MAJOR: `src/routes/analyze.$username.tsx`, `src/components/report-redesign/v2/report-shell-v2.tsx`, `report-overview-block.tsx`. Sem alterações a `access-gating.ts`, `block-config.ts`, pipelines, sanitização de snapshot ou i18n analítico.
