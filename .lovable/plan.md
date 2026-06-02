## Objetivo

Três ajustes visuais ao relatório em `/analyse/$username`, sem alterar lógica, dados ou rotas.

## (a) Remover card de feedback duplicado dos emojis

Existem dois widgets de feedback no relatório:
- `BlockFeedback` — card grande com título "Uma breve pausa para te ouvirmos" + 5 emojis (após o Bloco 1, só visível com `unlocked`).
- `EndFeedbackStrip` — variante compacta no fim, dentro do `ReportEndOfFreeBlock`.

São redundantes. Manter apenas o do fim.

**Mudança**:
- `src/components/report-redesign/v2/report-shell-v2.tsx`
  - Remover o bloco JSX entre as linhas 283–291 (`BlockFeedback` + wrapper `<div className="mt-6 md:mt-8 mb-2">`).
  - Remover o import na linha 47 (`BlockFeedback`).
- Deixar `block-feedback.tsx` em disco (não tocar — pode ainda ser usado por outros pontos futuros; só desativar uso). Se grep confirmar zero usos restantes, removo também o ficheiro.

## (b) Ampliar thumbnails no card "Formato"

O card "Frequência" ao lado tem muito mais peso visual (calendário 7×6). O grid de thumbnails no `FormatCard` é `repeat(min(N,6), 1fr)` com `aspect-ratio 3/4` → resulta em miniaturas pequenas em 2 linhas de 6.

**Mudança** em `src/components/report-redesign/v2/overview/format-card.tsx` (linhas ~326–366):
- Trocar grid para `repeat(min(N,4), 1fr)` → 4 colunas, 3 linhas para 12 posts; mais "presença".
- Aumentar `gap` de `gap-1` → `gap-2`.
- Manter `aspect-ratio 3/4` (formato vertical IG), mas como a célula passa a ser maior, as thumbs ficam visualmente maiores.
- Aumentar o dot indicador de formato de `size-[6px]` → `size-2` e o ícone fallback de `size-3.5` → `size-5` para acompanhar a escala.

Sem alterações em copy, legenda ou lógica de ordenação.

## (c) Redesenhar marcadores "melhor" e "pior" do scatter

Atual (em `report-post-comparison.tsx`, função `ExtremeMarker` ~650–719):
- "melhor": aura azul + ★ por cima
- "pior": aura âmbar/ouro + ▾ por baixo
- Texto da label em 9px, cor igual ao ponto, parece desalinhado e pesado

**Mudança**:
- Substituir os símbolos unicode (★, ▾) por ícones `lucide-react`:
  - melhor → `TrendingUp` (ou `Sparkles`), cor `--accent-primary` (#0077B6 / ocean)
  - pior → `TrendingDown`, cor `--signal-warning` semântica mas suavizada (usar `--content-tertiary` para o âmbar ficar discreto, mantendo o azul como protagonista único — alinha com a paleta Ocean Breeze)
- Renderizar o ícone via `<foreignObject>` no SVG (12×12px) num pequeno "chip" arredondado:
  - chip: `rounded-full` branco com `border` ténue da cor do tom, `shadow-sm`, padding 3px
  - posicionado a `cy ± 18` (acima para best, abaixo para worst)
- Label "melhor"/"pior" passa a ser uma pill em Inter 10px SemiBold uppercase tracking-wide, cor do tom, fundo `rgba(white, 0.85)` com border-1 do tom — visualmente mais "etiqueta editorial", menos texto solto.
- Aumentar o ponto principal de `r=5` para `r=6` e reduzir opacidade da aura para 0.14 (mais clean).

Resultado: marcadores parecem badges premium em vez de símbolos ASCII; mantém legibilidade e hierarquia clara (best > worst).

## Fora de âmbito

- Onboarding, report logic, credits, pricing, tracking, DB, rotas — intactos.
- Copy: zero alterações (mesmas chaves i18n `posts.scatter.best_marker` / `worst_marker`).
- `BlockFeedback` lógica de submissão não é tocada — só deixa de ser renderizado.

## Validação

1. `bunx tsc --noEmit`
2. `rg "BlockFeedback" src/` → confirmar zero referências (ou só o ficheiro autocontido).
3. QA visual no preview em `/analyse/frederico.m.carvalho` (desktop 1440 + mobile 390).

## Checkpoint

- ☐ `BlockFeedback` removido do shell, sem regressões
- ☐ Grid de thumbnails em 4 colunas, miniaturas visivelmente maiores
- ☐ Marcadores melhor/pior com ícones lucide + pill label, sem ★/▾
- ☐ `tsc` limpo
- ☐ Sem alterações em rotas, dados, copy ou backend
