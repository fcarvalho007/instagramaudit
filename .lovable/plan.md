## Diagnóstico

Verifiquei o bloco 06 "Diagnóstico editorial". **Os 7 cartões estão todos presentes** no branch comercial (`!isLab`) de `report-diagnostic-block.tsx`:

| # | Cartão | Grupo | Anchor |
|---|--------|-------|--------|
| 01 | Natureza do conteúdo | A · Identidade editorial | `#diag-conteudo` |
| 02 | Funil | A · Identidade editorial | `#diag-funil` |
| 03 | Hashtags | B · Como comunica | `#diag-hashtags` |
| 04 | Legendas | B · Como comunica | `#diag-legendas` |
| 05 | Capas | E · Análise visual | `#diag-capas` |
| 06 | Audiência | C · Resposta do público | `#diag-audiencia` |
| 07 | Integração | D · Contexto estratégico | `#diag-integracao` |

O que está mal é o **layout dos grupos**, não a presença dos cartões — daí a sensação de "desformatação" / "está a faltar".

## Causa raiz

`ReportDiagnosticGroup` aplica sempre `grid grid-cols-1 md:grid-cols-2` aos filhos. Isto cria três problemas visíveis:

1. **Grupo E (Capas)** — 1 só cartão (`VisualCoverAnalysisCard`) que internamente já usa `grid-cols-2`. Em desktop fica espremido a meia-largura com a outra metade vazia, e o conteúdo interno colapsa.
2. **Grupo D (Integração)** — `renderIntegrationCard` não declara `span`, default = `"half"`. Cartão fica a meio-largura, metade direita vazia.
3. **Grupo B (Hashtags + Legendas)** — `HashtagDiagnosticsCard` e `CaptionDiagnosticsCard` são cartões editoriais full-width com grids internos próprios. Ao ficarem lado a lado num grid-cols-2, ambos ficam cramped e perdem hierarquia.

O Grupo C (Audiência) já se safa porque o cartão declara `span="full"` → aplica `md:col-span-2`.

## Solução

Acrescentar prop `layout` ao `ReportDiagnosticGroup` e ajustar os call sites do branch comercial. Sem mexer em dados, classifiers, anchors, sidebar, lab variant ou texto.

### 1. `src/components/report-redesign/v2/report-diagnostic-group.tsx`
- Nova prop opcional `layout?: "split" | "stack"` (default `"split"`, comportamento actual).
- `"split"` → `grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6` (cartões meia-largura emparelhados).
- `"stack"` → `flex flex-col gap-5 md:gap-6` (cartões full-width empilhados).

### 2. `src/components/report-redesign/v2/report-diagnostic-block.tsx` (apenas branch `!isLab`)
Mapear cada grupo ao layout adequado:

| Grupo | Cartões | layout |
|-------|---------|--------|
| A · Identidade editorial | 01 + 02 (`span="half"`) | `split` (default) |
| B · Como comunica | 03 Hashtags + 04 Legendas (full-width cards) | `stack` |
| E · Análise visual | 05 Capas (full-width) | `stack` |
| C · Resposta do público | 06 Audiência (`span="full"`) | `stack` |
| D · Contexto estratégico | 07 Integração | `stack` |

Adicionalmente garantir que `renderIntegrationCard` passa `span="full"` — assim, mesmo que algum consumidor futuro não declare `layout`, o cartão sabe ocupar a largura toda.

### 3. Variante lab (`isLab`)
Manter exactamente como está. A revisão é só do relatório comercial.

## O que NÃO muda

- Conteúdo / texto / i18n dos cartões.
- Classifiers (`block02-diagnostic.ts`), `caption-intelligence`, visual covers.
- Anchors `#diag-*` e sidebar / scroll-spy.
- Cabeçalho do grupo (letra, label, contador "N perguntas").
- Branch lab.
- Payment, unlock, pricing, snapshot, schema, geração de relatório.

## Validação manual

1. Desktop ≥1280: Grupo A continua com 2 cartões lado a lado; B, C, D, E ocupam a largura toda do contentor sem espaço vazio à direita.
2. Mobile 375–414: tudo continua em coluna única (grid já era `grid-cols-1` em mobile).
3. Cartão 07 Integração visivelmente full-width com a checklist alinhada.
4. Cartão 05 Capas mostra a sua grelha interna 2-col confortavelmente.
5. Sidebar continua a mostrar 7 sub-itens e scroll-spy chega a todos os anchors.
6. Branch lab inalterado.
