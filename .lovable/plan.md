
# Correções visuais e melhorias UX/UI — Bloco 1 (Overview)

## Problemas identificados

1. **ComparisonHeader** repete informação já presente no Hero (avatar, handle, seguidores) — redundância visual confusa
2. **ScoreGrid** usa `text-eyebrow-sm` como classe CSS mas o eyebrow "PONTUAÇÃO GLOBAL" não segue o token do design system
3. **ScoreCard** — cards com `border-slate-200/60` e `bg-white` ficam quase invisíveis contra o fundo branco/canvas da page
4. **ScoreRing** — o texto do score dentro do SVG usa tamanho fixo `fontSize="20"` que não escala bem em mobile
5. **EngagementCardRefined** — o `maxHeight: 130` no chart é inline style rígido; o header "Taxa de envolvimento" tem fonte genérica sem usar os tokens
6. **Spacing** — `pt-4` entre zonas B e C cria espaçamento inconsistente com o `space-y-5` do container
7. **Legend** do ScoreGrid usa cores hardcoded em vez dos tokens de `SCORE_COLORS`
8. **CompetitorModal** — botão "Ver planos PRO" usa variant default sem estilo premium (gold/amber)

## Plano de correções

### 1. Remover ComparisonHeader redundante
O Hero v2 já mostra avatar, handle, followers. O ComparisonHeader dentro do bloco repete tudo. Substituir por uma faixa compacta com apenas o botão "Adicionar concorrente PRO" + label contextual.

### 2. Melhorar ScoreCard visualmente
- Adicionar `shadow-sm` e `bg-white` com bordo mais visível (`border-slate-200`)
- Adicionar padding interno mais generoso (`px-3 py-4`)
- Melhorar o hover com `hover:shadow-md` e leve elevação
- Usar `REDESIGN_TOKENS.card` ou um subset dele para consistência

### 3. Refinar ScoreGrid
- Remover `text-eyebrow-sm` inline e usar o token `REDESIGN_TOKENS.eyebrow`
- Melhorar spacing do grid: `gap-3` em vez de `gap-2.5`
- Legend: usar `SCORE_COLORS` importado em vez de cores hardcoded

### 4. Ajustar ScoreRing
- Reduzir `size` default para 64 em mobile, 72 em desktop (via prop ou responsive)
- Score text: usar `fontSize` proporcional ao `size`

### 5. Melhorar EngagementCardRefined
- Usar `REDESIGN_TOKENS.card` para consistência
- Remover inline `maxHeight` rígido, usar classe Tailwind `max-h-[130px]`
- Melhorar tipografia do header com tokens

### 6. Corrigir spacing do ReportOverviewBlock
- Remover `pt-4` individuais, deixar o `space-y-6` do container gerir o ritmo
- Eliminar redundância do ComparisonHeader

### 7. Melhorar CompetitorModal
- Botão "Ver planos PRO": usar estilo gold/amber premium (variant="premium" ou custom)
- Melhorar contraste do ghost chart

### 8. Responsividade mobile
- ScoreGrid: garantir 2x2 mobile com gap adequado
- ComparisonHeader simplificado: stack vertical em mobile

## Ficheiros a editar

- `src/components/report-redesign/v2/report-overview-block.tsx` — layout e spacing
- `src/components/report-redesign/v2/overview/comparison-header.tsx` — simplificar para CTA-only
- `src/components/report-redesign/v2/overview/score-card.tsx` — visual melhorado
- `src/components/report-redesign/v2/overview/score-grid.tsx` — tokens e legend
- `src/components/report-redesign/v2/overview/score-ring.tsx` — responsividade
- `src/components/report-redesign/v2/report-overview-engagement.tsx` — tokens e chart height
- `src/components/report-redesign/v2/overview/competitor-modal.tsx` — CTA premium
