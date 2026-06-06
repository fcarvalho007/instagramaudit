## Goal

Refinar duas secções do relatório:

1. **Formato** — o gráfico de proporção aparece "vazio" no preview. Substituir por um visual cinematográfico, claramente preenchido, com hierarquia óbvia (Carrosséis 83% dominante vs Reels 17%).
2. **Frequência de publicação** — alinhar a paleta com o resto do report e dar contenção aos números soltos (2,8 / 33% / Terça) através de um agrupamento subtil que se enquadra no estilo editorial.

Sem alterações de lógica, dados, i18n ou geração de PDF.

## Ficheiros a alterar

- `src/components/report-redesign/v2/overview/format-card.tsx`
- `src/components/report-redesign/v2/overview/frequency-card.tsx`

## 1. Formato — gráfico cinematográfico

Diagnóstico do "branco":
O `FormatProportionBar` actual usa `color-mix(... var(--surface-base))` para segmentos secundários e depende de tokens que, em alguns contextos, devolvem um tom quase indistinguível do cartão. O segmento dominante (Carrosséis 83%) está a render-se sobre fundo do card e visualmente desaparece.

Redesign (substitui `FormatProportionBar`):

- **Hero split de duas colunas** dentro do card:
  - Coluna esquerda (~62%): número editorial gigante `83%` em Fraunces SemiBold (text-[4rem] md:text-[5rem]), com label `Carrosséis · 10 de 12` por baixo em Inter eyebrow. Cor: `--accent-primary`.
  - Coluna direita (~38%): bloco vertical proporcional (uma barra vertical alta) dividido em dois segmentos preenchidos:
    - Carrosséis: 83% da altura, fundo sólido `--accent-primary`.
    - Reels: 17% da altura, fundo `color-mix(in oklab, var(--accent-primary) 28%, white)` (tint claro garantido, sem dependência de `--surface-base`).
    - Cada segmento mostra `%` e label internamente (Inter SemiBold tabular-nums), branco sobre azul / `--content-primary` sobre tint.
  - Borda hairline `border-border-subtle/60`, `rounded-xl`, altura ~140px md:160px — proporção cinematográfica.
- **Legenda abaixo** mantém-se (Carrosséis · Reels · Imagens 0), apenas usa pontos com a mesma família azul (não emerald/sky/amber), unificando a paleta com o resto do report.
- Mantém `role="img"` + `aria-label` reutilizando i18n existente. Sem alteração à matemática (mesmo rounding-to-100, mesmo `segments` source).

Comportamento:
- Se houver 3+ formatos com count>0, a barra vertical empilha N segmentos pela mesma ordem desc, o número grande à esquerda continua a mostrar o dominante.
- Sem dados: retorna `null` (igual ao actual).

Filmstrip e bloco "A MELHORAR" mantêm-se exactamente como estão.

## 2. Frequência — contenção dos números + paleta unificada

Mudanças visuais apenas:

- **Agrupar os três KPIs (cadência / consistência / pico semanal)** num bloco horizontal com hairlines verticais subtis em vez de soltos no fluxo:
  - Container: `mt-6 rounded-xl border border-border-subtle/60 bg-surface-base/40 px-5 md:px-6 py-4 md:py-5`.
  - 3 colunas com `divide-x divide-border-subtle/60`, cada coluna mantém o número grande Fraunces + label Inter já existentes.
  - No mobile, mantém-se em flex-wrap mas dentro do container, sem divisores verticais visíveis (`sm:divide-x`).
- **Alinhamento de cor:**
  - Constante local `ACCENT = "#3772E5"` no `WeeklyRhythmChart` passa a `var(--accent-primary)` (com fallback) para igualar exactamente o azul do card Formato e o resto dos accents do report.
  - Tints (barras secundárias com posts e barra zero) também passam a `color-mix` sobre `--accent-primary`, eliminando o `rgba(55,114,229,0.18)` hardcoded.
  - O ✓ verde da conclusão "Cadência forte e consistente" mantém-se (sinal positivo é semântico, não decorativo).
- O bloco do gráfico semanal e a conclusão editorial permanecem inalterados em estrutura — apenas tokens de cor unificados.

## Garantias

- Zero alterações em: cálculos (`computeFrequencia`, `aggregateByWeekday`, rounding-to-100), props, i18n keys, ordem das secções, lógica de cadência insuficiente, PDF, mocks, testes.
- Apenas markup + classes Tailwind + estilos inline de cor.
- Mobile/desktop validados visualmente em 375 / 820 / 1440.

## Resultado esperado

- Formato: o gráfico tem peso visual claro — número editorial gigante + barra vertical totalmente preenchida, leitura imediata da dominância.
- Frequência: os números deixam de "flutuar"; ficam contidos num bloco discreto coerente com a linguagem dos cartões do report; toda a paleta do azul é a mesma do resto das secções.
