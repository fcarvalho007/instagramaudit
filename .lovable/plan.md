## Problema

A caixa "Índice do perfil" tem hoje **5 números** a competir entre si:

1. `31 / 100` — índice composto (herói)
2. Régua 0–100 com pin da mediana
3. `Envolvimento: 0,09%` — valor absoluto do perfil
4. `típico Micro ~2,4%` — benchmark do escalão
5. `96% abaixo da referência do escalão` — leitura relativa

O leitor leigo perde-se. Pior: o `0,09%` aparece **outra vez logo abaixo** no MetricsStrip ("Envolvimento médio"), o que cria duplicação e dúvida ("é a mesma coisa? porque está duas vezes?").

## Princípio

A caixa do índice deve responder a **uma só pergunta**: *"Como é que este perfil se posiciona vs o seu escalão?"*

Os números absolutos (0,09% de envolvimento, ~2,4% do benchmark) **pertencem ao MetricsStrip e ao bloco de Benchmark**, não aqui. Aqui basta a **leitura comparativa**.

## Alterações

Ficheiro: `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` (função `IndexBlock`, linhas ~767–805).

### 1. Colapsar o bloco do delta numa única linha clara

Antes (3 linhas, 3 números):
```
↘ Envolvimento: 0,09% · típico Micro ~2,4%
   96% abaixo da referência do escalão
```

Depois (1 linha, 1 número, com contexto):
```
↘ Envolvimento 96% abaixo do típico do escalão Micro
```

- Mantém o ícone direccional (↘ amarelo / ↗ verde / — neutro)
- `text-[17px]` em `text-content-secondary`, com `96%` em `font-semibold text-content-primary tabular-nums`
- Tipografia consistente com o resto do card
- Caso "alinhado" (`absRel < 10`): `→ Envolvimento alinhado com o típico do escalão Micro`
- Caso sem benchmark: mantém o microline genérico actual

### 2. Sublabel sob a régua: indicar que o pin é a mediana

Hoje a régua tem um pin discreto sem legenda na caixa. Adicionar uma micro-legenda `text-[12px] text-content-tertiary` por baixo da régua:

```
● este perfil   │ mediana do escalão
```

(usando os mesmos glifos visuais do pin). Ajuda o leitor a perceber porque é que aos 31/100 ainda está "abaixo" — a mediana fica mais à direita.

### 3. Remover o sublabel "índice composto · envolvimento + cadência + conversa"

Esta frase, debaixo do `31 / 100`, é informação técnica que o popover ⓘ já explica. Está a competir com o eyebrow ("Índice do perfil · MICRO (10K–50K)") e a engordar o card. Removê-la simplifica visualmente sem perder rigor — quem quiser detalhe abre o ⓘ.

### 4. Popover ⓘ — actualizar para responder à dúvida nova

Reordenar para que a primeira frase responda directamente a "o que é Envolvimento?":

> **Envolvimento** é a taxa de interacção média por publicação (likes + comentários ÷ alcance estimado). O valor absoluto aparece em "Indicadores principais", logo abaixo.
>
> **Índice (0–100)** combina envolvimento (45%), cadência e conversa para uma leitura comparativa face ao escalão.

## Resultado

A caixa passa de 5 para **2 números** (`31/100` + `96%`), cada um a comunicar uma ideia distinta:

- `31/100` → leitura composta global
- `96% abaixo` → leitura comparativa do envolvimento vs escalão

O valor absoluto de envolvimento (`0,09%`) deixa de aparecer aqui e vive **apenas** no MetricsStrip — onde o leitor já espera ver números crus.

## Fora de scope

- Não mexer no cálculo do índice, na régua, no MetricsStrip nem no bloco de Benchmark
- Não tocar i18n existentes além de ajustar `identity.index.rel_below/above/aligned` para a frase nova e remover `engagement_label`, `engagement_typical`, `composite_sublabel` (não usadas)

## Validação

- `bunx tsc --noEmit`
- Preview `/analyze/frederico.m.carvalho` em 411×742 — confirmar que o card "respira" mais, que a duplicação `0,09%` desapareceu, e que a régua agora tem legenda do pin
