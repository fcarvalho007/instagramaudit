## Problema

Hoje os 5 cards bloqueados no relatório gratuito mostram títulos em forma de pergunta editorial ("Com que ritmo publica este perfil?", "Que posts puxam o perfil para cima?"...) que não coincidem com os títulos reais dos cards que aparecem depois do pagamento ("Cadência semanal", "Publicação em destaque", "Mix de formatos", "Diagnóstico editorial comparativo"...). O cliente paga e não reconhece o que viu bloqueado, sentindo-se defraudado. A sidebar tem outra variação ainda ("Frequência editorial", "Publicações-chave"...), criando 3 nomes para a mesma secção.

## Objectivo

3-way consistency: **sidebar (TOC) ↔ teaser bloqueado ↔ card desbloqueado** usam o mesmo nome e descrevem o mesmo conteúdo. O subtítulo do teaser passa a anunciar o que vai aparecer, não uma pergunta abstracta.

## Alinhamento final (secções 03–07)

| # | Sidebar (shortLabel) | Teaser eyebrow | Teaser título | Card pago (existente) |
|---|----------------------|----------------|---------------|------------------------|
| 03 | Cadência semanal | CADÊNCIA SEMANAL | Cadência semanal e ritmo por dia | `CompetitorCadenceCompare` ("Cadência semanal") + `CompetitorWeekdayCompare` |
| 04 | Mix de formatos | MIX DE FORMATOS | Mix de formatos | `CompetitorFormatCompare` ("Mix de formatos") |
| 05 | Melhor vs pior publicação | PUBLICAÇÕES-CHAVE | Melhor vs pior publicação | `PostComparisonBlock` + `CompetitorTopPostCompare` ("Publicação em destaque") |
| 06 | Diagnóstico editorial | DIAGNÓSTICO EDITORIAL | Diagnóstico editorial comparativo | `ReportDiagnosticBlock` + `CompetitorEditorialDiagnostic` ("Diagnóstico editorial comparativo") |
| 07 | Prioridades de acção | PRIORIDADES DE ACÇÃO | Prioridades de acção | `ReportDiagnosticPriorities` |

As secções 01 Visão geral e 02 Engagement já são free e não mudam.

## Subitens do teaser (preview do que abre)

Acrescentar `subItems` (lista de chips com cadeado) em **todas** as 5 teasers — hoje só a 06 tem. Cada chip = nome de um card/sub-bloco real do pago, para o cliente perceber a densidade do que vai destrancar:

- **03** Cadência semanal: "Cadência semanal", "Ritmo por dia da semana", "Comparação com concorrente"
- **04** Mix de formatos: "Reels vs Carrosséis vs Imagens", "Formato dominante", "Comparação com concorrente"
- **05** Publicações-chave: "Top publicações", "Piores publicações", "Publicação em destaque vs concorrente"
- **06** Diagnóstico editorial: mantém os 7 já existentes (Natureza, Funil, Hashtags, Legendas, Capas, Audiência, Integração) + "Diagnóstico comparativo"
- **07** Prioridades: "O que testar", "O que corrigir", "O que repetir"

## Subtítulo

Reescrever cada `description` para descrever o card real (e não a pergunta editorial):

- 03: "Cadência semanal observada, ritmo por dia da semana e comparação com o concorrente."
- 04: "Distribuição entre Reels, Carrosséis e Imagens e como difere do concorrente."
- 05: "Melhor e pior publicação do período e duelo lado-a-lado com a melhor do concorrente."
- 06: "7 perguntas estratégicas + diagnóstico editorial comparado ao concorrente."
- 07: "Lista priorizada do que testar, corrigir e repetir nas próximas 4 semanas."

## Ficheiros a alterar

1. `src/components/report-redesign/v2/report-overview-block.tsx` — actualizar `PREMIUM_TEASERS` (eyebrow, title, description, subItems) para os 5 entries.
2. `src/components/report-redesign/v2/block-config.ts` — actualizar `COMMERCIAL_SECTIONS[2]` shortLabel "Frequência editorial" → "Cadência semanal" e `[4]` "Publicações-chave" → "Melhor vs pior publicação".
3. `src/components/report-redesign/v2/sticky-unlock-bar.tsx` — actualizar a linha "frequência, formatos, publicações-chave, diagnóstico e prioridades" para "cadência semanal, mix de formatos, publicações-chave, diagnóstico editorial e prioridades".
4. `mem/design/iconosquare-style.md` (ou criar `mem/features/free-pro-card-mirror.md`) — anotar a regra: "Toda teaser bloqueada deve usar o mesmo título e eyebrow do card desbloqueado equivalente, com `subItems` que listam os sub-blocos reais."

## Fora de âmbito

- Não mexe em lógica de checkout, entitlements ou `premiumUnlocked`.
- Não muda layout/skeleton (`previewVariant`) dos teasers — só copy + subItems.
- Não toca em `ReportDiagnosticBlock`, `CompetitorCadenceCompare`, etc. (cards pagos ficam intactos).
- i18n: as strings vivem hoje como literais nos próprios componentes (`PREMIUM_TEASERS`), não em ficheiros JSON, por isso mantém-se inline (sem novas chaves a criar).

## Validação

- Free: as 5 teasers passam a mostrar nomes idênticos aos cards do pago, com chips de subitens.
- Sidebar (desktop + mobile bottom nav): items 03 e 05 com os novos nomes.
- Pago: anchors `frequencia`, `formatos`, `publicacoes-chave`, `diagnostico-editorial`, `prioridades` continuam a funcionar (não mexemos nos ids).
