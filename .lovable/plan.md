## Problemas detetados (vs. mockup)

### 1. Duplicação visível no Bloco 02 — Pergunta 04 · Temas

No `renderThemesCard` (linhas 331-368 de `report-diagnostic-block.tsx`), os temas são renderizados **duas vezes**:

- **1ª vez** dentro da caixa "Resposta dominante" como `answer`, concatenando os temas com ` · ` separador (`#ia · #inteligenciaartificial · #marketingdigital`)
- **2ª vez** logo abaixo, no slot `children`, com a lista de barras + contagem (`6×`, `5×`, `5×`)

No mockup, a caixa azul de resposta mostra **só o título da hipótese** ("Foco claro em IA") e a lista de hashtags com barras aparece **uma única vez** abaixo. Por isso parece "uma secção repetida".

### 2. Visuais que não respeitam o mockup

| Cartão | Mockup | Implementação atual | Correção |
|---|---|---|---|
| **Q01 · Tipo de conteúdo** | Caixa verde com **ícone 📅** + título "Educativo", e **abaixo** uma lista vertical (`Educativo ──── 75%`, `Inspiracional ── 17%`, `Promocional ─ 8%`) | Só caixa verde com título, **sem distribuição** | Adicionar `DiagnosticDistributionBar` vertical (lista com label + barra + %) usando os scores do classifier |
| **Q02 · Funil** | Caixa azul "Topo do funil · atrair", e **abaixo** as 4 fases em barras horizontais empilhadas (TOPO 75%, MEIO 17%, FUNDO 8%, PÓS 0%) com cores degradê azul | Só a caixa azul com label, **sem visualização das 4 fases** | Adicionar barras das 4 fases do funil com %, expor `breakdown` no `FunnelStageResult` |
| **Q03 · Formatos** | "Carrosséis · 75% da amostra" + barra horizontal **única** + legenda compacta `● Carrosséis 9 · ● Reels 3 · ● Imagens 0` | Já está OK ✓ | Apenas garantir que a legenda mostra **contagem absoluta** em vez de % decimais |
| **Q04 · Temas** | "Foco claro em IA" no título + 3 hashtags com barras + sufixo `6×` | **Duplicado** (ver acima) | Remover a concatenação dos temas de `answer` — manter só `r.label` (ex.: "Foco claro em IA"). A lista de hashtags fica só no `children` |
| **Q05 · Linguagem** | "Longas e explicativas" + 3 mini-stats (`280` caracteres, `8%` perguntas, `0%` CTA) | "COM PERGUNTAS" é **inventado** (`ctaSharePct * 0.6`) | Adicionar `classifyQuestionShare(posts)` que conta `?` reais nas captions; passar valor real |
| **Q06 · Resposta** | "Vê mas não conversa" + **strip vermelho com "15 gostos médios"** e linha discreta `0 comentários médios` | 3 mini-stats neutros (comentários médios, %, posts) | Trocar por destaque de likes médios (vermelho/rose se silenciosa) + linha discreta de comentários médios. Apresentação editorial, não 3 stats neutros |
| **Q07 · Integração** | Checklist com pontos coloridos por estado, hint à direita (`Detetado`, `5 posts`, `Ausentes`) | Já corresponde ✓ | Pequena polish: garantir que o estado "ausente" usa o plural "Ausentes" quando aplicável |
| **Q08 · Objetivo** | "Notoriedade · marca pessoal" + **ranking horizontal** com % à esquerda da label (`85% ─── Notoriedade de marca`, `42% ── Geração de leads`, ...) | Ranking com label à esquerda e % à direita | Inverter layout: % primeiro (mono, tabular), depois barra+label |

### 3. CTA aponta para âncora errada
`report-diagnostic-cta.tsx` usa `href="#leitura-completa"` (não existe). O alvo correto é `#tier-comparison` (id real do `TierComparisonBlock`). Confirmar id e atualizar.

