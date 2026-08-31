---
name: Free ↔ Pro card mirror
description: Locked teasers in the free report must mirror the unlocked paid card titles, eyebrows and sub-blocks; sidebar shortLabel matches too
type: feature
---
Regra de espelhamento (3-way consistency) entre relatório gratuito e pago:

- Toda `PremiumTeaserCard` bloqueada deve usar o mesmo `title` e `eyebrow` do card desbloqueado equivalente no pago.
- `subItems` (chips com cadeado) listam os sub-blocos reais que o cliente vai encontrar depois de pagar, para gerir expectativa.
- `COMMERCIAL_SECTIONS[].shortLabel` (sidebar/TOC) tem de corresponder ao título do teaser e ao card pago.

Mapping actual (`COMMERCIAL_SECTIONS`):
- 01 `overview` — free
- 02 `engagement` — free
- 03 `frequencia` → "Cadência semanal" — free (completo já no estado anónimo)
- 04 `publicacoes-chave` → "Melhor vs pior publicação" — free_email (preview em A via `PostComparisonPreview`)
- 05 `formatos` → "Mix de formatos" — free_email
- 06 `conversas` → "Conversas" (Comment Intelligence) — free_email
- 07 `diagnostico-editorial` → "Diagnóstico editorial" — pro
- 08 `prioridades` → "Prioridades de acção" — pro

Servidor: `sanitize-snapshot.ts` tem nível `lead` que preserva apenas `comment_intelligence`; `/api/public/analysis-snapshot.$username` devolve `lead` para quem tem cookie de lead sem entitlement.

Ao adicionar/renomear cards no pago, actualizar simultaneamente: `PREMIUM_TEASERS` em `report-overview-block.tsx`, `COMMERCIAL_SECTIONS` em `block-config.ts`, e a linha resumo em `sticky-unlock-bar.tsx`.
## Ronda 6B.2 — composição cumulativa

- Ramo comercial único (`mode="free_with_engagement"`) para A, B e C; o ramo
  `mode="all"` (comparação de concorrentes + leituras IA por card) fica
  reservado ao `internal_lab`.
- Estado A: Identidade → Engagement → Frequência → pré-visualização
  Melhor/Pior → gate único (`FreeDeepenTeaser`, "Grátis com email"). Nada de
  Formatos, Conversas, Diagnóstico, Prioridades, teasers Pro ou preço.
- Estado B: acrescenta Formatos, Melhor/Pior completo e Conversas; a proposta
  Pro é única e vive no `ReportEndOfFreeBlock`, depois de Conversas.
- Estado C: mesma composição de B + Diagnóstico editorial e Prioridades.
- Analytics: `post_comparison_preview_viewed` dispara uma vez no estado A.
- Dados: o payload anónimo mantém campos por-post não analíticos (thumbnail,
  formato, data, legenda). Métricas premium por post continuam fora do
  estado A por não serem renderizadas; hardening ao nível do payload fica
  para ronda futura.
