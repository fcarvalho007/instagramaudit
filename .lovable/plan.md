## Objetivo

Adicionar uma página dedicada **"Sinais de mercado"** ao PDF público quando `normalized_payload.market_signals_free` existe e tem dados utilizáveis. Quando ausente ou não-utilizável, a página é omitida silenciosamente. **Zero** chamadas a DataForSEO, OpenAI, Apify ou Instagram durante a geração do PDF — apenas leitura do snapshot.

## Ficheiros a editar (nenhum locked)

- `src/lib/pdf/render.ts` — declarar `market_signals_free?: unknown` no `NormalizedSnapshotPayload`, criar `deriveMarketSignals(...)` puro, passar resultado ao `ReportDocument`.
- `src/lib/pdf/report-document.tsx` — novo `MarketSignalsForPdf` interface, novo componente `MarketSignalsPage`, render condicional dentro de `_ReportDocumentImpl`.
- `src/lib/pdf/styles.ts` — adicionar estilos da nova página (cards, chip de tendência, source note).

Sem tocar em `provider logic` (`/lib/dataforseo/*`, `/lib/market-signals/cache.ts`), `/report/example`, UI, OpenAI prompt/validator ou schema.

## Forma do dado lido (puro, defensivo)

`market_signals_free` foi persistido pelo `cache.ts` com a forma `PersistedMarketSignals`. O PDF declara o tipo de forma loose e valida com type-guards (igual ao padrão usado para `ai_insights_v1`):

```ts
interface MarketSignalsForPdf {
  strongest: string;             // keyword com maior média
  trend: "up" | "flat" | "down"; // direção da série mais forte
  usableKeywords: string[];      // chips visíveis
  droppedKeywords: string[];     // chips dim
  pointCount: number;            // # pontos válidos na série forte
}
```

O helper `deriveMarketSignals` em `render.ts`:

1. Devolve `null` se `raw` não é objecto, ou se `status` não é `"ready"|"partial"`, ou se não há `trends_usable_keywords`/`trends`.
2. Escolhe `strongest` pela média mais alta entre as séries usable (mesma heurística que o componente web — duplicada localmente para manter `pdf/*` puro e independente do componente React).
3. Calcula `trend` comparando média 1ª metade vs 2ª metade da série forte: ≥+10% → "up", ≤-10% → "down", caso contrário "flat". Se a série tem < 4 pontos válidos, devolve "flat".
4. Devolve `null` se não conseguir um `strongest`.

## Página PDF

`MarketSignalsPage` segue o padrão visual existente (header, sectionTitle, sectionHeading, sectionLead, footer fixo). Layout dentro da página:

```text
[ MERCADO · DATAFORSEO ]               (sectionTitle, accent)
Sinais de mercado                      (sectionHeading)
"Temas associados ao perfil com procura observável fora do Instagram."

┌─────────────────────────────────────────────────────────────┐
│ TEMA COM MAIOR SINAL                                         │
│   <strongest>                                                │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────┐
│ PALAVRAS-CHAVE ANALISADAS│ TENDÊNCIA                        │
│ <usable.length>          │ ▲ Em alta / ● Estável / ▼ Em queda│
│ X com sinal · Y sem volume│  (cor positiva/neutra/negativa)  │
└──────────────────────────┴──────────────────────────────────┘

O QUE ISTO SUGERE
  <frase determinística composta a partir de strongest + trend>

[Chips usable, accent]   [Chips dropped, muted]   (só se existirem)

— Fonte: DataForSEO / Google Trends. Leitura editorial, não previsão.
```

Frases determinísticas (mesma lógica que o componente web):
- `up` → `Existe procura crescente por «<strongest>». Reforçar conteúdo sobre este tema nas próximas semanas.`
- `down` → `A procura por «<strongest>» tem perdido força. Avaliar diversificação de temas.`
- `flat` → `«<strongest>» mantém procura estável fora do Instagram. Consolidar autoridade neste tema.`

Tendência sem ícones Unicode complicados — usar texto + cor:
- "Em alta" → `PDF_COLORS.positive`
- "Em queda" → `PDF_COLORS.negative`
- "Estável" → `PDF_COLORS.inkSoft`

## Posição na ordem das páginas

Sequência actual:

