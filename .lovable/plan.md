
## Problemas identificados no código (mobile @ 375px)

### Bloco 1 — Overview

1. **EditorialIdentityCard**: O título `font-display text-[1.35rem]` e o score ring ficam empilhados com `flex-col` em mobile — ok, mas o padding `px-5 py-6` pode ser reduzido para `px-4 py-5` para ganhar espaço.

2. **EngagementCardRefined**: Os 3 KPI cards usam `grid-cols-1 sm:grid-cols-3` — em mobile ficam empilhados verticalmente, o que ocupa demasiado espaço vertical. Os valores `text-[1.6rem]` são adequados mas os cards poderiam usar `grid-cols-3` já a partir de mobile (são compactos o suficiente).

3. **FrequencyCard**: O título `text-[1.5rem]` combinado com o status inline pode quebrar linha de forma estranha em ecrãs pequenos. O calendário está bem com `grid-cols-7`.

4. **FormatCard**: Similar ao FrequencyCard — título grande pode quebrar.

5. **PostComparisonBlock**: A VS Bar tem `min-w-[70px]` nos lados — ok para 375px mas apertado. Os PostCards com thumbnail `w-[72px]` + texto ficam bem.

6. **Títulos H3 dos cards grandes** (`text-[1.5rem] md:text-[2rem]`): Em mobile 1.5rem (24px) é adequado mas com tracking-tight e palavras longas em pt-PT pode causar overflow.

### Bloco 2 — Diagnóstico Editorial

7. **DiagnosticDistributionBar (vertical-list)**: Labels com `min-w-[5.5rem]` em mobile podem comprimir demasiado a barra. Com sublabels de texto longo (ex: "quem somos, missão, valores, bastidores") o layout fica apertado.

8. **DiagnosticFunnelStack**: Barras com `width: ${sharePct}%` e labels dentro ficam cortadas quando a percentagem é baixa. O `minWidth: fit-content` ajuda mas o `text-eyebrow-sm` pode não caber.

9. **CaptionDiagnosticsCard**: O grid `grid-cols-1 sm:grid-cols-3` nos KPI cards (TEMAS DOMINANTES, INTENÇÃO, CARACTERÍSTICAS) empilha em mobile — correto. Mas o grid `grid-cols-1 md:grid-cols-2` nas secções Expressões/Endings e Openings/Length empilha — correto. O diagnóstico editorial final usa `grid-cols-1 sm:grid-cols-3` para os 3 micro-diagnostics — em mobile ficam empilhados, ok.

10. **HashtagDiagnosticsCard**: Precisa verificação mas segue o mesmo padrão.

11. **DiagnosticAudienceHighlight (P05)**: Os 3 KPI cards `grid-cols-1 sm:grid-cols-3` empilham em mobile. O diagrama de conversa Z3 com 3 nodes usa `flex-col sm:flex-row` — correto para mobile. Valores `text-[28px]` nos KPIs são grandes em mobile.

12. **ReportDiagnosticGroup**: O grid dos filhos `grid-cols-1 md:grid-cols-2` está correto para mobile.

13. **"PEDE COMENTÁRIOS NOS POSTS?"**: O layout flex com `text-[28px]` + texto ao lado pode comprimir o texto em mobile.

## Alterações propostas

### A. Ajustes de espaçamento e tipografia mobile

| Ficheiro | Alteração |
|----------|-----------|
| `editorial-identity-card.tsx` | Reduzir padding mobile para `px-4 py-5`, Band 2 padding para `px-4 py-4` |
| `report-overview-engagement.tsx` | KPI grid: `grid-cols-3` em vez de `grid-cols-1 sm:grid-cols-3` (cards compactos) |
| `frequency-card.tsx` | Título: adicionar `break-words` para evitar overflow |
| `report-diagnostic-card.tsx` | DiagnosticDistributionBar vertical-list: reduzir `min-w-[5.5rem]` para `min-w-[4.5rem]`, sublabel truncar a 1 linha em mobile |
| `report-diagnostic-card.tsx` | DiagnosticAudienceHighlight: KPIs `text-[28px]` → `text-[22px] sm:text-[28px]` |
| `caption-diagnostics-card.tsx` | "PEDE COMENTÁRIOS": layout `flex-col sm:flex-row` em vez de `flex` para mobile |
| `caption-diagnostics-card.tsx` | CardShell header eyebrow: `text-[9px] sm:text-[10px]` para não truncar em mobile |
| `report-post-comparison.tsx` | VS Bar: reduzir min-width mobile `min-w-[60px]` |

### B. Consistência visual

- Uniformizar padding horizontal: `px-4 md:px-6` em todos os cards de ambos os blocos
- Garantir que nenhum texto overflow horizontal (adicionar `overflow-hidden` ou `break-words` onde necessário)
- Reduzir font-size dos KPI numbers em mobile para manter proporção

### Ficheiros a editar (7)

1. `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`
2. `src/components/report-redesign/v2/report-overview-engagement.tsx`
3. `src/components/report-redesign/v2/overview/frequency-card.tsx`
4. `src/components/report-redesign/v2/report-diagnostic-card.tsx`
5. `src/components/report-redesign/v2/caption-diagnostics-card.tsx`
6. `src/components/report-redesign/v2/report-post-comparison.tsx`
7. `src/components/report-redesign/v2/hashtag-diagnostics-card.tsx`

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Screenshot a 375px nos blocos 1 e 2
