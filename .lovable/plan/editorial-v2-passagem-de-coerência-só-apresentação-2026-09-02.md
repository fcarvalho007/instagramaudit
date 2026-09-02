# Editorial V2 — passagem de coerência (só apresentação)

Verificação feita antes de propor alterações. Resultado das três questões:

## Issue 1 — Explicação do índice do perfil: NÃO confirmada

`computeGlobalScore` usa exactamente `envolvimento * 0.6 + frequencia * 0.4`
(`src/components/report-redesign/v2/overview/score-utils.ts:110-116`), e o
terceiro sub-score de interacção está removido, com comentário explícito no
ficheiro.

A copy actual do Editorial V2 já é factual:
"Combina envolvimento face à referência do escalão (60%) e ritmo de publicação
(40%). Sem mediana de escalão publicada, não é mostrada posição relativa."
(`overview/profile-index.tsx:53-57`)

Não há qualquer menção a variedade de formatos ou interacção. **Nenhuma
alteração de copy é necessária.**

## Issue 2 — Numeração: confirmada como incoerente

Estado actual do Editorial V2:

- Visão geral: `01`
- Diagnóstico editorial: `07`
- Prioridades de acção: `08`

Alvo pedido: `00` visão geral, `06` diagnóstico, `07` prioridades — sem `08`.

Alteração: apenas `src/components/report-editorial-v2/section-metadata.ts`
(`displayNumber` de `EDITORIAL_V2_SECTIONS` e `EDITORIAL_V2_PRO_SECTIONS`).
A sequência intermédia (01 Engagement … 05 Conversas) fica documentada como
comentário/constante de referência, para as migrações seguintes usarem a mesma
escala; nenhuma secção nova é criada.

O teste `__tests__/pro-gate.test.ts` compara hoje os números com os de
produção (`COMMERCIAL_SECTIONS`). Passa a comparar apenas os **ids** com
produção e a fixar os números da sequência editorial própria, mantendo a
garantia de que não se inventam secções Pro. `COMMERCIAL_SECTIONS`, featureKeys,
ids funcionais, deep-links e analytics ficam intactos.

## Issue 3 — Estado Pro temporário: confirmada como ambígua

Com `premiumUnlocked === true`, `editorial-v2-shell.tsx:46-57` mostra um
parágrafo redigido como copy final de produto, que ainda remete o utilizador
para "a apresentação por defeito". Não está marcado como andaime de
desenvolvimento.

Alteração: substituir por um bloco explicitamente temporário, dentro do
Editorial V2 apenas (já só existe nesta camada, atrás de
`?report_design=editorial_v2`), com:

- comentário `TODO (Editorial V2): remover antes de tornar público` no código;
- atributo `data-ev2-dev-placeholder` para deteção em testes;
- rótulo visível "Ambiente de desenvolvimento — Editorial V2" com aspecto
  neutro de andaime, não de produto;
- texto curto a dizer que as secções Pro ainda não foram migradas.

Não é migrado qualquer conteúdo Pro.

## Ficheiros a alterar

- `src/components/report-editorial-v2/section-metadata.ts`
- `src/components/report-editorial-v2/editorial-v2-shell.tsx`
- `src/components/report-editorial-v2/__tests__/pro-gate.test.ts`

Nada mais. Sem alterações a selectors, loaders, snapshot, métricas, gating,
entitlements, checkout, preços, EuPago, créditos, packs, concorrentes, 30d/90d,
force refresh, cache, enriquecimentos, analytics ou PDF.

## Validação

- `bunx tsgo --noEmit`
- `bunx vitest run src/components/report-editorial-v2 src/lib/report src/components/report-redesign`
- Playwright: `/analyze/...` por defeito inalterado; `?report_design=editorial_v2`
  com sequência 00 → 07 e sem 08; gate continua a chamar o checkout Pro existente.
