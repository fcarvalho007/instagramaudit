---
name: Free ↔ Pro card mirror
description: Locked teasers in the free report must mirror the unlocked paid card titles, eyebrows and sub-blocks; sidebar shortLabel matches too
type: feature
---
Regra de espelhamento (3-way consistency) entre relatório gratuito e pago:

- Toda `PremiumTeaserCard` bloqueada deve usar o mesmo `title` e `eyebrow` do card desbloqueado equivalente no pago.
- `subItems` (chips com cadeado) listam os sub-blocos reais que o cliente vai encontrar depois de pagar, para gerir expectativa.
- `COMMERCIAL_SECTIONS[].shortLabel` (sidebar/TOC) tem de corresponder ao título do teaser e ao card pago.

Mapping actual (secções 03–07):
- 03 `frequencia` → "Cadência semanal" (CompetitorCadenceCompare + CompetitorWeekdayCompare)
- 04 `formatos` → "Mix de formatos" (CompetitorFormatCompare)
- 05 `publicacoes-chave` → "Melhor vs pior publicação" (PostComparisonBlock + CompetitorTopPostCompare)
- 06 `diagnostico-editorial` → "Diagnóstico editorial comparativo" (ReportDiagnosticBlock + CompetitorEditorialDiagnostic)
- 07 `prioridades` → "Prioridades de acção" (ReportDiagnosticPriorities)

Ao adicionar/renomear cards no pago, actualizar simultaneamente: `PREMIUM_TEASERS` em `report-overview-block.tsx`, `COMMERCIAL_SECTIONS` em `block-config.ts`, e a linha resumo em `sticky-unlock-bar.tsx`.