### 4. Layout: cartão único ocupa só metade
Quando um grupo tem só 1 cartão (acontece com Group A se Q01 ou Q02 forem indisponíveis), fica meia coluna vazia. No grid do `ReportDiagnosticGroup`, cartões únicos devem ter `md:col-span-2`.

---

## Plano de refinamento

### Ficheiros a editar

**`src/lib/report/block02-diagnostic.ts`**
- `ContentTypeResult`: expor `distribution: Array<{ label: string; sharePct: number }>` (já existe internamente, falta surface)
- `FunnelStageResult`: expor `breakdown: Array<{ stage: "topo"|"meio"|"fundo"|"pos"; label: string; sharePct: number }>`
- Novo helper `classifyQuestionShare(posts): { sharePct: number }` — conta `?` no fim/meio das captions
- `CaptionPatternResult`: adicionar `questionSharePct: number` populado pelo helper acima

**`src/components/report-redesign/v2/report-diagnostic-block.tsx`**
- `renderContentTypeCard`: adicionar `<DiagnosticDistributionBar>` (variante vertical) com `r.distribution`
- `renderFunnelCard`: adicionar barras horizontais empilhadas com `r.breakdown`
- `renderThemesCard`: **remover** a concatenação dos temas em `answer` — usar só `r.label` (ex.: "Foco claro em IA"). Eliminar duplicação.
- `renderCaptionCard`: usar `r.questionSharePct` real em vez do cálculo inventado
- `renderAudienceCard`: trocar 3 mini-stats por strip de likes médios + linha discreta de comentários médios
- `renderObjectiveCard`: passar prop nova ao `DiagnosticRanking` para inverter layout (% à esquerda)
- `renderFormatCard`: passar `count` (contagem absoluta) para a legenda

**`src/components/report-redesign/v2/report-diagnostic-card.tsx`**
- `DiagnosticDistributionBar`: aceitar `variant?: "stacked" | "vertical-list"` para suportar a Q01 (lista vertical) e Q02 (stacked horizontal). Aceitar `count` opcional na legenda
- `DiagnosticRanking`: aceitar `valuePosition?: "left" | "right"` (default `"right"`); quando `"left"`, render `% ─── label`
- Novo helper `DiagnosticAudienceHighlight` (ou inline) para o destaque visual da Q06

**`src/components/report-redesign/v2/report-diagnostic-group.tsx`**
- Quando `questionsCount === 1`, aplicar `md:col-span-2` ao único filho (passar via `Children.map` ou via classe condicional no wrapper)

**`src/components/report-redesign/v2/report-diagnostic-cta.tsx`**
- Confirmar id real do tier-comparison (provavelmente é `#tier-comparison` no `TierComparisonBlock`); se sim, atualizar `href`

### Fora do scope
- Sem chamadas a Apify/DataForSEO/OpenAI/PDFShift/Supabase write
- Sem alterações a PDF, admin, `/report/example`, schema, prompts AI
- Sem novas dependências
- Sem regenerar relatórios

### Validação
- TypeScript verde (auto-build)
- Vitest verde (rodar suite block02)
- QA visual no `/analyze/frederico.m.carvalho` em viewport 375px e 1460px

---

## Checkpoint

☐ Surface `distribution` em `ContentTypeResult` e `breakdown` em `FunnelStageResult`
☐ Adicionar `classifyQuestionShare` + `questionSharePct` em `CaptionPatternResult`
☐ Remover duplicação dos temas em Q04
☐ Adicionar visualizações em falta em Q01 e Q02 (conforme mockup)
☐ Remover dado inventado em Q05 (perguntas reais)
☐ Refazer Q06 com destaque editorial (likes médios + comentários médios)
☐ Inverter layout do ranking em Q08
☐ Cartão único ocupa `md:col-span-2`
☐ Corrigir âncora do CTA
☐ TypeScript + Vitest verdes
