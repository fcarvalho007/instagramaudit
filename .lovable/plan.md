## Problema

Na caixa "Índice do perfil" há duas escalas a competir pela leitura, sem o leitor perceber que medem coisas diferentes:

- **31 / 100** — índice composto (envolvimento 45% + cadência + conversa)
- **96% abaixo** — só envolvimento, em termos relativos vs benchmark do escalão

Um leigo lê "96% abaixo" e pergunta-se porque é que então o índice não é ~4/100. Pior: a 96% soa catastrófico quando, em absoluto, pode ser apenas "0,1% vs 3,0%". E o **escalão** (Micro, Mid, etc.) só aparece escondido no popover ⓘ — o leitor não tem como ancorar a referência.

## Objectivo

Tornar a caixa auto-explicativa em 3 segundos, sem mudar a matemática nem a estrutura visual já aprovada:

1. Deixar claro **que** o 31/100 e o delta são leituras diferentes
2. Mostrar o **escalão** logo no topo, como contexto
3. Substituir o "96% abaixo" isolado por uma comparação **absoluta + relativa** que qualquer leigo entende

## Alterações

Ficheiro: `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` (função `IndexBlock`, linhas ~526–743).

### 1. Eyebrow com escalão visível (linhas ~640–689)

Antes:
```
ÍNDICE DO PERFIL  ⓘ
```

Depois:
```
ÍNDICE DO PERFIL · MICRO (10K–50K)  ⓘ
```

Implementação: concatenar `tier` (já calculado em `tierLabelFromFollowers(followers)`, linha 551) ao texto do eyebrow, separado por `·`. Manter o ⓘ no fim. Quando `tier` for `null`, manter só "ÍNDICE DO PERFIL".

### 2. Micro-label sob o "/ 100" para enquadrar a escala (linhas ~691–699)

Adicionar uma linha mínima por baixo do número herói, em `text-content-tertiary text-[12px]`:

```
31 / 100
índice composto · envolvimento + cadência + conversa
```

Isto antecipa a pergunta "31 em quê?" antes do leitor chegar ao delta.

### 3. Reformular o delta: absoluto primeiro, relativo como suporte (linhas ~571–599, ~717–740)

Hoje:
> ↘ **96% abaixo** do envolvimento típico do escalão

Proposta (duas linhas, hierarquia clara):

> ↘ **Envolvimento: 0,1%** · típico Micro ~3,0%
> 96% abaixo da referência do escalão

Vantagens:
- O número absoluto ancora o leitor (0,1% é tangível; 96% é abstracto)
- Fica explícito que o delta refere-se a **envolvimento**, não ao índice
- "típico Micro ~3,0%" mostra de onde vem o 96% — a matemática fica transparente

Implementação em `deltaInfo`:
- Linha 1 (forte): `Envolvimento: {engagementRatePct}%` + separador + `típico {tierShort} ~{engagementBenchmarkPct}%`
- Linha 2 (suporte, mais pequena, `text-[14px] text-content-tertiary`): `{absRel}% {abaixo|acima} da referência do escalão`
- Quando `absRel < 10`: linha 2 vira `Alinhado com a referência do escalão`
- Quando não há benchmark: mostrar só linha 1 sem comparação

Usar `formatPercent` / `formatDecimal` já existentes para arredondamento (1 casa < 10%, 0 casas ≥ 10%).

### 4. Popover ⓘ — clarificar a distinção das escalas

Adicionar uma frase curta no topo do popover:

> "Índice (0–100) resume 3 sinais. O delta abaixo refere-se só ao envolvimento."

Mantém o resto da explicação intacta.

## Fora de scope

- Não mexer no cálculo do índice nem na régua
- Não mexer no MetricsStrip nem nas colunas de bullets
- Não mexer i18n keys existentes além de acrescentar `identity.index.composite_sublabel` e ajustar defaults

## Validação

- `bunx tsc --noEmit`
- Preview `/analyze/frederico.m.carvalho` em 411×742 (mobile do user) — confirmar que o escalão aparece, a linha "Envolvimento: 0,1% · típico ~3,0%" lê bem em 2 linhas máximo, e que a contradição desaparece visualmente
- Verificar caso sem benchmark (esconde linha 2 corretamente)