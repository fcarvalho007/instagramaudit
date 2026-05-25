## Auditoria — Texto editorial do Card 1 (Block 1) do relatório público

Auditoria read-only. Nenhuma alteração efectuada. Sem chamadas a OpenAI/Apify, sem mutações em Supabase.

---

### 1. Qual chamada OpenAI alimenta o card

O texto do primeiro card vem **exclusivamente** do bloco `ai_insights_v2`, secção `hero`.

- Gerador: `generateInsightsV2()` em `src/lib/insights/openai-insights.server.ts:468`.
- Pipeline: `src/lib/enrichment/run-enrichment.server.ts:400` chama `generateInsightsV2` e persiste o resultado em `analysis_snapshots.normalized_payload.ai_insights_v2`.
- Modelo: `OPENAI_INSIGHTS_MODEL` (default `DEFAULT_OPENAI_MODEL`), `temperature: 0.4`, `response_format: json_schema strict`, schema `RESPONSE_JSON_SCHEMA_V2` (`src/lib/insights/prompt-v2.ts:168`).
- Persistência: campo `sections.hero = { emphasis, text }`, com `text` ≤ 240 chars.

O bloco `ai_insights_v1` (`generateInsights`) ainda é gerado em paralelo (linha 352 do enrichment) mas alimenta um sítio diferente ("Leitura estratégica" / cartões longos), **não** o card 1.

### 2. Caminho até ao componente

```
analysis_snapshots.normalized_payload.ai_insights_v2.sections.hero
  → buildAiInsightsV2()                 src/lib/report/snapshot-to-report-data.ts:868
  → ReportEnriched.aiInsightsV2.sections.hero
  → ReportOverviewBlock                  src/components/report-redesign/v2/report-overview-block.tsx:113
        aiHeroText      = enriched.aiInsightsV2?.sections.hero?.text
        aiHeroEmphasis  = enriched.aiInsightsV2?.sections.hero?.emphasis
  → EditorialIdentityCard                src/components/report-redesign/v2/overview/editorial-identity-card.tsx
        deriveCopyFromAi() (linha 98)    título + parágrafo
```

`report_snapshots.report_payload_jsonb` é construído por `build-report-snapshot-payload.server.ts` a partir do mesmo `normalized_payload`, pelo que o card lê sempre o `hero.text` produzido pela v2.

### 3. Fallback determinístico

Em `editorial-identity-card.tsx`:

- Se `aiHeroText` está ausente/nulo → `buildFallbackCopy()` (linha 57) escolhe uma de 5 cópias estáticas, **com base apenas nos scores `envolvimento/frequencia/interaccao`** (i18n key `identity.fallback.*`). É daqui que sai literalmente "Audiência existe, falta direção" / "no_direction" / "cadence_no_signal" — não vem da IA, vem de templates estáticos quando a IA falha, está em cache antiga sem secção hero, ou o handle não está na allowlist.
- Os bullets "O que funciona / O que limita" (`deriveSignals`, linha 228) são **100% determinísticos** e usam `postingFrequencyWeekly`, `dominantFormatShare`, `engagementDeltaPct`, etc. — não veem o texto da IA.

### 4. Input enviado à OpenAI para o hero

`buildInsightsV2UserPayload` reutiliza `buildInsightsUserPayload` (`src/lib/insights/prompt.ts:~380`). Payload que o modelo vê:

| Eixo | Recebido | Detalhe |
|---|---|---|
| Engagement rate vs benchmark | Sim | `content_summary.average_engagement_rate`, `benchmark.{benchmark_value_pct, profile_value_pct, difference_pct, position, tier_label}` |
| Follower tier | Sim | `profile.followers_count` + bloco KB (tier resolvido em `tierFromFollowers`) + `REFERÊNCIAS DE BENCHMARK` injectado no system prompt |
| Cadência recente | **Parcial** | Apenas `content_summary.estimated_posts_per_week` (média global do sample, não janela 30d/90d). A v3 da cadência (`computeCadence`) corre só no adapter de report — o modelo não recebe `method`, `windowDays`, `sufficient` |
| Sample quality | **Parcial** | `content_summary.posts_analyzed` enviado; mas não sufficient flag nem o aviso "amostra recente insuficiente" |
| Comments per post | Sim | `content_summary.average_comments` |
| Likes per post | Sim | `content_summary.average_likes` |
| Best/worst posts | Parcial | `top_posts[0..2]` (cap 3), só os top por engagement — não recebe worst |
| Format mix | Parcial | Só `dominant_format` (sem percentagens por formato) |
| Caption semantic | **Não** | Só `caption_excerpt` truncado a 240 chars no top_posts; sem análise temática/tom |
| Visual cover | **Não** | Inexistente no pipeline |
| Competitor context | Parcial | `competitors_summary.count` + `median_engagement_pct` + `editorial_patterns.format_vs_competitors` quando presente |
| Market/search signals | Sim | `market_signals.*` (free/paid, keywords, trend) |
| Knowledge Base | Sim | `formatKnowledgeContextForPrompt` + `formatBenchmarkContextForPrompt` no system prompt |
| Editorial patterns (R5) | Sim | `engagement_trend`, `caption_length`, `hashtag_count`, `collaboration_lift`, `comments_to_likes_ratio`, `market_demand_content_fit`, `format_vs_competitors` |

