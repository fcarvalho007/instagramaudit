
## Card "Tipo de conteúdo" — Thumbnails + discurso impessoal + fonte serifada

### Alterações

**1. Adicionar `thumbnailUrl` aos `analysedPostFormats` (adapter)**

Em `src/lib/report/snapshot-to-report-data.ts`:
- Expandir o type `analysedPostFormats` para incluir `thumbnailUrl?: string`
- No `buildAnalysedPostFormats`, extrair `thumbnail_url` do post e passar via proxy `/api/public/ig-thumb`

**2. Redesenhar thumbnails no `FormatCard`**

Em `src/components/report-redesign/v2/overview/format-card.tsx`:
- Substituir os ícones coloridos por thumbnails reais em aspect-ratio 3:4
- Quando não há thumbnail, mostrar fallback com ícone (como está agora mas em 3:4)
- Tamanho pequeno: ~36×48px (3:4)
- `object-cover`, `rounded-[4px]`, com `loading="lazy"`

**3. Discurso impessoal**

No mesmo ficheiro:
- `"OS TEUS ${postsAnalyzed} POSTS"` → `"OS ${postsAnalyzed} POSTS ANALISADOS"`
- Verdict "mixed": `"vê nas próximas secções onde cada um está a render"` → `"as próximas secções mostram onde cada formato rende mais"`

**4. Título com fonte serifada**

- O headline já usa `font-display` (Fraunces). Confirmar que está aplicado — line 169 já tem `font-display`. PASS, sem alteração necessária.

### Ficheiros editados

- `src/lib/report/snapshot-to-report-data.ts` — type + builder
- `src/components/report-redesign/v2/overview/format-card.tsx` — thumbnails + copy
