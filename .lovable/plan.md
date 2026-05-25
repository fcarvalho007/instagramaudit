# Plano · Restaurar pontos fortes, limite de crescimento e os 3 blocos de métricas (Bloco 1)

## Contexto
O primeiro card do Bloco 1 (`EditorialIdentityCard`, `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`) já teve três zonas que foram removidas:

1. **Strip métrica horizontal** com 3 blocos: média de likes/post, média de comentários/post e frequência semanal de publicação.
2. **Coluna "O que já funciona"** (pontos fortes, success).
3. **Coluna "O que limita o crescimento"** (warning).

Foram substituídas por uma "Anchor Metric" + uma nota "Porquê importa". O utilizador quer as 3 zonas antigas de volta.

Todas as chaves i18n necessárias **continuam presentes** em `src/i18n/locales/{pt,en}/report.json` (subárvores `identity.metrics`, `identity.signals`, `identity.columns`, `identity.format_singular`) — não é preciso mexer nos JSONs.

O call-site (`report-overview-block.tsx`) já passa `averageLikes`, `averageComments`, `postingFrequencyWeekly`, `dominantFormat`, `dominantFormatShare`, `followers` ao card — não é preciso mexer.

## Alterações (1 ficheiro)

### `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`

1. **Imports:** trocar `Target` por `ArrowUpRight`, `ArrowDownRight`, `Heart`, `MessageCircle`, `CalendarDays` (lucide-react). Adicionar `formatCompactNumber` (de `@/lib/format` — confirmar import existente no projeto, fallback para Intl.NumberFormat se não houver).

2. **Tipos:** adicionar `type Tone = "success" | "warning"` e `interface Bullet { destaque: string; detalhe: string }`.

3. **Restaurar `deriveSignals(...)`**: função pura que devolve `{ strengths, limits }`, ambos com até 2 bullets, baseada em frequência semanal, tier de seguidores, delta de engagement vs benchmark, score de interação e concentração de formato. Garante 2+2 com fallbacks neutros já existentes em i18n.

4. **Restaurar `MetricsStrip`**: grelha `sm:grid-cols-3` com 3 cards, cada um com ícone (Heart/MessageCircle/CalendarDays), valor compacto + unidade + subtítulo derivado de bandas (`commentsBand`, `rhythmBand`). Renderiza só os blocos com dados.

5. **Restaurar `BulletColumn`**: duas colunas (success/warning) com fundo `bg-tint-success` / `bg-tint-warning` e bullets coloridos. Empilham em mobile, lado a lado em `md:`.

6. **Layout do `article`** (substitui a Anchor + Porque-importa actuais):
   ```
   ┌────────────────────────────────────────────┐
   │ Macro: gauge + título + parágrafo + ref bar│
   ├────────────────────────────────────────────┤
   │ MetricsStrip (likes / comments / ritmo)    │  ← se houver ≥1 métrica
   ├──────────────────────┬─────────────────────┤
   │ O que já funciona    │ O que limita        │  ← 2 colunas, sempre 2+2 bullets
   └──────────────────────┴─────────────────────┘
   ```

7. **Remover** `AnchorMetric`, `selectAnchor`, `selectWhy`, exports `AnchorKind`/`AnchorSelection`/`WhyKind` e os `void averageLikes; void dominantFormat; void followers;` (passam a ser usados). Manter `ScoreGauge`, `ReferenceBar`, `buildFallbackCopy`, `deriveCopyFromAi`, `computeOverall`, `bandFor`, `bandLabel`, `bandTextClass`, `bandFillClass`, `bandBadgeClass`, `formatDecimal`.

8. **Testes:** correr `src/components/report-redesign/v2/overview/__tests__/` — se houver testes que importam `selectAnchor`/`selectWhy`, atualizar/remover (manterei `deriveSignals` testável). Substituir por testes mínimos de `deriveSignals` (2 cenários: forte vs fraco). Decisão final depois de ler `__tests__`.

## Fora de scope
- Sem mexer em JSONs i18n (chaves antigas já existem).
- Sem mexer no call-site (`report-overview-block.tsx`).
- Sem mudanças noutros cards / blocos.
- Sem alterar pipeline de dados nem snapshot adapter.

## Validação
- `bunx tsc --noEmit`
- `bunx vitest run src/components/report-redesign/v2/overview`
- Inspecionar preview do Bloco 1 num relatório real (ex. `/analyze/frederico.m.carvalho`) para confirmar as 3 zonas restauradas.

## Checkpoint

- ☐ `MetricsStrip` com 3 blocos (likes, comments, ritmo) renderizado abaixo da zona macro
- ☐ Duas colunas "O que já funciona" / "O que limita o crescimento" com 2 bullets cada
- ☐ Zonas "âncora" e "porque importa" removidas (substituídas pelas anteriores)
- ☐ `tsc --noEmit` e `vitest run` verdes
