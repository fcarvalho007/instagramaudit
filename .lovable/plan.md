## Lote F — KPI grid + restantes blocos do relatório público

Concluído até agora (Lote E): hero, identidade editorial, frequência, formato.
Falta traduzir o resto do `/analyze/$username` e do shell do relatório.

### Âmbito deste lote

1. **KPI grid (Bloco 1, faixa de métricas)**
   - `report-kpi-grid-v2.tsx`, `score-card.tsx`, `score-grid.tsx`
   - Labels: Engagement, Frequência, Interação, "vs benchmark", "do escalão", "posts analisados", estados (Acima/Abaixo/Em linha).
   - `formatCompactNumber` para os números resumidos.

2. **Shell do relatório**
   - `report-shell-v2.tsx`, `report-block-nav.tsx`, `report-block-section.tsx`, `cache-status-badge.tsx`, `source-badge.tsx`, `report-source-label.tsx`
   - Navegação de blocos ("Visão geral", "Diagnóstico", "Conteúdo", "Conversa", "Próximos passos"), badges de cache/fonte, datas formatadas via `formatLocaleDate`.

3. **Bloco 2 — Diagnóstico**
   - `report-diagnostic-block.tsx`, `report-diagnostic-grid-v2.tsx`, `report-diagnostic-card.tsx`, `report-diagnostic-summary-cards.tsx`, `report-diagnostic-verdict.tsx`, `report-diagnostic-priorities.tsx`, `report-diagnostic-cta.tsx`, `report-diagnostic-group.tsx`
   - Labels de severidade (Crítico / Atenção / OK), títulos de cards, CTAs ("Ver detalhe", "Próxima prioridade").

4. **Blocos de conteúdo e conversa**
   - `report-overview-block.tsx`, `report-overview-cards.tsx`, `report-overview-engagement.tsx`, `report-overview-attention-row.tsx`
   - `report-engagement-benchmark-chart.tsx`, `report-benchmark-evidence.tsx`, `report-positioning-banner.tsx`
   - `report-post-comparison.tsx`, `report-themes-feature.tsx`
   - `caption-diagnostics-card.tsx`, `hashtag-diagnostics-card.tsx`, `report-comment-intelligence.tsx`, `visual-cover-analysis-card.tsx`
   - Labels de eixos de chart, tooltips, legendas, estados vazios.

5. **Componentes premium/gate dentro do relatório**
   - `premium-callout.tsx`, `premium-interest-dialog.tsx`
   - CTAs, descrição da oferta PRO, formulário de interesse.

### Estratégia técnica

- Criar/expandir `src/i18n/locales/{pt,en}/report.json` com sub-secções: `kpi`, `shell`, `nav`, `diagnostic`, `content`, `conversation`, `premium`.
- Cada componente passa a usar `useTranslation('report')`; números mantêm-se via `formatCompactNumber`/`formatPercent`.
- Strings dinâmicas (delta vs benchmark, top-format) entregues via interpolação `{{...}}`.
- Estados de severidade convertidos em chaves enum (`severity.critical`, `severity.warn`, `severity.ok`) reutilizadas entre cards.
- Datas: helper `formatLocaleDate(date, lang, {month:'long', day:'numeric'})` substitui literais "de Janeiro".
- Testes em `__tests__/zone-d-helpers.test.ts` e equivalentes mantêm cobertura PT (validam que as chaves PT continuam a render correctamente).
- Confirmar que nenhum string permanece hard-coded com `rg "publicações|seguidores|benchmark|Próxima"` nestes ficheiros.

### Detalhes técnicos

- Não adicionar dependências.
- Manter export legados (`getFormatHeadline`, etc.) intactos.
- Documento `<head>` continua com canonical PT; client-side sync já existente cobre EN.
- Sem alterações em servidor: tudo é frontend/presentation.

### Checkpoint final

☐ KPI grid e score cards traduzidos e a usar tokens existentes  
☐ Shell, nav, badges de cache/fonte traduzidos  
☐ Bloco diagnóstico (cards, prioridades, CTA) traduzido  
☐ Blocos de conteúdo, conversa e premium traduzidos  
☐ Novas chaves adicionadas a `report.json` PT/EN  
☐ `rg` confirma ausência de strings hard-coded relevantes  
☐ Toggle de idioma alterna o relatório completo sem reload

Próximos lotes (fora deste): G — Admin/Sistema; H — Páginas legais e e-mails transaccionais.