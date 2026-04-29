## R3 · Reforço gráfico, KB nos insights e refinamentos finais do report

Três frentes em paralelo. Tudo aplicado a `/analyze/$username` (ReportShell real). O `/report/example` fica intacto.

---

### Parte 1 — Insights v2 chaveados por secção, alimentados pela KB

**Schema novo** (`ai_insights_v2`), coexiste com `v1` para snapshots antigos.

`src/lib/insights/types.ts` ganha:
```
interface AiInsightV2Item { emphasis: 'positive'|'negative'|'default'|'neutral'; text: string }
interface AiInsightsV2 {
  schema_version: 2; generated_at: string; model: string;
  source_signals: { inputs_hash: string; kb_version: string; has_market_signals: boolean };
  cost: { prompt_tokens; completion_tokens; total_tokens; estimated_cost_usd };
  sections: Record<'hero'|'marketSignals'|'evolutionChart'|'benchmark'|'formats'|'topPosts'|'heatmap'|'daysOfWeek'|'language', AiInsightV2Item>;
}
```

**Pipeline** (estende `generateInsights` em vez de criar edge function — alinhado com a arquitectura TanStack Start, evita duplicar gates de OPENAI_ALLOWLIST/cap diário/recordProviderCall):

1. `generateInsights(ctx, { mode: 'v2' })` aceita modo, carrega `getKnowledgeContext({ tier, format, vertical })` da KB (helper já existente).
2. Novo prompt em `src/lib/insights/prompt-v2.ts`: regras pt-PT já endurecidas + bloco `{kb_context_inject}` via `formatKnowledgeContextForPrompt(ctx)`.
3. Modelo: continua a ler `OPENAI_INSIGHTS_MODEL` (secret existente). Sem hardcode.
4. Output via `response_format: json_schema` com 9 chaves obrigatórias.
5. Validador novo `validate-v2.ts`: aplica `detectTechnicalLeak` (extraído de `validate.ts` para função reutilizável) + lista PT-BR + tradução de jargão a cada `text`.
6. `kb_version` = SHA-1 curto do `metadata.last_updated` da KB. Permite invalidação futura.

**Persistência e cache** (em `analyze-public-v1.ts`):
- Após snapshot base, gera v2 e persiste em `normalized_payload.ai_insights_v2`.
- v1 mantém-se para o bloco "Leitura estratégica" existente — não tocar.
- Regeneração só quando `inputs_hash` muda (snapshot novo) OU `kb_version` muda. Cache hits usam o v2 já guardado.

**Render**:
- `src/lib/report/snapshot-to-report-data.ts` mapeia `ai_insights_v2.sections` para o `reportData`.
- 9 secções-alvo passam a aceitar prop opcional `aiInsight?: { emphasis, text }` e renderizam um `InsightBox` compacto inline com a variante de cor já existente nos tokens light (`positive` → verde, `negative` → vermelho, `default` → azul, `neutral` → cinzento).

---

### Parte 2 — Reforço gráfico em 4 secções

**2.1 — Posicionamento (gauge + mini-histórico)**
- Nova server function `getProfileEngagementHistory({ handle, limit: 4 })` em `src/server/profile-history.functions.ts`. Lê `analysis_snapshots` ordenado por `created_at desc`, devolve `[{ analyzedAt, engagementPct, benchmarkPct }]`.
- `report-benchmark-gauge.tsx` recebe `history` opcional. Abaixo da gauge: 4 mini-barras horizontais empilhadas em mono pequeno + delta de tendência.
- Vazio (1ª análise): mensagem subtil "Histórico aparecerá após próximas análises".

**2.2 — Formato (barras duplas)**
- `report-format-breakdown.tsx`: substitui a barra única por par `Actual` vs `Bench.` empilhado. Cor adaptativa: actual abaixo → `#A32D2D`, acima → `#0F6E56`. Bench → `#B5D4F4`. Tudo via tokens em `tokens-light.css` (sem hardcode hex no JSX).

**2.3 — Hashtags & Captions**
- `report-hashtags-keywords.tsx`: cor única `accent-primary` (já é `#2563D9`, próximo de `#185FA5` — usar token existente, não introduzir nova cor).
- Largura proporcional ao **engagement**, não às frequências.
- Ordenação por `avgEngagement desc`.
- Linha mostra `5 usos · 0,15%` em mono pequeno.

**2.4 — Sparklines KPI hero**
- Não tocar — confirmado correcto no R1.

