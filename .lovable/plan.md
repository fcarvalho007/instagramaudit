# Fechar MVP: 2 cards finais no Profile vs Competitor

Adicionar dois cards ao final do bloco de comparação no relatório Pro, reutilizando `CompareCardShell` e apenas dados já presentes em `ReportData` / `ReportEnriched` / `competitorBreakdown[0]`. Sem providers, sem schema, sem AI.

## Onde montar

`src/components/report-redesign/v2/report-overview-block.tsx`, logo a seguir ao `CompetitorWeekdayCompare` / `CompetitorFormatCompare` (último bloco de compare), dentro do mesmo guard `firstCompetitor !== null`.

## Card 1 — Publicações-chave lado a lado

Novo ficheiro: `src/components/report-redesign/v2/compare/competitor-top-post-compare.tsx`.

Fontes de dados (já existentes):
- Primário: `result.enriched.topPosts[0]` (já ordenado por `engagement_pct`, traz `thumbnailUrl?`, `caption`, `format`, `likes`, `comments`, `engagementPct`, `date`, `permalink`).
- Concorrente: `competitorBreakdown[0].posts` (raw `SnapshotPost[]`). Selecionar o de maior `engagement_pct`; mapear com o mesmo shape do primário usando helpers locais do componente (sem tocar em `snapshot-to-report-data.ts`).

Ranking: maior `engagement_pct`. Empate → mais recente (`taken_at_iso`). Posts com `is_pinned=true` excluídos para alinhar com `eligiblePosts`.

Render:
- `CompareCardShell` title "Publicação em destaque", subtitle "Melhor publicação recente lado a lado", `windowAligned={firstCompetitor.windowAligned}`, identidades primária/concorrente via props já usados nos outros compare cards.
- Body: grelha 2 colunas (`grid-cols-1 md:grid-cols-2`, gap 4), cada coluna com:
  - Thumb 16:9 (`aspect-video rounded-xl overflow-hidden`). Se `thumbnailUrl` existir → `<img loading="lazy" />` com fallback `onError` para placeholder. Caso contrário, placeholder gradiente igual ao usado em `top-posts-card` (não inventar nova arte). Nunca render de URL externa do IG (`cdninstagram`) — usar apenas bucket persistido.
  - Linha meta: badge formato + data curta (pt-PT).
  - Caption excerpt: `caption.slice(0, 140)` + `…` se cortar; `line-clamp-3`.
  - Stats row: `likes` · `comments` · `ER X.X%` (Inter tabular-nums).
  - Se houver `permalink`, wrap clicável (`target="_blank" rel="noreferrer"`).
- Empty state concorrente (sem `posts` ou nenhum elegível): coluna direita renderiza painel `bg-surface-muted border-dashed` com copy: **"Dados de publicações do concorrente indisponíveis nesta amostra."** Coluna esquerda continua a mostrar o post primário.
- Se o primário também não tiver post elegível, o card inteiro não monta (guard no overview-block).
- Footer (`CompareCardShell.footer`): leitura curta determinística — comparar `engagementPct` dos dois posts e formato dominante (ex.: `"O teu melhor post (Reel, 5.2%) supera o melhor do concorrente (Carrossel, 3.1%) em +2.1 pp."`). Se faltar lado, footer escondido.

Sem broken images: handler `onError` esconde `<img>` e mostra o placeholder.

## Card 2 — Diagnóstico editorial comparativo

Novo ficheiro: `src/components/report-redesign/v2/compare/competitor-editorial-diagnostic.tsx`.

Lógica 100% determinística a partir de:
- `result.data.cadence` (posts/semana primário) vs `firstCompetitor.estimatedPostsPerWeek`.
- `result.data.engagement.averageEngagementRate` vs `firstCompetitor.averageEngagementRate`.
- `result.data.formatBreakdown` (mix primário) vs `firstCompetitor.formatStats` (mix concorrente). Comparar o `dominantFormat` e diversidade (nº de formatos com `share_pct ≥ 10`).
- `result.data.bio` / `externalUrls` primário vs `firstCompetitor.bio` / `firstCompetitor.externalUrls`.
- Hashtags/caption: `result.enriched.hashtagDiagnostics?.totalUnique` e média de caracteres de caption (se já existir agregado no enriched; caso contrário derivar inline a partir de `enrichedTopPosts.caption.length`). Apenas usar se já agregado — não recalcular sobre o universo todo.

Construção das 3 linhas:
- Avaliar cada dimensão (cadência, engagement, mix, bio/outbound, captions/hashtags) e atribuir vantagem a primário, concorrente ou empate, com magnitude mínima para evitar ruído (ex.: ER delta ≥ 0.5 pp; cadência delta ≥ 0.5 posts/sem).
- **"O que este perfil faz melhor"**: melhor dimensão (maior delta a favor do primário). Frase curta executiva.
- **"O que o concorrente faz melhor"**: melhor dimensão a favor do concorrente.
- **"Oportunidade prioritária"**: maior fraqueza relativa do primário traduzida em ação (ex.: `"Aumentar para 4 publicações/semana e diversificar com Reels."`).
- Se uma dimensão não tem dados em ambos os lados, é ignorada (não conta como zero). Se faltarem dimensões para preencher uma linha, mostrar nessa linha o copy `"Sem sinal suficiente nesta amostra."` em vez de inventar.

Render com `CompareCardShell` (title "Diagnóstico editorial comparativo", sem subtitle, `windowAligned` do competitor):
- Body: tabela leve de 3 linhas usando `CompareTable` (`compare/compare-table.tsx`) com coluna "Dimensão" + "Leitura" (linha única editorial), OU 3 blocos verticais com eyebrow + frase. Preferir 3 blocos verticais (mais legível em 375 px). Cada bloco: eyebrow (`.text-eyebrow-sm`) + frase Inter 14/15 px.
- Sem footer (a própria 3ª linha já é a oportunidade).

Copy pt-PT, curto, executivo. Sem números inventados — só os que vêm dos campos acima.

## Guards e mobile

- Não renderizar nenhum dos cards quando `firstCompetitor === null` (já implícito no bloco existente).
- Card 1 não renderiza se não houver post primário elegível.
- Card 2 não renderiza se 0 dimensões tiverem sinal de ambos os lados.
- 375 px: stack vertical (`grid-cols-1` + `md:grid-cols-2`), thumbs `w-full`, captions com `line-clamp-3`, sem horizontal overflow.

## Validação

1. `bun run typecheck` (ou o que o harness corre) passa.
2. `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` mostra ambos os cards.
3. `/admin/report-preview/frederico.m.carvalho?variant=pro_preview&draft=false` (sem concorrente) inalterado — cards ausentes.
4. DevTools 375 px sem overflow horizontal nos dois cards.
5. Forçar mentalmente cenário concorrente sem `posts` → coluna direita do Card 1 mostra empty state premium; Card 2 ignora dimensões sem dados.

## Ficheiros tocados

- **Novo**: `src/components/report-redesign/v2/compare/competitor-top-post-compare.tsx`
- **Novo**: `src/components/report-redesign/v2/compare/competitor-editorial-diagnostic.tsx`
- **Editar**: `src/components/report-redesign/v2/report-overview-block.tsx` (2 imports + 2 mounts dentro do guard `firstCompetitor`).
- **Editar (opcional)**: `src/components/report-redesign/v2/compare/index.ts` para reexportar.

Nada mais. Sem migrations, sem edge functions, sem mudanças ao adapter `snapshot-to-report-data.ts`, sem alterações ao Free.
