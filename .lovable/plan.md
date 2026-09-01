# Card Review 06 — Índice do perfil (EditorialIdentityCard)

Ronda exclusivamente de apresentação sobre `editorial-identity-card.tsx`. Zero alterações a cálculos, veredicto, copy analítica, bullets ou dados.

## O que muda (leitura executiva em 5 segundos)

Sequência mantida, densidade e hierarquia refinadas:

```text
ÍNDICE DO PERFIL · MICRO (10K–50K)      ⓘ
36 /100        [régua 0–100 com pino e mediana]
Abaixo da mediana do escalão Micro.
──────────────────────────────────────────
Cadência forte, sinal fraco
[parágrafo, largura de leitura limitada]
EVIDÊNCIA
[likes]        [comentários]      [ritmo]
O QUE JÁ FUNCIONA     |  O QUE LIMITA
```

### 1. Zona macro mais compacta
- Número herói desce de 4,5rem/5,5rem para ~3,75rem/4,5rem — continua protagonista, mas liberta altura. `/100` passa a alinhado à base com contraste ligeiramente maior.
- Score e régua deixam de estar separados por um gap grande: passam a um bloco único (score à esquerda, régua a ocupar a largura restante em desktop; empilhados em mobile).
- Eyebrow com o escalão fica claramente secundário (tamanho e cor já corretos, apenas espaçamento).
- Gap geral da zona macro de `gap-7` para `gap-5`, e padding vertical de `py-7/py-8` para `py-6/py-7`.

### 2. Veredicto como segundo protagonista
- Mantém o texto exato devolvido pelo sistema.
- Título do veredicto ganha ligeira subida de escala e um eyebrow discreto "VEREDICTO", alinhando com a linguagem editorial das rondas 04/05 — sem tocar em `ReportCardSectionHeader` (é markup local do card).
- Separador superior mais leve e menos padding entre régua e veredicto.

### 3. Parágrafo
- Largura de leitura limitada (`max-w-[62ch]`), corpo de 17px para 16px com leading confortável, mais espaço entre título do veredicto e explicação, menos espaço entre parágrafo e blocos seguintes.
- Lista "Sinais usados nesta leitura" alinha ao mesmo tamanho secundário.

### 4. Evidência (métricas de suporte)
- A strip ganha um eyebrow "EVIDÊNCIA" para deixar claro que prova o diagnóstico e não abre um segundo dashboard.
- Números de 2rem/2,25rem para ~1,5rem/1,625rem; padding das células reduzido; ícone circular substituído por ícone simples inline; a caixa perde a borda dupla passando a fundo neutro subtil dentro do card.
- Valores, unidades, subtítulos e chips de estado inalterados.

### 5. O que funciona / o que limita
- Fundos tonais fortes (`bg-signal-success/6`, `bg-signal-warning/7`) substituídos por fundo neutro com apenas uma barra lateral tonal fina — tratamento subtil pedido.
- Bullets de 17px para 16px, espaçamento e alinhamento ajustados; empilhamento em mobile mantido (já é `grid-cols-1 md:grid-cols-2`).

### 6. Régua
- Espessura de 1,5px para 2px, contraste do preenchimento reforçado, marcador da mediana mais legível, e o rótulo flutuante "esta marca" com margem que evita colisão com os endpoints 0/100 nos extremos.
- Legenda pino/mediana passa para a mesma linha dos endpoints, poupando uma linha de altura.

### 7. Low confidence / warnings
- Mantém-se como nota metodológica em texto terciário, sem caixa de aviso. Apenas ajuste de espaçamento.

## O que fica congelado
`computeOverall`, `computeGlobalScore`, pesos, bandas, `verdictLabelToBand`, `deriveEditorialVerdict`, fallback, guards, `deriveSignals`, thresholds, `lowConfidence`, cadência, benchmark, `medianIndexFromBenchmark`, tiers/ranges, formatadores e todas as chaves i18n analíticas.

## A/B/C
Sem tier badges, blur ou variações de composição. O card permanece idêntico nos três estados.

## Testes
- Suites existentes verdes.
- Novo `card-review-06.test.ts` com guardas: `computeOverall` delega em `computeGlobalScore` (mesmos pesos), clamp 0–100 preservado, `verdictLabelToBand` mapeia como hoje, e o card é o mesmo componente em A/B/C.
- Sem snapshots CSS.

## Entrega
Capturas 1280/1440 e 390 antes/depois via preview do report lab quando acessível; caso o login bloqueie (como na ronda 04/05), a validação é feita por estrutura e testes, com nota explícita.

## CARD REVIEW LATER
- `medianIndexFromBenchmark` usa peso 45% no comentário mas o índice usa 60/40 — possível desalinhamento na posição da mediana. Não corrigir agora.
- Estilo do card Engagement diverge da nova linguagem editorial → Card Review 07.
