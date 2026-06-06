## Diagnóstico

O gráfico não está realmente “ausente”: os valores aparecem, mas as barras quase desaparecem visualmente por três motivos principais:

1. **Pouco contraste** — as barras usam tons muito pálidos derivados de `accent-primary` misturado com branco; em fundo claro ficam quase invisíveis.
2. **Geometria fraca** — a área do gráfico usa barras estreitas, sem pista/coluna de leitura, e o baseline domina mais do que as barras.
3. **Hierarquia editorial baixa** — “RITMO POR DIA DA SEMANA” está pequeno e terciário; não guia o olhar nem comunica que ali existe uma visualização importante.

## Plano de correção

1. **Reforçar o gráfico de barras**
   - Dar às barras largura, altura e contraste suficientes para serem imediatamente visíveis.
   - Usar `accent-primary` no pico e uma versão editorial azul/ciano mais legível nos restantes dias.
   - Manter dias sem posts como linha curta, mas mais clara e intencional.
   - Adicionar uma coluna/pista subtil por dia para melhorar leitura sem parecer pesado.

2. **Elevar o cabeçalho do gráfico**
   - Transformar “RITMO POR DIA DA SEMANA” num título/eyebrow mais forte, com peso `semibold` e cor `content-primary` ou `accent-primary`.
   - Melhorar o chip “pico” para parecer legenda real, não texto solto.

3. **Aumentar legibilidade dos valores**
   - Reposicionar/formatar os números acima das barras para ficarem próximos da barra correspondente.
   - Destacar o número do pico com cor e peso maiores.
   - Preservar `tabular-nums` e Inter, sem mono.

4. **Alinhar com o exemplo visual do card**
   - Manter o padrão de caixas com ícone + label em cima e valor abaixo.
   - Refinar espaçamento, borda e fundo das três caixas para parecerem parte do mesmo sistema visual do relatório.

## Ficheiro a alterar

- `src/components/report-redesign/v2/overview/frequency-card.tsx`

Não vou alterar lógica de dados nem backend; é uma correção visual e de renderização do gráfico.