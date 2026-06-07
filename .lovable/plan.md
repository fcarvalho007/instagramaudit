## Diagnóstico

O screenshot mostra o **`EditorialIdentityCard`** — o card rico com:

- eyebrow `ÍNDICE DO PERFIL · MICRO (10K–50K)` + ⓘ
- número herói `37 / 100` em Fraunces
- régua 0–100 com pin "esta marca" e marca da mediana + legenda `este perfil | mediana do escalão`
- linha "Abaixo da mediana do escalão Micro."
- veredicto editorial (`Cadência forte, sinal fraco`) + parágrafo
- `MetricsStrip` (Gostos · Comentários · Ritmo) com ícones, valores grandes e chips coloridos
- rodapé split `O que funciona` (verde) / `O que limita` (âmbar) com ícones ↗ ↘

O componente em `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` está intacto e corresponde ao visual do screenshot. O ficheiro não foi alterado nos últimos commits.

O que mudou: em `src/components/report-redesign/v2/report-overview-block.tsx`, o **modo `free_with_engagement`** (usado no fluxo pós lead-capture do report grátis) renderiza o `FreeInitialReadingCard` minimal (visão geral em "VISÃO GERAL" com 3 células `Cadência / Envolvimento / Formato dominante` e bullet lists sem cor) em vez do `EditorialIdentityCard`. É esse o card "pobre" que estás a ver agora no preview.

## Mudança

No `report-overview-block.tsx`, dentro do branch `mode === "free_with_engagement"`:

1. Substituir o `<FreeInitialReadingCard … />` pelo mesmo `<EditorialIdentityCard … />` que o modo `free` já renderiza, com **as mesmas props** (scores, aiVerdict, keyMetrics, dominantFormat, dominantFormatShare, postingFrequencyWeekly, followers, postsAnalyzed, averageLikes, averageComments, cadenceSufficient, cadenceReliability, competitorsCount, cadenceMethod, cadenceWindowDays, hasRecurringHashtags, cadenceLabelPt, hashtagsState, topHashtags).
2. Manter a `MethodologyLine` já presente acima.
3. Manter intactos: `EngagementCardRefined` (#engagement), a lista de `PremiumTeaserCard`, lock/gate e qualquer lógica downstream.
4. Remover o import de `FreeInitialReadingCard` se deixar de ser usado (verificar primeiro se mais nenhum sítio o usa — a busca anterior só encontrou este consumidor).

Sem alterações ao `EditorialIdentityCard`, à régua, ao `MetricsStrip`, aos tokens de cor/tipografia, ao fluxo de lead-capture, à entitlement ou ao backend. Os dados podem variar do screenshot (por causa das alterações recentes do checkout/lead) mas o visual passa a ser o do screenshot.

## Validação

- `/analyze/frederico.m.carvalho` após lead-capture (modo `free_with_engagement`) mostra o card rico com régua 0–100, MetricsStrip e split `O que funciona` / `O que limita`.
- Modos `free`, `all`, `locked` ficam exactamente como estão.
- Mobile: o `EditorialIdentityCard` já é responsive; sem regressão.
