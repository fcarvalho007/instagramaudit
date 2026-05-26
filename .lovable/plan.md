## Diagnóstico

A discrepância no perfil `@lg_portugal` (Card 1 = "0 por post"; Card P05 = "0,4 por post") tem causa identificada:

- Os **12 posts** persistidos têm um total de **5 comentários** → média real = **0,42/post**.
- O Card 1 (Visão geral · `EditorialIdentityCard`) lê `payload.content_summary.average_comments`.
- O Card P05 (Resposta do público · `classifyAudienceResponse`) recalcula a partir de `payload.posts`.

No snapshot atual (`b1fe467a-…`) o campo persistido `content_summary.average_comments` vale **0** (inteiro), não `0.42`. Foi gerado antes da correção de `toFixed(2)` em `src/lib/analysis/normalize.ts` (linhas 264-268, cujo comentário descreve este mesmo bug histórico). Como o snapshot é cache imutável, qualquer arranjo só em `normalize.ts` não corrige relatórios já guardados — e o problema vai voltar sempre que houver um snapshot antigo em cache.

A única forma de garantir paridade entre o Card 1 e o P05 (e qualquer card futuro) é ter **uma única fonte de verdade em runtime**: derivar as médias do array `payload.posts` (que já é usado pelo P05), em vez de confiar no campo agregado `content_summary` que pode estar dessincronizado.

## Plano

**1. Centralizar o cálculo de médias num utilitário partilhado**
- Criar `src/lib/report/post-aggregates.ts` com:
  - `computePostAverages(posts)` → `{ averageLikes, averageComments, postsAnalyzed }`
  - Usa `payload.posts` diretamente, ignorando `content_summary` quando há posts.
  - Mantém precisão (sem `Math.round`), devolve `null` quando `posts.length === 0`.

**2. Card 1 (Visão geral) passa a usar o utilitário**
- Em `src/components/report-redesign/v2/report-overview-block.tsx`:
  - Substituir o `useMemo` de `avgComments` (que faz média apenas dos top-5 de `enriched.topPosts`) por `computePostAverages(payload?.posts)`.
  - `averageLikes` e `averageComments` passados a `<EditorialIdentityCard>` vêm desse utilitário; só caem para `payload.content_summary.*` se `payload.posts` estiver vazio (snapshots antigos sem array de posts).
- Resultado visível: `0,4 por post` aparece no Card 1, idêntico ao P05.

**3. P05 alinha-se ao mesmo utilitário (paridade explícita)**
- Em `src/lib/report/block02-diagnostic.ts` → `classifyAudienceResponse`:
  - Manter a assinatura `(posts)` (continua a receber `payload.posts`).
  - Internamente continuar a usar o mesmo total/contagem; adicionar um teste curto que confirma que `avgComments` devolvido bate certo com `computePostAverages(posts).averageComments`.

**4. Testes**
- `src/lib/report/__tests__/post-aggregates.test.ts`:
  - Caso `lg_portugal` real (12 posts, 5 comentários) → `0.4` (não 0).
  - Caso sem posts → devolve `null`.
- `src/lib/report/__tests__/overview-vs-block02-parity.test.ts`:
  - Dado o mesmo `payload.posts`, o valor exibido pelo Card 1 (via utilitário) é igual ao `avgComments` devolvido por `classifyAudienceResponse`.

## Fora de âmbito

- Não regerar snapshots antigos nem alterar a estrutura persistida (`content_summary` mantém-se como está; passa apenas a ser fallback).
- Não tocar em copy, layout, tokens, ou no card P05 visualmente — só na fonte do número.
- Não tocar em `normalize.ts` (já está correto para snapshots futuros).

## Checkpoint

- ☐ `post-aggregates.ts` criado e testado
- ☐ Card 1 mostra `0,4 por post` para `@lg_portugal` (igual ao P05)
- ☐ Snapshots antigos sem `posts` continuam a renderizar (fallback para `content_summary`)
- ☐ Testes de paridade verdes