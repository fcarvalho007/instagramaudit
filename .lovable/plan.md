## Objetivo

Introduzir o novo módulo "RESUMO DA SEMANA" no `FrequencyCard`, conforme o mockup, sem mexer no calendário existente nem no veredito.

## Anatomia do novo bloco (entre subtítulo e "QUANDO PUBLICOU")

Painel arredondado (`rounded-xl`, `border-default`, `surface-muted`) com:

1. Eyebrow `RESUMO DA SEMANA` (Inter uppercase, `text-eyebrow-sm`, `content-tertiary`).
2. Linha com duas colunas:
   - **MAIS ATIVO** — chip verde com seta para cima + dia da semana (a bold) + `N posts` (ex: "Quinta · 4 posts").
   - **MAIS PARADO** — chip rosa-claro com seta para baixo + rótulo (ex: "Fim-de-semana") + `N dias s/ post`.
3. Mini-strip de 7 barras por dia da semana (S T Q Q S S D), altura proporcional ao nº total de posts nesse weekday no período. Dia mais ativo destacado a verde sólido; restantes a verde translúcido; weekend sem posts a rosa-claro. Letras por baixo, com o dia ativo a bold.

## Lógica de dados (derivada de `calendarDays`, sem novas props)

- Agregar `postCount` por `getUTCDay()` → array de 7 entradas (ordem Seg→Dom).
- `mostActive`: weekday com maior soma; se empate, o mais recente.
- `quietest`:
  - Se Sáb+Dom somam 0 e weekdays > 0 → rótulo "Fim-de-semana", contagem = nº de dias de weekend sem posts no período.
  - Caso contrário, weekday com menor soma > 0 fallback para o que tem mais dias sem publicar.
- Labels pt-PT: Segunda, Terça, Quarta, Quinta, Sexta, Sábado, Domingo.

Se `calendarDays.length === 0` ou todos `postCount === 0`, não renderizar o resumo (mantém comportamento atual).

## Implementação

Ficheiros tocados:
- `src/components/report-redesign/v2/overview/frequency-card.tsx` — adicionar helpers `aggregateByWeekday`, `pickMostActive`, `pickQuietest`, e subcomponente `WeeklySummary` renderizado antes do calendário.

Tokens / estilo:
- Verde: reutilizar `rgba(29,158,117,*)` já presente no ficheiro.
- Vermelho/rosa fraco para "parado": `rgba(163,45,45,0.10)` fundo + `rgba(163,45,45,0.70)` ícone, alinhado com `signal-danger` do report-light.
- Tipografia: Inter, números `tabular-nums`, sem `font-mono`.
- Ícones: `ArrowUp` / `ArrowDown` do `lucide-react` em círculo `size-7`.

Sem mudanças de props públicas, sem alterações a `score-utils`, `InsightCallout` ou ao calendário.

## Checkpoint

- ☐ Resumo da semana aparece entre subtítulo e calendário, idêntico ao mockup.
- ☐ "Mais ativo" e "Mais parado" calculados a partir de `calendarDays`.
- ☐ Mini-strip de 7 barras com dia mais ativo destacado.
- ☐ Responsivo a 375px (chips empilham se necessário, sem overflow).
- ☐ Sem novas dependências, sem novas props, sem tocar no `report-shell-v2`.