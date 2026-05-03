
# Zona D — Reescrita visual com dados literais do adapter

## Contexto

Os campos `enriched.postingTimeline` e `enriched.analysedPostFormats` já estão disponíveis no adapter. Os cards actuais usam dados aproximados (`temporalSeries` e `formatBreakdown`). Este plano liga os cards aos dados literais.

## Ficheiros a alterar

1. **`src/components/report-redesign/v2/report-overview-block.tsx`** — substituir derivações aproximadas pelos campos `enriched`
2. **`src/components/report-redesign/v2/overview/frequency-card.tsx`** — actualizar props e calendar para usar `postingTimeline`
3. **`src/components/report-redesign/v2/overview/format-card.tsx`** — actualizar thumbnails para usar `analysedPostFormats` (um mini-thumbnail por post real com data)
4. **`src/components/report-redesign/v2/overview/__tests__/zone-d-helpers.test.ts`** — ajustar testes se assinaturas mudarem

## Alterações detalhadas

### report-overview-block.tsx

- Remover `calendarDays` derivado de `temporalSeries` — usar `enriched.postingTimeline` directamente
- Remover `formatEntries` derivado de `formatBreakdown` — usar `enriched.analysedPostFormats` + `formatBreakdown` para stats agregadas
- Passar `postingTimeline` ao FrequencyCard e `analysedPostFormats` ao FormatCard

### frequency-card.tsx

- Mudar interface `DayEntry` para `{ date: string; published: boolean; postCount: number }` (alinhar com adapter)
- Títulos dos quadrados: `2026-04-15 · publicou` / `2026-04-16 · não publicou`
- Legenda: `publicou (12)` / `parou (6)`
- Accessibility: aria-label com contagem literal

### format-card.tsx

- Aceitar `analysedPostFormats` como prop (array de `{ date, type }`)
- Gerar um thumbnail por post real (em vez de N thumbnails sintéticos por formato)
- Cada thumbnail mostra ícone do formato + título `Post de 2026-04-15 · carrossel`
- Agrupar visualmente por formato dominante primeiro
- Manter `formatBreakdown` para stats line e headline (dados agregados)
- Normalizar `type` do adapter para as chaves visuais existentes

### Testes

- Actualizar assinaturas se `DayEntry` mudar
- Garantir que helpers exportados mantêm a mesma lógica

## Sem alterações a

- Backend, adapter, API, base de dados, tokens globais, outros blocos, admin

## Validação

- `tsc --noEmit`
- `bunx vitest run`
- Verificar desktop, 720px e 375px — sem overflow horizontal
