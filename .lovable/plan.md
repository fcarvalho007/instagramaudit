## Problema

O cartão mostra **"2,3% abaixo do envolvimento típico do escalão"**, mas o número `2,3` é **pontos percentuais (pp)**, não percentagem relativa. A edição anterior trocou o rótulo `pp` → `%` sem trocar o cálculo, e isso é matematicamente inconsistente.

Exemplo deste perfil:
- Envolvimento do perfil ≈ **0,7%**
- Benchmark do escalão ≈ **3,0%**
- Diferença em **pp**: 0,7 − 3,0 = **−2,3 pp** ✓ (é o que vemos)
- Diferença em **%** (relativa): (−2,3 / 3,0) × 100 = **−76,7%**

Dizer "2,3% abaixo" sugere que o perfil está só 2,3% abaixo do benchmark (quase alinhado), quando na verdade está **~77% abaixo**. Isto contradiz tanto o índice (`31/100`, banda crítica) como o veredicto "Cadência forte, sinal fraco".

## Ficheiro

`src/components/report-redesign/v2/overview/editorial-identity-card.tsx`

## Alteração

**1. Calcular a diferença relativa (linhas 558–588)**

Manter `deltaPp` (necessário para o pin da mediana no `IndexRuler` via `medianIndexFromBenchmark`, que continua a usar `deltaPp * 4.5`), e acrescentar:

```ts
const deltaRelPct =
  hasBenchmark && (engagementBenchmarkPct as number) > 0
    ? (deltaPp! / (engagementBenchmarkPct as number)) * 100
    : null;
```

**2. Usar `deltaRelPct` no texto exibido**

Substituir `ppFormatted` (baseado em `deltaPp`) por um valor formatado a partir de `deltaRelPct`. Arredondar a 0 casas decimais quando ≥ 10%, 1 casa quando < 10%. Resultado para este perfil: **"77% abaixo do envolvimento típico do escalão"**.

**3. Recalibrar o limiar "alinhado"**

Hoje: `abs(deltaPp) < 0.5` (meio ponto percentual).
Passa a: `abs(deltaRelPct) < 10` — coincide com o `ALIGNED_THRESHOLD_PERCENT = 10` já usado em `src/lib/benchmark/engine.ts`, garantindo consistência entre motor e UI.

**4. Nada mais muda**

- `medianIndexFromBenchmark(clamped, deltaPp)` continua a usar `deltaPp` (pp absolutos) — o pin da régua mantém-se correto.
- Índice `31/100`, banda, veredicto, popover de método, evidências, tokens, layout: intactos.
- i18n keys (`delta_above_word`, `delta_below_word`, `delta_tail`, `delta_aligned_strong`): inalteradas.

## Verificação esperada

Para frederico.m.carvalho a 411×742, o cartão deve mostrar algo como:

```
ÍNDICE DO PERFIL ⓘ
31 /100
────●──┊──────────
 0              100
↘ 77% abaixo do envolvimento típico do escalão
```

Coerente com `31/100` (banda crítica) e com o veredicto "Cadência forte, sinal fraco".

## Validação

- `bunx tsc --noEmit`
- Preview em `/analyze/frederico.m.carvalho` (411×742): número da diferença coerente com o índice e o veredicto.
- Confirmar que o pin da mediana na régua não muda (continua a usar `deltaPp`).
