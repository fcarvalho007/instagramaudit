## Refinar passo 2/3 do onboarding — empilhar as duas perguntas

Aproximar do mockup: as duas perguntas ("Que relação tens com…" e "O que mais te interessa perceber?") ficam **empilhadas verticalmente**, cada uma ocupando a largura toda do modal com os 4 chips em linha — em vez de lado-a-lado em colunas comprimidas.

### Alteração

**Ficheiro:** `src/components/onboarding/onboarding-modal.tsx` (`Step2Context`, linhas ~920-967)

1. Remover o wrapper `flex sm:flex-row` que coloca as duas colunas lado-a-lado.
2. Substituir por `space-y-5` (ou `flex flex-col gap-5`) para empilhar.
3. Remover `flex-1` dos dois grupos (deixam de competir por espaço).
4. Garantir que o `ChipGroup` interno mantém `grid-cols-2 sm:grid-cols-4` para mostrar os 4 chips em linha em desktop e 2x2 em mobile.

Resultado: layout idêntico ao mockup — pergunta 1 + 4 chips full-width, pergunta 2 + 4 chips full-width, microcopy, CTAs.

Nenhuma alteração de copy, ícones, tokens, lógica de form ou navegação entre passos.