### 5. Prompt para o hero (estado actual)

Em `prompt-v2.ts:67` o slot `"hero"` pede:

> «leitura editorial de abertura … combinar OBRIGATORIAMENTE três sinais: (1) envolvimento médio + posição face ao tier, (2) ritmo semanal real (`estimated_posts_per_week`), (3) formato dominante OU tema recorrente das captions. … Máx. 240 chars.»

Limitações:

1. Texto único `≤ 240 chars` numa só string — não há título separado, nem síntese, nem campos accionáveis. O componente tenta dividir a primeira frase como "hook/título" (`deriveCopyFromAi`, regra ≤10 palavras sem dígito) — frágil e dependente do modelo escrever uma abertura curta.
2. Sem campo `verdict_band` ou `confidence` → o card tem de inferir banda pelo score determinístico (`bandFor`) que pode contradizer o texto da IA.
3. O ritmo enviado é `estimated_posts_per_week` calculado **upstream** (média geral do sample) — não a cadência v3 (`window_30d`, `sufficient`). Se a cadência v3 disser "insuficiente" mas o sample-span antigo der 0,2/semana, o modelo recebe 0,2 e pode escrever "ritmo fraco" mesmo quando há actividade recente.
4. Nenhuma guardrail no validador (`validate-v2.ts`) que impeça a IA de contradizer métricas — só verifica forma, comprimento e blacklist linguística.

### 6. Output do hero — está estruturado?

Estruturado em forma (`{ emphasis, text }`) mas **não em conteúdo editorial**: tudo (diagnóstico + recomendação + número + ângulo) vive numa única string ≤240 chars. O `EditorialIdentityCard` ainda re-parte essa string para extrair título e parágrafo via regex.

### 7. Resposta directa às perguntas

1. **Que chamada?** `generateInsightsV2()` → `sections.hero`.
2. **Que input?** payload de `buildInsightsUserPayload` (perfil, content_summary, top_posts até 3, benchmark, competitors_summary, market_signals, editorial_patterns) + system prompt v2 com KB + benchmark contextual.
3. **A IA vê o quê?** Ver tabela §4. Lacunas: cadência v3 real, format mix com %, worst posts, análise semântica de captions, visuals.
4. **Pede veredicto estratégico?** Pede uma frase editorial + recomendação, mas em 240 chars e sem campos separados — funciona como micro-insight, não como veredicto executivo.
5. **Output estruturado?** Estruturado mínimo (`emphasis`, `text`); o card faz parsing heurístico para separar título de parágrafo.
6. **Guardrails contra contradizer métricas?** Não. `validate-v2.ts` valida forma, comprimento, AO90, blacklist — mas não cruza o texto com os números do payload.
7. **Card usa IA directa ou fallback?** Híbrido: usa `aiHeroText` para título+parágrafo via `deriveCopyFromAi`; se ausente, cai em `buildFallbackCopy` (5 templates). Os bullets, score, banda e MetricsStrip são **sempre determinísticos**.
8. **Duplica KPIs visíveis?** O texto da IA pode duplicar (likes/comments/cadência são visíveis no MetricsStrip logo abaixo). A IA não recebe instrução para evitar duplicar.
9. **Onde deve viver o novo veredicto?** Recomendação: novo campo `ai_insights_v2.editorial_verdict` (objecto estruturado), paralelo a `sections` e `priorities`, persistido no mesmo blob (mesma chamada OpenAI).
10. **Conseguimos sem nova chamada paga?** Sim. Basta estender `RESPONSE_JSON_SCHEMA_V2` com o objecto `editorial_verdict` e ajustar o system prompt para o devolver no mesmo turno. Custo marginal: ~100-200 completion tokens extra (~$0.0005 por relatório). Sem segunda chamada.

