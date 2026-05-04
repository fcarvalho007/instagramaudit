
## Resumo

Substituir a secção "Melhores publicações" (5 posts horizontais) por um bloco comparativo "Melhores e piores publicações" com 2 top + 2 bottom, layout 2-col em desktop, e insight IA mais estruturado.

## Alterações

### 1. Adapter — expor bottom 2 posts (`snapshot-to-report-data.ts`)

- Adicionar `bottomPosts` ao `ReportEnriched` (mesma shape que `topPosts`)
- No builder, após ordenar posts por engagement desc, pegar `slice(-2).reverse()` para os 2 piores
- Se houver menos de 4 posts no total, `bottomPosts` fica vazio

### 2. Novo componente — `report-post-comparison.tsx` (em `v2/`)

**Header:**
- Eyebrow: "MELHORES E PIORES PUBLICAÇÕES"
- Título: "O que funcionou melhor — e pior"
- Subtítulo: "Comparação entre os conteúdos com maior e menor envolvimento na janela analisada."

**Layout desktop (md+):** grid 2-col
- Coluna esquerda: "Melhores 2" — accent teal/emerald subtil
- Coluna direita: "A melhorar" — accent rose/amber subtil

**Layout mobile:** stack vertical (best 2, then worst 2)

**Card design:**
- Thumbnail aspect-[4/5] com format chip
- Date eyebrow
- Caption 2 lines max
- Metric row: likes, comments, engagement % — ancorado em baixo
- Ranking chip opcional: "#1", "#2" vs "A melhorar"
- Hover: border ligeiramente mais forte + leve elevação
- Usa classes estilo Iconosquare (bg-white, border-slate-200, shadow suave)

**Insight IA:**
- Abaixo das duas colunas
- Reutiliza `renderInsight("topPosts")` existente

### 3. Overview block — substituir uso (`report-overview-block.tsx`)

- Remover `<ReportTopPosts />` e a eyebrow "MELHORES PUBLICAÇÕES"
- Importar e renderizar o novo `PostComparisonBlock` passando `result.enriched.topPosts` (top 2) e `result.enriched.bottomPosts` (bottom 2)
- Manter `renderInsight("topPosts")` abaixo

### 4. Mock data — adicionar bottomPosts (`report-mock-data.ts`)

- NÃO é locked — verificar LOCKED_FILES.md
- Adicionar 2 posts mock com engagement baixo para que `/report/example` continue funcional

## Ficheiros a editar

| Ficheiro | Tipo |
|---|---|
| `src/lib/report/snapshot-to-report-data.ts` | Adapter — adicionar bottomPosts |
| `src/components/report-redesign/v2/report-post-comparison.tsx` | Novo componente |
| `src/components/report-redesign/v2/report-overview-block.tsx` | Substituir ReportTopPosts |

## Ficheiros NÃO tocados

- `report-top-posts.tsx` (locked, continua a existir para `/report/example`)
- `report-mock-data.ts` (bottomPosts derivado do topPosts existente no contexto)
- Nenhum ficheiro locked

## Lógica de bottom 2

```
const sorted = [...posts].sort((a, b) => engB - engA);
const bottom2 = sorted.length >= 4
  ? sorted.slice(-2).reverse()  // 2 piores, do menos pior ao pior
  : [];
```

Tiebreaker: likes > comments > data mais recente (mesma ordem do sort existente).
