## Problema

A linha `↘ Envolvimento 96% abaixo do típico do escalão Micro` ainda mete um segundo número (96%) a competir com o `31/100`. O leitor leigo continua a ter de fazer matemática mental ("31 é mau? 96% abaixo é a mesma coisa?").

## Princípio

A caixa do índice deve ter **um só número** — `31/100` — com uma frase curta que diga o que esse número significa em linguagem humana. Nada mais.

## Alterações

Ficheiro: `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` (função `IndexBlock`).

### 1. Remover a linha do delta

Eliminar o bloco que renderiza `dir + relFormatted + tierShort` (a linha `text-[17px]` com "Envolvimento X% abaixo/acima/alinhado..."). Remover também o helper `deltaInfo` e os i18n keys associados (`identity.index.delta_above_prefix/suffix`, `delta_below_prefix/suffix`, `delta_aligned`) se deixarem de ter usos.

### 2. Substituir por uma frase única, contextual ao valor do índice

Por baixo do `31/100`, mostrar uma linha `text-[14px] text-content-secondary` com leitura qualitativa do próprio índice (não do envolvimento). Mapeamento por faixa:

- `index < 25` → "Espaço claro para crescer face ao escalão {tier}."
- `25 ≤ index < 45` → "Abaixo da mediana do escalão {tier}."
- `45 ≤ index < 65` → "Em linha com a mediana do escalão {tier}."
- `65 ≤ index < 85` → "Acima da mediana do escalão {tier}."
- `index ≥ 85` → "Destaque claro dentro do escalão {tier}."

Sem números, sem percentagens, sem "Envolvimento". Apenas posicionamento qualitativo face ao escalão — o que o `31/100` já está a dizer, traduzido em palavras.

Sem benchmark/tier disponível: omitir a linha (não inventar fallback genérico).

### 3. Manter

- Eyebrow `Índice do perfil · MICRO (10K–50K)` — continua a esclarecer escalão.
- Régua 0–100 com pin do perfil + pin da mediana + legenda `● este perfil │ mediana do escalão`.
- Popover ⓘ — continua a explicar Envolvimento e a composição do Índice para quem quiser detalhe.

## Resultado

A caixa fica com **um único número** (`31/100`) e **uma frase qualitativa** ("Abaixo da mediana do escalão Micro"). O valor absoluto de envolvimento (`0,09%`) e qualquer percentagem comparativa vivem apenas no MetricsStrip e no bloco de Benchmark mais abaixo, onde já têm contexto próprio.

## Fora de scope

- Cálculo do índice, régua, MetricsStrip, Benchmark.
- Popover (mantém-se como está após a iteração anterior).

## Validação

- `bunx tsc --noEmit`
- Preview `/analyze/frederico.m.carvalho` em 411×742 — confirmar que só sobra `31/100` + 1 linha curta sob a régua.