1. CoverPage
2. ProfileMetricsPage
3. BenchmarkPage *(condicional)*
4. CompetitorsPage *(condicional)*
5. TopPostsPage *(condicional)*
6. AiInsightsPage *(condicional)*
7. RecommendationsPage *(condicional)*

Nova posição: **entre Benchmark e Competitors** (logo após o posicionamento, antes de mergulhar em concorrentes/conteúdo). Quando `aiInsights` está presente, "Leitura estratégica" continua a vir depois de Top Posts e ainda assim referencia Market Signals via narrativa — a sequência mantém a leitura coerente: posicionamento → mercado → comparação → conteúdo → leitura editorial → próximos passos.

Sequência final:

1. CoverPage
2. ProfileMetricsPage
3. BenchmarkPage
4. **MarketSignalsPage** *(NOVA, condicional)*
5. CompetitorsPage
6. TopPostsPage
7. AiInsightsPage
8. RecommendationsPage

## Estilos novos em `styles.ts`

```ts
marketHeroCard: { borderWidth, borderColor, borderRadius, padding, marginBottom }
marketHeroLabel: { fontSize 8, uppercase, letterSpacing, inkMuted }
marketHeroValue: { Helvetica-Bold, fontSize 22, accent }
marketRow: { flexDirection: "row", gap: 12, marginBottom }
marketCell: { flex: 1, surfaceAlt, padding, borderRadius, borderLeftWidth 2, borderLeftColor accent }
marketCellLabel / marketCellValue / marketCellHint
marketTrendUp / marketTrendDown / marketTrendFlat (color overrides)
marketSuggestionLabel / marketSuggestionBody
marketChipsRow / marketChipUsable / marketChipDropped
marketSourceNote: { fontSize 8, italic, inkMuted, marginTop }
```

Sem ASCII de subscripts — só texto e setas Unicode básicas (▲ ▼ ●) **só** se renderizarem com Helvetica padrão; **decisão pragmática**: usar palavras (`Em alta`, `Em queda`, `Estável`) sem ícones para evitar o problema documentado dos glyphs em Helvetica embutida.

## Validação

- `bunx tsc --noEmit` — verde.
- `bun run build` (corre pelo harness).
- QA com snapshot real:
  - **Com** `market_signals_free` no payload (handle de teste já tem cache 24h depois do prompt anterior) → gerar PDF via endpoint `/api/public/public-report-pdf` (já existente), abrir o ficheiro, confirmar a página entre Benchmark e Competitors, com strongest, contagens, tendência colorida, frase, chips e source note.
  - **Sem** `market_signals_free` → mesmo endpoint, confirmar que o PDF não estoira e a nova página é omitida.
- QA visual: converter PDF para imagens (`pdftoppm -jpeg -r 150`) e inspeccionar a página inteira — verificar overflow, contraste, alinhamento dos cards, ausência de glyphs partidos.

## Garantias

- `renderReportPdf` continua a só ler do snapshot — nenhum import novo a `dataforseo/*` ou `market-signals/cache.ts` (o tipo é declarado loose localmente).
- Sem chamadas a DataForSEO, OpenAI, Apify ou Instagram durante geração do PDF.
- Quando o snapshot tem `status: "disabled"`, `"blocked"`, `"no_keywords"`, `"timeout"`, `"error"`, ou simplesmente não tem o campo, `deriveMarketSignals` devolve `null` e a página não é renderizada.
- `/report/example` intocado.
- Provider logic, schema, RLS, OpenAI prompt e validator intocados.

## Checkpoint

- ☐ `render.ts` ganha `market_signals_free?: unknown` e helper puro `deriveMarketSignals` que devolve `MarketSignalsForPdf | null`.
- ☐ `report-document.tsx` exporta `MarketSignalsForPdf` e renderiza `MarketSignalsPage` condicionalmente entre Benchmark e Competitors.
- ☐ `styles.ts` ganha estilos da nova página (sem hardcode de cores fora do `PDF_COLORS`).
- ☐ Página tem título, subtítulo, strongest, contagens, tendência colorida, frase determinística, chips e source note exacta: "Fonte: DataForSEO / Google Trends. Leitura editorial, não previsão."
- ☐ Snapshot **sem** `market_signals_free` ou com status não-utilizável → PDF gera sem erros e omite a página.
- ☐ `bunx tsc --noEmit` verde; QA visual confirma layout limpo.
