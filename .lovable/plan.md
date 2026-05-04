
## Refinamento visual — Bloco 1: Post Comparison

### Problema
1. **Thumbnails vazios** — O tipo `ReportEnriched` não inclui `thumbnailUrl`, logo os cards mostram apenas um fundo cinza. O proxy `/api/public/ig-thumb` já existe e os dados brutos (`SnapshotPost.thumbnail_url`) também. Falta apenas passar o campo pela camada de enriquecimento.
2. **Thumbnails pequenos** — 88–96px é demasiado compacto para um bloco editorial de destaque.
3. **Cards podem ser mais elegantes** — espaçamento, hierarquia e acabamento.

### Ficheiros a editar

| Ficheiro | Razão |
|----------|-------|
| `src/lib/report/snapshot-to-report-data.ts` | Adicionar `thumbnailUrl?: string` ao tipo `ReportEnriched` e passar o valor no mapeamento de `enrichedTopPosts` e `enrichedBottomPosts` |
| `src/components/report-redesign/v2/report-post-comparison.tsx` | Usar `thumbnailUrl` no card com `<img>` + fallback; aumentar thumbnail; polir layout |

### Alterações concretas

**1. `snapshot-to-report-data.ts`** (tipo + 2 mappers)
- Adicionar `thumbnailUrl?: string;` ao array `topPosts` e `bottomPosts` dentro de `ReportEnriched`.
- Nos dois `.map()` de enriquecimento (linhas ~1173 e ~1260), derivar `thumbnailUrl` com a mesma lógica do `buildTopPosts` — proxy via `/api/public/ig-thumb?url=`.

**2. `report-post-comparison.tsx`** (visual)
- **Thumbnail maior**: `w-[88px] md:w-[96px]` → `w-[110px] md:w-[120px]` com `aspect-square` (1:1, mais Instagram).
- **Imagem real**: Renderizar `<img src={post.thumbnailUrl} />` com `object-cover`, `onError` fallback para gradiente muted, lazy loading.
- **Polimento do card**: `rounded-2xl` → `rounded-xl`, padding `p-4` → `p-4 md:p-5`, gap `gap-4` → `gap-4 md:gap-5`.
- **Rank chip refinado**: ligeiramente maior com `text-[11px]` e `py-0.5 px-2.5`.
- **Métrica de engagement mais destacada**: `text-[13px]` e `font-bold`.
- **Caption 3 linhas**: `line-clamp-2` → `line-clamp-3` para dar mais contexto.
- **Hover mais suave**: `hover:border-accent-primary/30` no card best, `hover:border-signal-warning/30` no worst.
- Manter todos os tokens semânticos já migrados. Nenhuma cor hardcoded.

### Não será alterado
- Tokens globais (`tokens.css`, `tokens-light.css`, `styles.css`)
- Ficheiros locked
- Backend / admin / Block 2 / outros blocos
- Lógica de classificação de posts
- Proxy `/api/public/ig-thumb`

### Validação
- `bunx tsc --noEmit`
- `bunx vitest run`
- Inspeção visual no browser (desktop + 375px)
