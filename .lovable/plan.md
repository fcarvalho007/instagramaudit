## Lote G — Turn 3 (finalizar)

Objetivo: eliminar a copy PT hard-coded restante no report público, sem mexer em lógica/dados.

### Ficheiros a localizar

Grandes (editorial):
1. `caption-diagnostics-card.tsx` (~1170 linhas) — verbatim das perguntas Q03/Q04, fallbacks, callouts.

Médios:
2. `report-post-comparison.tsx` (417) — labels de comparação de posts.
3. `report-overview-engagement.tsx` (249) — copy do bloco engagement overview.
4. `report-overview-attention-row.tsx` (204) — labels da linha de atenção.
5. `overview/comparison-header.tsx` (187) — cabeçalho do modo comparação.
6. `overview/diagnostic-summary.tsx` (159) — resumo lateral.
7. `report-benchmark-evidence.tsx` (115) — chips de evidência.
8. `overview/competitor-modal.tsx` (101) — modal de concorrente.
9. `report-positioning-banner.tsx` (57) — banner curto.

### Abordagem

- Adicionar chaves em `src/i18n/locales/{pt,en}/report.json` agrupadas por namespace (`caption.*`, `posts_comparison.*`, `engagement_overview.*`, `attention_row.*`, `comparison.*`, `diagnostic_summary.*`, `benchmark_evidence.*`, `competitor_modal.*`, `positioning.*`).
- Em cada ficheiro: `useTranslation("report")` + substituir literais por `t(...)`.
- Preservar formatação numérica via `formatCompactNumber` / `Intl.NumberFormat` já existentes.
- Nenhuma alteração à lógica de cálculo, props, ou estilos.

### Ordem de execução

1. Médios + pequenos (2–9) primeiro — wins rápidos, baixo risco.
2. `caption-diagnostics-card.tsx` por último, em sub-passos: (a) headers e badges, (b) corpo das perguntas Q03/Q04, (c) fallbacks e callouts.
3. `bunx tsc --noEmit` no fim para validar.

### Fora de scope

- Componentes admin/internos.
- Cards já localizados (themes, hashtag, cover, comments, diagnostic-block).
- Refactor visual ou lógico.

### Checkpoint

☐ 9 ficheiros localizados, sem strings PT residuais visíveis ao utilizador.
☐ `report.json` PT/EN com paridade total das novas chaves.
☐ Build sem erros TypeScript.