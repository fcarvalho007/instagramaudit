## Objetivo
Adicionar, no card **Formato** (`src/components/report-redesign/v2/overview/format-card.tsx`), um módulo visual de rastreio dos formatos publicados na feed, logo abaixo do título e do subtítulo, antes da grelha de miniaturas.

## Referência visual (mockup do utilizador)
- Donut chart à esquerda com o total de publicações no centro (ex: `12` + eyebrow `PUBLICAÇÕES`).
- Legenda à direita, uma linha por formato:
  - Bolinha colorida + nome do formato (`Carrossel`, `Reels`, `Imagem`).
  - Contagem (Inter SemiBold, tabular-nums) + percentagem em accent azul.
  - Formatos com `count = 0` aparecem em cinzento (estado vazio).

## Implementação

**Ficheiro:** `src/components/report-redesign/v2/overview/format-card.tsx`

1. Criar sub-componente local `FormatBreakdown` que recebe `formats: FormatEntry[]` e `postsAnalyzed: number`.
2. Donut SVG (sem dependências novas):
   - Tamanho ~96px, stroke ~12px, fundo `surface-muted`.
   - Arcos por formato, na ordem `Carrossel → Reels → Imagem → Video`, usando as mesmas cores já definidas em `FORMAT_STYLE` (mantém coerência com a legenda das miniaturas em baixo).
   - Centro: número total em Inter SemiBold com `tabular-nums`, eyebrow `PUBLICAÇÕES` em `.text-eyebrow-sm`.
3. Lista de formatos à direita:
   - Inclui todos os formatos canónicos mesmo com `count = 0` (estado “esbatido” em `text-content-tertiary`).
   - Layout: `grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1.5` para alinhar nome, contagem e percentagem.
   - Percentagem arredondada a inteiro; usar `accent-primary` (azul `#3772E5`) para formatos ativos, `content-tertiary` para zero.
4. Posicionamento: inserir o bloco entre o header e a grelha de miniaturas, com `px-5 md:px-6 mt-5`.
5. Responsivo: em mobile, donut + legenda continuam lado a lado (donut encolhe para 80px). Em ecrãs muito estreitos (`<360px`) cair para coluna se necessário (`flex-col sm:flex-row`).

## Tokens e regras (memória do projeto)
- **Apenas Fraunces + Inter.** Nada de `font-mono`.
- Cores: usar `FORMAT_STYLE.dot` existente + `text-accent-primary` para os percentuais.
- Número central com `tabular-nums`, nunca `font-mono`.
- Eyebrow com `.text-eyebrow-sm` (Inter uppercase).
- Sem hardcode de hex; usar tokens semânticos onde possível e as classes Tailwind já em uso no ficheiro.

## Fora de âmbito
- Não tocar na grelha de miniaturas, legenda inferior, headline, subtítulo nem `InsightCallout`.
- Não alterar `snapshot-to-report-data.ts` — os dados em `formats` já chegam prontos.
- Não adicionar libs de chart (Recharts/etc.); SVG manual.
- Não regenerar relatórios nem mexer em backend.

## Validação
- Verificar visualmente em `/analyze/frederico.m.carvalho` (donut + legenda + percentagens corretas).
- Confirmar que totais batem certo: `Σ count = postsAnalyzed` e `Σ pct ≈ 100%`.
- Estado vazio: se todos `count = 0`, o bloco não renderiza (fallback gracioso).

## Checkpoint
- ☐ `FormatBreakdown` adicionado e a render entre header e thumbnails.
- ☐ Donut SVG com cores coerentes com a legenda atual.
- ☐ Legenda inclui Carrossel, Reels, Imagem (Video só se `count > 0`).
- ☐ Tipografia Inter + tabular-nums; sem `font-mono`.
- ☐ Responsivo em 375px.