### 8. Gaps identificados

- **Cadência**: a IA recebe `estimated_posts_per_week` calculado upstream com a lógica antiga. Deve receber também `cadence.weekly`, `cadence.method` (`window_30d`/`window_90d`/`sample_span`/`insufficient`) e `cadence.sufficient` para escrever sobre o ritmo sem alucinar quando o sample é fraco.
- **Format mix**: o modelo só vê `dominant_format`. Falta `dominant_format_share`, distribuição completa.
- **Worst posts / outliers**: só top 3 por engagement.
- **Title vs paragraph**: não há separação no schema → parsing heurístico no componente.
- **Verdict band / confidence**: não há campo dedicado → discrepância potencial entre texto da IA e badge calculada por scores.
- **Anti-duplicação**: sem instrução para não repetir likes/comments/cadência já mostrados no MetricsStrip.
- **Fallback**: 5 templates estáticos baseados só em scores → produz frases como "Audiência existe, falta direção" sempre que IA falha ou cache está stale sem `ai_insights_v2`.

### 9. Recomendação (apenas plano — não implementar agora)

**Novo campo estruturado em `ai_insights_v2.editorial_verdict`:**

```jsonc
"editorial_verdict": {
  "headline": "≤ 60 chars, sem ponto final, hook editorial",
  "diagnosis": "1 frase ≤ 220 chars: o quê + porquê com números",
  "recommendation": "1 frase ≤ 180 chars, infinitivo impessoal",
  "band": "solid" | "developing" | "warning",
  "confidence": "alta" | "media" | "baixa",
  "evidence": ["content_summary.average_engagement_rate", "cadence.method", ...]
}
```

**Implementação proposta (próximo prompt, Build Mode):**

1. Adicionar `cadence` (weekly/method/sufficient/windowDays) ao `InsightsContext` e ao `buildInsightsUserPayload`.
2. Adicionar `dominant_format_share` + distribuição por formato ao `content_summary` enviado.
3. Estender `RESPONSE_JSON_SCHEMA_V2` com `editorial_verdict` (required) — mesma chamada, +~150 tokens completion.
4. Estender system prompt: secção "Veredicto editorial" com regras de não-duplicação de KPIs e mapeamento `band` ↔ envolvimento real.
5. Estender `validate-v2.ts` com guardrails cruzados (band coerente com `engagement_delta_pct`; recommendation distinta de qualquer `priorities[].title`).
6. `EditorialIdentityCard` passa a consumir `editorial_verdict.headline` + `.diagnosis` + `.recommendation` + `.band` (deprecar parsing heurístico). Fallback determinístico mantém-se apenas como rede de segurança.
7. Invalidação: bump `kb_version` ou adicionar contador ao `inputs_hash` para forçar regenerar v2 em snapshots existentes na próxima request.

### 10. Riscos e casos de teste

**Riscos**
- Snapshots existentes não têm `editorial_verdict` → necessário fallback gracioso ou regeneração on-demand (sem regerar todos hoje).
- Aumento de tokens completion (~$0.0005/relatório) — dentro do daily cap actual de $5.
- Schema strict pode rejeitar respostas → manter fallback determinístico até observar 50+ runs limpos.

**Casos de teste a adicionar (sem chamar IA — fixtures)**
- `validate-v2` aceita verdict bem-formado.
- `validate-v2` rejeita: `band=solid` quando `engagement_delta_pct < -30`.
- `validate-v2` rejeita: `recommendation` que duplica `priorities[0].title`.
- `snapshot-to-report-data` mapeia `editorial_verdict` para `ReportEnriched`.
- `EditorialIdentityCard`: render com verdict completo, sem verdict (fallback), verdict parcial.
- `cadence.method = insufficient` → IA recebe flag e fixture verifica que o validador rejeita texto com "ritmo fraco/forte" sem `sufficient=true`.

---

**Próximo passo sugerido:** abrir um novo prompt em Build Mode com escopo restrito: extensão do schema v2 com `editorial_verdict`, sem tocar UI ainda — só pipeline e validação. UI muda num terceiro prompt depois de confirmarmos a qualidade do verdict gerado.