---

### Parte 3 — 5 refinamentos visuais

**A. Procura de mercado** — substituir grid 2x2 dos 4 cartões por uma `MarketStatsStrip` horizontal com 4 mini-stats separados por bordas verticais subtis. Componente novo em `src/components/report-market-signals/market-stats-strip.tsx`. Gráfico de evolução fica por baixo, com mais protagonismo.

**B. "Como este relatório foi feito"** — fundir `report-methodology.tsx` + `report-enriched-benchmark-source.tsx` num único cartão. Os 4 cartões internos passam a fundo `surface-muted` (sutil), e a linha "FONTE E METODOLOGIA · DATASET v1.0-2026-04" + texto explicativo entram como `footer-row` dentro do mesmo cartão.

**C. "Levar este relatório"** (`report-final-block.tsx`) — simplificar:
- Remover header duplicado "PARTILHAR COM A TUA REDE".
- 3 botões em linha horizontal: `[Pedir versão PDF →]` `[Copiar link]` `[Partilhar no LinkedIn]`.
- Subtítulo único: `PDF inclui todas as secções · Link público activo durante a fase beta`.

**D. Feedback beta** — promover de bloco interno do `ReportFinalBlock` para banner full-width acima do footer. Componente novo `src/components/report-beta/feedback-banner.tsx`. Fundo `surface-muted`, border `border-default`, badge `BETA` + CTA `Enviar email →`.

**E. Footer comercial** — eliminar o primeiro bloco "PRÓXIMO NÍVEL → O que muda no relatório completo" (com 3 bullets) e manter apenas a versão completa em 2 colunas + citação. Localizar e remover a duplicação em `src/components/report-redesign/` ou `report-share/` consoante o ficheiro real (a confirmar na implementação).

---

### Especificações técnicas

- **Tokens**: novas cores (#A32D2D, #0F6E56, #B5D4F4) entram em `src/styles/tokens-light.css` como `--bench-actual-below`, `--bench-actual-above`, `--bench-reference`. Atualizar memória `report-light-tokens`.
- **Server function nova**: `src/server/profile-history.functions.ts` (`getProfileEngagementHistory`). Lê via `supabaseAdmin` (perfis públicos, sem RLS por user). Validação Zod no input (`handle` regex `^[a-z0-9._]{1,30}$`).
- **Sem novas tabelas**, sem migrações. Apenas escrita adicional em `analysis_snapshots.normalized_payload.ai_insights_v2`.
- **Cap diário OpenAI**: continua o mesmo (`OPENAI_DAILY_CAP_USD`). v2 + v1 partilham o cap — duplica chamadas, mas o gate protege contra runaway.

### Ficheiros tocados

Novos: `prompt-v2.ts`, `validate-v2.ts`, `profile-history.functions.ts`, `market-stats-strip.tsx`, `feedback-banner.tsx`.
Editados: `types.ts`, `openai-insights.server.ts`, `analyze-public-v1.ts`, `snapshot-to-report-data.ts`, `report-benchmark-gauge.tsx`, `report-format-breakdown.tsx`, `report-hashtags-keywords.tsx`, `report-methodology.tsx`, `report-enriched-benchmark-source.tsx`, `report-final-block.tsx`, `report-shell.tsx`, `tokens-light.css`, `mem://design/report-light-tokens`.

### Não fazer
- Não criar Supabase Edge Function (TanStack Start usa server functions).
- Não tocar em `/admin` (R2 completo).
- Não tocar em `/report/example` (LOCKED).
- Não tocar no PDF export, no header de navegação, no v1 dos insights.
- Não introduzir cores fora da paleta R1 (excepto os 3 tokens de bench bars).

### Checkpoint final

- ☐ `ai_insights_v2` gerados com KB injectada
- ☐ Cache: regeneração só por `inputs_hash` ou `kb_version`
- ☐ 9 secções com `InsightBox` inline
- ☐ Gauge com mini-histórico de 4 análises (real ou placeholder)
- ☐ Cartões de formato com barras duplas Actual/Bench
- ☐ Hashtags ordenadas por engagement, cor única
- ☐ Procura de mercado em strip horizontal
- ☐ "Como foi feito" em cartão único
- ☐ "Levar este relatório" com 3 botões
- ☐ Feedback beta como banner antes do footer
- ☐ Footer comercial sem duplicação
- ☐ `bunx tsc --noEmit` limpo
