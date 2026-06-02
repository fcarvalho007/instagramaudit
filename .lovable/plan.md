## Problema

Após remover o `max-w-[420px]` do wrapper, o calendário ocupa toda a largura do card. Como as células são `aspect-square`, ficaram quadradas gigantes (~190px de altura), criando um bloco visualmente desproporcional para um calendário de 30 dias.

## Alteração mínima

Em `src/components/report-redesign/v2/overview/frequency-card.tsx`, trocar `aspect-square` por `aspect-[4/3]` nas duas células do calendário (padding e dia ativo, linhas 687 e 704).

- `aspect-[4/3]` mantém a célula nitidamente rectangular (mais larga que alta), reduzindo a altura para ~75% do quadrado actual.
- Mantém a grelha responsiva: cresce/encolhe proporcionalmente com a largura do card.
- Mantém legibilidade dos números "2 posts" (continua com espaço sobrado).
- Mantém raio `rounded-[5px]`, gaps, headers de weekday e legenda.

## Fora de scope

- Não mexer no `format-card.tsx`.
- Não mexer em copy, dados, scoring, tokens, hover/tooltip, gate ou outros cards.
- Não alterar o número de colunas (continua `grid-cols-7`).

## Validação

`bunx tsc --noEmit` + QA visual a 1440 e 390 (confirmar que as células ficam claramente rectangulares e o bloco do calendário deixa de dominar verticalmente).
