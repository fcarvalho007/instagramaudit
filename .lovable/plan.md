# Avaliação das fases anteriores

Auditei `src/components/report-redesign/v2/compare/*` e os 6 cards de comparação (`ComparisonHero`, `CompetitorBioCompare`, `CompetitorEngagementCompare`, `CompetitorCadenceCompare`, `CompetitorWeekdayCompare`, `CompetitorFormatCompare`).

## O que já está concluído (preview, ainda por publicar)

- **Tipografia unificada do shell** — `text-2xl sm:text-3xl` em todos os cards, subtítulo `text-sm sm:text-base`, chip "Concorrente em janela de referência", footer eyebrow `Leitura`.
- **Ritmo de espaçamento** — `p-6 sm:p-8` (anchor `p-7 sm:p-9`), `mt-5`, `mt-7 sm:mt-9`, footer `sm:px-6 sm:py-5`.
- **Handle row com `prominence`** — wiring real, `strong` (avatar `size-9`, `py-2 text-sm sm:text-base`) e `default` aplicados. `vs` em serif `text-xl sm:text-2xl`.
- **CompareBarPair** — coluna de valores `w-16 sm:w-24`, barra `h-3 sm:h-4`, anel do vencedor mantido.
- **CompareStatBlock** — padding `px-5 py-6 sm:px-6 sm:py-7`, valor `text-3xl sm:text-4xl tabular-nums`.
- **CompareTable** — `py-3`, labels e valores `text-sm`/`text-sm sm:text-base` semibold tabular.
- **Sem `font-mono`** em UI pública dos cards de comparação. Avatar fallback com iniciais em gradiente intacto.

## O que ficou em falta da plan original

1. **CompareThumbPlaceholder partilhado (item 4 da plan anterior)** — não foi criado nem exportado. `competitor-cadence-compare.tsx` continua com `Thumb` inline (linha 212 + `ImageIcon` 243). Falta-lhe consistência com futuros usos.
2. **Resíduos de `text-xs` em labels/secondary** que deviam ser `text-sm` segundo a regra editorial:
   - `compare-table.tsx:157` — `<dt>` de meta-linhas ainda `text-xs`.
   - `compare-bar-pair.tsx:170` — legenda de categorias `text-xs`.
   - `competitor-format-compare.tsx:140,149,160` — labels e linhas da lista de formatos `text-xs`.
   - `competitor-engagement-compare.tsx:160,230` — escala/legenda do barómetro `text-xs`.
   - `competitor-bio-compare.tsx:85` — nota de rodapé do painel `text-xs`.
   - `competitor-cadence-compare.tsx:110` — caption final `text-xs`.
   - Aceitável manter `text-xs`: chip de baseline (`compare-card-shell.tsx:78`), hints decorativos (`compare-stat-block.tsx:94,160`, `compare-bar-pair.tsx:124,304`), nota de tabela (`compare-table.tsx:115`).

## Plan: encerrar a iteração editorial

### A. Criar e adotar `CompareThumbPlaceholder`
- Em `compare-handle-row.tsx`, exportar `CompareThumbPlaceholder` (`bg-surface-muted`, `rounded-md`, `aspect-square`, `<ImageIcon className="size-4 text-content-tertiary/60" />` centrado, prop opcional `className` para sobrepor tamanho).
- Exportar no `compare/index.ts`.
- Em `competitor-cadence-compare.tsx`, substituir o branch de fallback do `Thumb` interno (e a inicial `aria-hidden` cinza) para usar `CompareThumbPlaceholder` — mantém visual idêntico mas centraliza.

### B. Subir labels secundárias para `text-sm`
Apenas trocas de className, sem mudança de layout/lógica:
- `compare-table.tsx:157` → `text-sm text-content-secondary`.
- `compare-bar-pair.tsx:170` → `text-sm text-content-secondary` (legenda inferior).
- `competitor-format-compare.tsx:140,149,160` → `text-sm` mantendo cor.
- `competitor-engagement-compare.tsx:230` → `text-sm tabular-nums`. (Linha 160 é régua interna do barómetro de 16 px — manter `text-xs` como exceção de micro-label de chart.)
- `competitor-bio-compare.tsx:85` → `text-sm text-content-secondary`.
- `competitor-cadence-compare.tsx:110` → `text-sm text-content-tertiary`.

### C. Validação rápida (sem código)
- `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` em preview: confirmar que todos os cards têm o mesmo peso tipográfico em labels secundárias e que o placeholder de thumbnail do "Cadência" mantém aspecto.
- 375 px: cards continuam sem overflow horizontal.
- Verificar que nada do report Free/Public, single-profile, Add Competitor ou backend foi tocado.

## Ficheiros tocados (B+C edits)
- `src/components/report-redesign/v2/compare/compare-handle-row.tsx`
- `src/components/report-redesign/v2/compare/index.ts`
- `src/components/report-redesign/v2/compare/compare-table.tsx`
- `src/components/report-redesign/v2/compare/compare-bar-pair.tsx`
- `src/components/report-redesign/v2/competitor-cadence-compare.tsx`
- `src/components/report-redesign/v2/competitor-format-compare.tsx`
- `src/components/report-redesign/v2/competitor-engagement-compare.tsx`
- `src/components/report-redesign/v2/competitor-bio-compare.tsx`

Sem novas dependências, sem schema, sem provider calls, sem alterações no Free/Public ou no Add Competitor.

## Nota de deploy
O preview já contém as fases 1–3, 5–7 da iteração anterior. Para o domínio `auditprofiles.com` refletir tudo (incluindo este fecho), é preciso **Publicar/Update** após aplicar este plano.
