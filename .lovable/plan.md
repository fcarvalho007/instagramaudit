## Objetivo

Reorganizar o topo do `EditorialIdentityCard` para uma leitura sequencial mais clara: **título → número → régua → delta**, e substituir "pp" por "%" no delta.

Ficheiro: `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`

## Estrutura nova (mobile-first, full-width)

Atualmente o topo do bloco está em duas linhas:
1. eyebrow + ⓘ · parágrafo de delta lado a lado
2. número 31 + régua lado a lado

Passa a ser uma stack vertical única, alinhada à esquerda:

```text
ÍNDICE DO PERFIL ⓘ          ← eyebrow + info (linha calma, sozinha)

31 /100                      ← número herói (mantém tamanho atual)

────●──┊──────────           ← régua 0–100 (full-width, marcador esta marca + mediana)
 0                  100

↘ 2,3% abaixo do envolvimento  ← delta DEPOIS da régua, contextualiza o pin
   típico do escalão
```

Justificação UX: o utilizador lê primeiro **o que é** (eyebrow), depois **o valor**, depois **onde está** (régua) e só no fim **a interpretação** (delta). Hoje o delta aparece antes da régua, o que obriga a olhar para cima e para baixo.

## Alterações concretas

**1. Reordenação JSX (linhas 626–732)**

Substituir os dois blocos atuais (linha 1 = eyebrow+delta, linha 2 = número+régua) por quatro blocos empilhados num `<div className="flex flex-col gap-4">`:

- **a)** Eyebrow + Popover ⓘ (extraído do bloco atual, sem o parágrafo de delta ao lado). Permanece em `gap-1.5`.
- **b)** Número herói `31 / 100` (igual ao atual, mas já não dentro do row sm:flex-row — fica em linha própria com `mt-1`).
- **c)** `IndexRuler` ocupa largura total (`w-full`), removendo o `sm:flex-row sm:items-center sm:gap-8`.
- **d)** Linha de delta (igual ao atual `deltaInfo` paragraph, com `DeltaIcon`), agora `mt-1` por baixo da régua. Mantém `text-[17px] leading-[1.6]`, ícone alinhado ao baseline da primeira linha.

A fallback microline (quando não há `deltaInfo`) também desce para a posição (d).

**2. Trocar "pp" por "%" no delta (linhas 582–583)**

```ts
strong:
  deltaPp >= 0
    ? `${ppFormatted}% ${t("identity.index.delta_above_word", { defaultValue: "acima" })}`
    : `${ppFormatted}% ${t("identity.index.delta_below_word", { defaultValue: "abaixo" })}`,
```

Razão: o utilizador pediu percentagem; mantemos a precisão decimal já formatada (`2,3%`). Não tocamos no cálculo, só na unidade exibida.

**3. Nada mais muda**

- Cálculo do índice, `medianIndexFromBenchmark`, `IndexRuler`, popover de método, tokens, cores: tudo intacto.
- O resto do cartão (`Cadência forte, sinal fraco`, veredicto, evidence bullets, MetricsStrip) fica igual.
- Sem alterações de i18n keys (`delta_above_word` / `delta_below_word` mantêm-se; só o glue muda de " pp " para "% ").

## Validação

- `bunx tsc --noEmit`
- Preview em `/analyze/frederico.m.carvalho` a 411×742: confirmar ordem eyebrow → 31 → régua → delta, e leitura "2,3% abaixo do envolvimento típico do escalão".
- Desktop ≥1280px: confirmar que o stack continua a respirar (sem necessidade de voltar a coluna lateral).
