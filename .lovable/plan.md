## Objectivo

Redesenhar a zona Z4 da Q05 (secção "Posts que geraram mais conversa") no relatório. Actualmente mostra 2 cards com imagem quadrada (1:1) numa grid de 2 colunas. O resultado ficará com 3 cards na proporção 3:4, layout mais limpo e link visível para o post original.

## Alterações

### 1. Dados — aumentar de 2 para 3 posts

**Ficheiro:** `src/lib/report/block02-diagnostic.ts` (linha 618)

- Alterar `.slice(0, 2)` → `.slice(0, 3)`

### 2. UI — redesenhar os cards

**Ficheiro:** `src/components/report-redesign/v2/report-diagnostic-card.tsx` (linhas 792-864)

- Grid passa de `grid-cols-1 sm:grid-cols-2` → `grid-cols-1 sm:grid-cols-3`
- Imagem: `aspect-square` → `aspect-[3/4]` (proporção 3:4, mais vertical e elegante)
- Remover gradiente placeholder (`bg-gradient-to-br from-cyan-300...`) — usar fundo neutro `bg-surface-muted` quando não há thumbnail
- Badge do formato (REELS, CARROSSEL) mais subtil — manter posição top-right
- Link para o original: adicionar ícone de link externo subtil no canto superior esquerdo + tornar todo o card clicável (já implementado, mas melhorar hover state com `ring` em vez de `shadow`)
- Footer com contagem de comentários mais limpo
- Espaçamento e bordas refinados

### Sem alterações a

- Nenhuma tabela, RLS, migração ou endpoint
- Nenhum ficheiro bloqueado
- Nenhuma alteração ao report UI fora desta secção Z4

### Checklist

- ☐ `block02-diagnostic.ts` — slice(0, 3)
- ☐ `report-diagnostic-card.tsx` — grid 3-col, aspect-[3/4], hover ring, fundo neutro fallback
- ☐ Verificar build (tsc)
