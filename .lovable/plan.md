
# Redesenho do Bloco 01 — Overview (3 zonas + CompetitorModal)

Substituir o conteúdo actual de `ReportOverviewBlock` por uma estrutura em 3 zonas verticais (header de comparação, pontuação global com scorecards, card de taxa de envolvimento refinado) e um novo `CompetitorModal`.

## Ficheiros a criar

### 1. `src/components/report-redesign/v2/overview/score-ring.tsx`
Componente SVG reutilizável para o anel de progresso dos scorecards:
- Círculo de fundo + círculo de progresso (r=30, stroke 6px)
- Animação CSS de `stroke-dashoffset` (0 → valor final, 800ms ease-out)
- Sistema cromático: 0-49 danger (#A32D2D), 50-89 warning (#854F0B), 90-100 success (#0F6E56)
- Props: `score: number`, `size?: number` (default 72)
- `role="img"` + `<title>` descritivo

### 2. `src/components/report-redesign/v2/overview/score-card.tsx`
Scorecard individual clicável:
- Background `surface-primary`, border 0.5px `border-tertiary`, border-radius 8px
- Anel de progresso centrado + label + sublegenda
- `<button>` wrapper com `aria-label` completo
- Hover: border → secondary, cursor pointer
- Tooltip (Radix UI via shadcn Tooltip) com pergunta + cálculo simplificado
- onClick dispara scroll suave para a secção correspondente

### 3. `src/components/report-redesign/v2/overview/score-grid.tsx`
Grelha dos 4 scorecards + legenda da escala:
- Label "PONTUAÇÃO GLOBAL" (eyebrow)
- Grid 4 colunas (2x2 em < 720px)
- Legenda com 3 indicadores cromáticos abaixo da grelha

### 4. `src/components/report-redesign/v2/overview/score-utils.ts`
Funções puras de cálculo dos 4 scores:
- `computeEnvolvimento(engagementRate, tierBenchmark) → number` — min(100, round((ER/benchmark)*100))
- `computeFrequencia(postsPerWeek) → number` — curva sino centrada em 4
- `computeInteraccao(avgComments, postCount, tierCommentRate, brandResponseRate) → number` — composto 50/50
- `computeMensagem(dispersaoIndex, funilDistribuicao, ctaPercentage) → number` — composto 33.3% cada
- `getScoreFamily(score) → "danger" | "warning" | "success"` — thresholds 0-49/50-89/90-100
- Sublegendas dinâmicas para cada score

### 5. `src/components/report-redesign/v2/overview/comparison-header.tsx`
Zona A — header de comparação:
- Avatar circular 40x40 + handle + badge verificado + metadados (seguidores, publicações, dias)
- Spacer flexível
- Botão outline "Adicionar concorrente" com badge PRO (accent-gold)
- Separador 0.5px abaixo

### 6. `src/components/report-redesign/v2/overview/competitor-modal.tsx`
Modal CompetitorModal (PRO teaser):
- Dialog shadcn/ui (480px, overlay rgba(0,0,0,0.6))
- Título Fraunces + subtítulo
- Preview fantasma: mini-gráfico estático com barra tracejada "Concorrente"
- 3 benefícios PRO com ícone Check
- CTA duplo: "Ver planos PRO" (primary) + "Continuar grátis" (ghost)
- Focus trap, Esc, overlay click

## Ficheiros a modificar

### 7. `src/components/report-redesign/v2/report-overview-block.tsx`
Reescrever para compor as 3 zonas na ordem:
1. `ComparisonHeader` (Zona A)
2. `ScoreGrid` (Zona B) — com cálculo dos scores a partir de `result`
3. `EngagementRateCard` existente refinado (Zona C)
4. Top Posts (mantém-se)

O componente extrai dos dados do `AdapterResult` os valores necessários para calcular os 4 scores, delegando a `score-utils.ts`.

### 8. `src/components/report-redesign/v2/report-overview-cards.tsx`
O `EngagementRateCard` mantém-se neste ficheiro mas com 3 refinamentos:
- Header: "Taxa de envolvimento" (13px, w500) + "◈ MERCADO · SOCIALINSIDER" (10px, eyebrow, direita)
- Linha hero: 0,08% (22px) + ref. tier 4,20% (12px) + -4,1 p.p. (12px, signal-danger)
- Gráfico: altura 130px, sem grid verticais, 3 horizontais a 4% opacidade, legend.display: false

Os cards `PostingRhythmCard` e `DominantFormatCard` deixam de ser renderizados no Bloco 01 (a informação passa para os scorecards).

## Dados disponíveis vs. necessários

| Score | Dados disponíveis no AdapterResult | Dados em falta |
|---|---|---|
| Envolvimento | `keyMetrics.engagementRate`, `keyMetrics.engagementBenchmark` | — |
| Frequência | `keyMetrics.postingFrequencyWeekly` | — |
| Interacção | `keyMetrics.avgComments`, `keyMetrics.postsAnalyzed` | `tierCommentRate`, `brandResponseRate` (fallback 0) |
| Mensagem | — | `dispersaoIndex`, `funilDistribuicao`, `ctaPercentage` (fallback placeholder score 50) |

Para Interacção e Mensagem: valores em falta terão fallback seguro (score neutro 50 com sublegenda "dados insuficientes"), sem bloquear a implementação visual.

## Notas técnicas

- Sem novos tokens CSS — usa combinações dos existentes em `report-tokens.ts` e Tailwind directo
- Sem novas dependências npm (shadcn Dialog e Tooltip já disponíveis)
- Sem alteração a ficheiros locked
- Animação dos anéis via CSS `transition` em `stroke-dashoffset` (sem Framer Motion)
- Scorecards clicáveis fazem `document.getElementById(blockId)?.scrollIntoView({ behavior: 'smooth' })`
