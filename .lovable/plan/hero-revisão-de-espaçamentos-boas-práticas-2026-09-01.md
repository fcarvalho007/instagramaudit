# Hero — revisão de espaçamentos (boas práticas)

Ronda focada apenas em grelha e ritmo vertical da primeira dobra. Sem alterar copy, lógica ou cores.

## Problema principal: grelha desalinhada

O cabeçalho usa o contentor `xl` (máx. 1440px) e o hero usa `lg` (máx. 1280px). Resultado: no ecrã enviado, o logótipo começa a ~68px e o título a ~170px. As duas zonas parecem pertencer a páginas diferentes.

Correcção: alinhar o hero à mesma grelha do cabeçalho (contentor `xl`), para que título, subtítulo e barra de input arranquem exactamente na vertical do logótipo.

## Ritmo vertical

Actualmente há três escalas a competir (`space-y-7`, `pt-4`, `mb-3`, `mt-3`), o que produz saltos irregulares entre título → subtítulo → microlabel → barra → linha de confiança.

Proposta de escala única de 4 níveis:

```text
título        →  subtítulo        24px
subtítulo     →  microlabel       40px  (respiro antes da acção)
microlabel    →  barra            12px  (par indissociável)
barra         →  linha confiança  12px
```

## Densidade da secção

- Padding vertical: `py-16 / md:py-24 / lg:py-24` em vez de `md:py-28 lg:py-32` — com `min-h` de ecrã inteiro, o padding actual empurra a barra de input demasiado para baixo em portáteis de 900px de altura.
- Coluna direita em mobile: `mt-20` é excessivo; passa a `mt-12` (o cartão já tem glow próprio a criar separação).
- Gap entre colunas em desktop: `lg:gap-12` → `lg:gap-16`, para compensar o contentor mais largo e evitar que o cartão pareça colado ao texto.

## Ficheiros afectados

- `src/components/landing/hero-section.tsx` — contentor, padding, gaps, ritmo vertical da coluna esquerda.
- `src/components/landing/hero-action-bar.tsx` — margens do microlabel e da linha de confiança.

## Validação

Playwright a 320, 390, 768, 1280, 1440 e 1728px: sem overflow horizontal, barra de input visível sem scroll em 1280×800, e alinhamento esquerdo idêntico ao logótipo do cabeçalho.
