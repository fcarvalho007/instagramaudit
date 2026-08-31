# Report UX 6B.1 — Sistema de enquadramento e densidade

Objetivo: o mesmo relatório, 20–30% mais leve e mais organizado, alterando apenas
enquadramento (largura, containers, ritmo vertical, cabeçalho de capítulo, relação
sidebar ↔ conteúdo). Zero alterações internas em componentes analíticos.

## 0. Baseline visual (antes de tocar em CSS)

Captura via Playwright do mesmo relatório em:
- Estado A (anónimo): desktop 1440 e 1280, mobile 390
- Estado B (lead com email): desktop 1440, mobile 390
- Estado C (Pro): desktop 1440, mobile 390

Estados B e C obtidos por sessão de QA/admin preview existente, sem alterar dados nem
gates. Se um estado não for reproduzível sem alterar dados, fica registado como não
comprovado em vez de forçado.

## 1. Regras de preservação

Congelados internamente (só podem receber container exterior novo):
EditorialIdentityCard, EngagementCardRefined, CommentIntelligenceSection,
ReportDiagnosticBlock, ReportDiagnosticCard, CaptionDiagnosticsCard,
HashtagDiagnosticsCard, VisualCoverAnalysisCard, PostComparisonBlock, cards de
frequência/formato, fórmulas, classifiers, benchmarks, prompts IA, estados
pending/error e copy.

Tokens genéricos de card não são tocados: `card`, `cardKpi`, `kpiCardV2`, `kpiValue*`,
`kpiIconBoxV2`, `cardSoft`. Só mexem tokens confinados ao shell/capítulo.

## 2. Alterações de spacing propostas

| Zona | Actual | Proposto |
| --- | --- | --- |
| `ReportBlockSection` padding vertical | `py-14 md:py-24` | `py-8 md:py-12` |
| Header do capítulo (topo) | `pt-8 md:pt-10` | `pt-6 md:pt-8` |
| Header → conteúdo | `pb-8/10` + `pt-10 md:pt-12` | `pb-5 md:pb-6` + `pt-6 md:pt-8` |
| Espaço entre cards irmãos | `space-y-8 md:space-y-10` | `space-y-6 md:space-y-8` |
| Caixa do número | `140×120 / 160×140` | `88×80 / 104×92`, oculta ou inline em mobile |
| Número do capítulo | `4.5rem / 5.5rem` | `2.5rem / 3rem` |
| Gap header horizontal | `gap-5 md:gap-8` | `gap-4 md:gap-6` |
| Subtítulo do capítulo | `15/17/20px` | `14/15/16px` |
| Secção Conversas | `mt-8 sm:mt-10` | alinhado ao novo ritmo (`mt-6 sm:mt-8`) |
| Hero → primeiro capítulo | `pt-3 lg:pt-4` + `py-14` do bloco | `pt-2 lg:pt-3`, primeiro bloco sem padding de topo |

Números são ponto de partida; ajustados por validação visual em 1280/1440/1728.

## 3. Largura e sidebar

- Mantém-se o canvas `max-w-[1520px]`; introduz-se largura de leitura interna para
  cabeçalhos de capítulo e blocos textuais (`max-w-[820px]`) para evitar linhas longas
  em 1728 px, deixando gráficos com largura total.
- Sidebar: `w-64 xl:w-72` → `w-60 xl:w-64`, gap `gap-8 lg:gap-10` → `gap-8`,
  sticky offset alinhado ao novo topo. Sem alterar itens, badges, ícones, estados,
  labels, cliques nem `access-gating.ts`.

## 4. Bandas, progress bar e primeiro bloco

- Bandas canvas/white/soft-blue mantidas; com menos espaço, a `bandSoftBlue` pode ficar
  demasiado presente — nesse caso suaviza-se apenas o border-y do frame, nunca as cores
  internas dos cards.
- Reading progress mantida. Se ficar ruidosa no novo ritmo, fica documentada para 6B.3,
  não removida.
- Primeiro bloco encosta ao hero mantendo score/veredicto como foco, sem overflow.

## 5. Ficheiros a alterar

- `src/components/report-redesign/v2/report-block-section.tsx` (ritmo + header)
- `src/components/report-redesign/report-tokens.ts` (apenas `chapterNumber`,
  `chapterNumberBox`, `chapterSubtitle`; nenhum token de card)
- `src/components/report-redesign/v2/report-shell-v2.tsx` (gaps do layout 2-col,
  margens das secções inline)
- `src/components/report-redesign/v2/report-block-nav.tsx` (apenas largura/sticky da
  `<nav>` desktop)

## 6. Validação

- Estados A/B/C em desktop e 390 px; nenhum estado pode parecer vazio.
- Mobile 320/375/390/430 sem overflow, com atenção ao chapter header.
- `bunx vitest run` para access-gating e composition tests (6B.0) + `tsgo --noEmit`.
- Screenshots antes/depois lado a lado e tabela final de spacing.
- Confirmação explícita de zero alterações a métricas, texto, gates, CTAs,
  entitlements e analytics.

## 7. Roadmap ajustado (conforme pedido)

Removido de 6B.5: unificação de `score-card` / `report-kpi-grid-v2`, fonte única de
metodologia e limpeza de texto IA. Passam para uma ronda posterior de dívida técnica,
separada do trabalho visual.

Critério de fecho: `READY FOR REPORT UX ROUND 6B.2` apenas se a redução de densidade
produzir ganho claro sem alterar informação nem comportamento.
