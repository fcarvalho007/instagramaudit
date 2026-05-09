O bug "Cannot read properties of undefined (reading 'id')" em `/analyze/frederico.m.carvalho` já foi corrigido na ronda anterior:

- Causa: `ReportBlockTopTabs` (nav mobile) e o cálculo de `visibleIndices` partiam do princípio que existem sempre 3 blocos visíveis. Em `public_mvp`, só há 2 (Visão geral + Diagnóstico), pelo que `filtered[2]` era `undefined` e a renderização rebentava ao ler `block.id`.
- Correção aplicada em `src/components/report-redesign/v2/report-block-nav.tsx`: o array de índices visíveis agora limita-se a `min(3, filtered.length)` e não acede a posições inválidas.

Verificação no preview:
- `/analyze/frederico.m.carvalho` carrega normalmente.
- O relatório público mostra apenas Bloco 01 (Visão geral) e Bloco 02 (Diagnóstico), tal como definido para `public_mvp`.
- Sem erros na consola.

Se o erro voltar a aparecer numa rota específica (ex.: variante diferente, ou outra página), basta indicares o URL e o ecrã onde ocorreu para investigar pontualmente. Sem alterações adicionais a fazer agora.