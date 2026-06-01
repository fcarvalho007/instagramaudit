## Diagnóstico

Investiguei o card e encontrei **3 bugs reais** que explicam a divergência face ao mockup:

1. **Só aparecem 5 pontos no scatter, não 38.**
   Em `src/lib/report/snapshot-to-report-data.ts:1361-1363`, `enrichedTopPosts` faz `.slice(0, 5)`. O scatter recebe `topPosts` e itera só esses 5. Para o utilizador percecionar a "constelação" das 38 publicações, precisa de receber todas.

2. **Eixo X temporal aparece vazio ("não tem o espaço temporal em baixo").**
   `post.date` é uma string pt-PT tipo `"19 mai"` (formatada em `formatPtDateShort`). No `ConstellationScatter` faço `Date.parse(p.date)` → devolve `NaN` → `sortedByTs` fica vazio → `firstDate/midDate/lastDate` são strings vazias → o SVG renderiza os `<text>` em branco. Daí parecer que "não tem espaço temporal".

3. **Thumbnails reais não carregam nos cards detalhados.**
   `thumbnailUrl` já existe (passa pelo proxy `/api/public/ig-thumb`), mas no card render o `onError` desativa a imagem permanentemente sem retry e o fallback gradient com ícone ocupa o lugar. Convém: (a) garantir que o `<img>` está sempre presente quando `thumbnailUrl` existe, (b) sobrepor o gradient só como base por baixo, (c) só esconder o `<img>` se realmente falhar — mantendo o ícone como fallback final.

## Mudanças

### A — Dados (`src/lib/report/snapshot-to-report-data.ts`)

1. Adicionar campo `takenAtIso?: string` ao tipo `topPosts[number]` em `ReportEnriched` (e ao `bottomPosts`).
2. Criar `enrichedAllPosts` (TODAS as publicações da janela, ordenadas por engagement desc, COM `takenAtIso` real) e exportar como `enriched.allPostsScatter` — novo campo, sem mexer no contrato existente de `enriched.topPosts` (que mantém o `.slice(0, 5)` que outros componentes podem usar).
3. Expor `enriched.windowRange = { startIso, endIso }` com base no `windowDays` e na data mais recente da janela. Calcular como `endIso = max(taken_at_iso)`, `startIso = endIso - (windowDays-1) dias`. Fallback: hoje − 29 dias.

### B — Componente (`src/components/report-redesign/v2/report-post-comparison.tsx`)

1. Aceitar novas props: `allPostsForScatter: EnrichedPost[]` e `windowRange?: { startIso: string; endIso: string }`.
2. `ConstellationScatter`:
   - Usar `allPostsForScatter` para os pontos.
   - Domínio X = `windowRange.startIso → windowRange.endIso` (janela completa, mesmo que os primeiros dias não tenham publicações — assim o utilizador vê a densidade real).
   - Calcular `x` a partir de `Date.parse(post.takenAtIso)`; sem fallback baseado em índice.
   - Tick labels: 3 marcas — `startIso`, midpoint, `endIso` — formatadas com `formatPtDateShort` client-side (pequeno helper local: `DD mmm` pt-PT).
   - Identificação visual do "melhor" e "pior" mantém-se (aura + pílula).
   - Manter `<title>` "premium" nos pontos não-extremos e a `<ul className="sr-only">` para a11y.
3. `DetailedPostCard`:
   - Reescrever a área da thumb: `<div>` com gradient SEMPRE como base + `<img>` por cima com `object-cover` quando `thumbnailUrl` existe. `onError` esconde o `<img>` (já cobre o caso de URL expirada/Instagram CDN).
   - Manter o chip de formato sobreposto.
   - Manter o `<FormatIcon>` por baixo do gradient como fallback visível quando `<img>` falha.

### C — Caller (`src/components/report-redesign/v2/report-overview-block.tsx`)

Passar as novas props ao `<PostComparisonBlock>`:
```
<PostComparisonBlock
  topPosts={result.enriched.topPosts}
  bottomPosts={result.enriched.bottomPosts}
  allPostsForScatter={result.enriched.allPostsScatter}
  windowRange={result.enriched.windowRange}
  ...
/>
```

### D — i18n

Sem chaves novas. (As labels do eixo são datas formatadas, não traduzíveis.)

## Fora do âmbito (não tocar)

- `/report.example` (mockup intacto).
- Hero comparativo (mantém-se sem thumbnail — alinhado com o mockup; o utilizador escreveu "onde diz melhor e pior publicação deve aparecer os thumbnails" referindo-se aos **cards detalhados** em baixo, que é onde o slot da imagem existe).
- `report-hero-v2.tsx`, frequency-card, format-card.
- Backend: o proxy `/api/public/ig-thumb` mantém-se como está. Se as thumbs continuarem a falhar depois desta correção, faço um passo separado de diagnóstico ao proxy + cache.

## Validação

- `bunx tsc --noEmit` (tipos novos em `ReportEnriched`).
- Preview em `/analyze/frederico.m.carvalho`, viewport 1460×905:
  - Scatter mostra ~38 pontos espalhados.
  - Eixo X com 3 datas legíveis (ex.: `02 mai · 16 mai · 30 mai`).
  - Cards "Melhor"/"Pior" mostram thumbnail real do Instagram quando disponível; quando o CDN expira, gradient + ícone do formato.

## Checkpoint

- ☐ Adicionar `takenAtIso` e `allPostsScatter`/`windowRange` em `snapshot-to-report-data.ts`
- ☐ Refactor `ConstellationScatter` para usar janela e datas reais
- ☐ Refactor `DetailedPostCard` para layout de imagem com fallback em camadas
- ☐ Atualizar caller em `report-overview-block.tsx`
- ☐ `bunx tsc --noEmit` verde
- ☐ Verificar preview a 1460×905
