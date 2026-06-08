## Leituras IA em cards Profile vs Concorrente — arquitetura

Objetivo: adicionar uma "Leitura IA" curta, editorial e fundamentada em evidência por card, sem chamar IA no render nem no cliente, e sem aumentar custo Apify.

---

### 1. Recommended architecture (alto nível)

- **Geração single-shot, batched, server-side**, disparada **uma vez por comparação** (par `primary × competitor × window × snapshot_id`).
- Roda no **server (TanStack `createServerFn` ou job assíncrono)**, nunca no browser, nunca no render.
- Resultado normalizado em JSON estrito, persistido, com cache idempotente.
- UI lê do cache; se falhar, mostra fallback determinístico já existente. Nunca bloqueia o render do report.

Modo de execução recomendado: **assíncrono via enrichment job** (mesma infra dos jobs já existentes), com fallback síncrono on-demand atrás de um botão "Gerar leituras IA" para o admin enquanto valida qualidade.

---

### 2. Data flow

```text
Apify snapshot (ready)
   │
   ▼
normalized_payload (primary + competitor)
   │
   ├── deterministic adapters (já existem) ──► cards renderizam métricas + bars + donuts
   │
   ▼
ai_comparison_reader (serverFn / job)
   │  input: compact evidence pack (ver §4)
   │  model: google/gemini-3-flash-preview
   │  output: ComparisonAIReadings JSON (todos os cards de uma vez)
   ▼
comparison_ai_insights (nova tabela)
   │  key: (primary_handle, competitor_handle, window, snapshot_id, model_version, prompt_version)
   ▼
serverFn getComparisonReadings({ primary, competitor, window })
   ▼
<LeituraIA cardId="..." /> dentro de cada CompareCardShell
```

---

### 3. Respostas às perguntas

**(1) Campos do snapshot que podem alimentar a IA com segurança**
Todos vindos do `normalized_payload` já existente — nada de nova chamada Apify:
- profile metadata: handle, displayName, biography, followers, following, postsCount, isVerified, externalUrl
- posts (top N por engagement, máx ~15 por lado): type (image/video/carousel), timestamp ISO, likeCount, commentCount, caption (truncada 280 chars), hashtags (até 8), mentions (até 4), thumbnailUrl (apenas presença, não enviar URL ao modelo)
- agregados já calculados: avgLikes, avgComments, engagementRate, weekdayCountsIso, formatStats, postingCadencePerWeek, peakDay, hashtag top-N, mention top-N
- competitor: o mesmo conjunto, com `hasFormatStats` / `hasWeekdayData` flags
- **Não enviar**: emails, telefones, URLs de thumbnails, follower lists, qualquer PII além do que é público no perfil

**(2) Ordem de adoção dos cards**
Fase 1 (maior valor editorial, dados ricos): `overview-hero`, `engagement`, `cadence`, `mix-formatos`
Fase 2: `weekday-rhythm`, `bio-conversion-path`
Fase 3: `publicacoes-chave`, `hashtags`, `comment-intelligence`

**(3) Quando gerar**
**Uma vez por comparação paga** (`primary × competitor × window × snapshot_id`), assíncrono via enrichment job, com regeneração explícita só pelo admin ou ao mudar `prompt_version` / `model_version`. **Não** on-demand por card no cliente.

**(4) Onde guardar**
Tabela nova **`comparison_ai_insights`** — separa preocupações de `normalized_payload` (Apify) e `ai_insights_v2` (insights single-profile). Permite invalidar/regenerar sem mexer no snapshot.

Schema sugerido:
```text
comparison_ai_insights
  id uuid pk
  primary_handle text
  competitor_handle text
  window text                  -- ex: '30d','90d'
  snapshot_id uuid             -- snapshot primary usado
  competitor_snapshot_id uuid
  model text                   -- ex 'google/gemini-3-flash-preview'
  model_version text
  prompt_version text          -- ex 'v1'
  readings jsonb               -- ComparisonAIReadings (ver §6)
  evidence_hash text           -- sha256 do evidence pack
  cost_estimate_cents numeric
  tokens_in int, tokens_out int
  status text                  -- 'ready' | 'failed' | 'pending'
  error text
  created_at, updated_at
  unique (primary_handle, competitor_handle, window, snapshot_id, competitor_snapshot_id, model, prompt_version)
```

**(5) Cache / idempotency key**
`(primary_handle, competitor_handle, window, snapshot_id, competitor_snapshot_id, model, prompt_version)` + verificação por `evidence_hash` (se o evidence pack hash bate, devolve cache mesmo que o snapshot_id mude por reanálise trivial).

**(6) Output schema (JSON estrito, validado com Zod)**
```ts
ComparisonAIReadings = {
  version: "1",
  generated_at: string,           // ISO
  language: "pt-PT",
  global_summary: {
    headline: string,             // máx 90 chars
    key_reading: string,          // 1–2 frases
    confidence: "low"|"medium"|"high",
  },
  cards: Array<{
    card_id:
      | "overview-hero"
      | "engagement"
      | "cadence"
      | "mix-formatos"
      | "weekday-rhythm"
      | "bio-conversion"
      | "publicacoes-chave",
    headline: string,             // máx 80 chars, sentence case
    key_reading: string,          // 2–3 frases, PT-PT
    evidence_points: Array<{
      label: string,              // ex "Cadência semanal"
      field: string,              // chave canónica no evidence pack
      primary_value: string|number|null,
      competitor_value: string|number|null,
    }>,                           // 2–4 itens, todos referenciando o evidence pack
    recommendation: string|null,  // 1 frase acionável; null se amostra insuficiente
    confidence: "low"|"medium"|"high",
    caveats: string[],            // ex ["amostra<10 posts","sem dados do concorrente"]
  }>
}
```

**(7) Anti-hallucination**
- Modelo recebe **apenas o evidence pack** (JSON compacto e nomeado), não snapshot bruto.
- `Output.object` com Zod schema acima — qualquer claim numérico tem de aparecer em `evidence_points.{primary,competitor}_value`.
- Validador server-side: rejeita resposta se `evidence_points[].field` não existir no evidence pack, ou se `primary_value`/`competitor_value` divergirem do pack (comparação exata para números/strings canónicas).
- Se dados em falta de um lado: `confidence="low"`, `recommendation=null`, `caveats` obrigatório. Não permitir frases inventadas sobre o lado em falta.
- Linguagem PT-PT explícita no system prompt; proibir superlativos não suportados.

**(8) Controle de custo**
- **Uma chamada por comparação** que devolve todos os cards (Fase 1: 4 cards).
- Modelo: `google/gemini-3-flash-preview` (default Lovable AI), `max_tokens` ≈ 1200 out, evidence pack ≈ 2–3k tokens in.
- Cache forte por `evidence_hash`. Regeneração só com bump de `prompt_version`/`model_version`.
- Gate por plano: gerar só em comparações pagas (já é o caso); admin tem botão manual.
- Log de custo em `provider_call_logs` (fonte única já existente).

**(9) Exposição na UI**
- Caixa **"Leitura IA"** dentro de cada `CompareCardShell`, abaixo do conteúdo determinístico, com eyebrow `● LEITURA IA` (accent), headline (Inter SemiBold), `key_reading`, chip de `confidence`, e linha de `caveats` em `text-content-tertiary`.
- **Executive summary** (`global_summary`) no topo do report, acima dos cards de comparação.
- `recommendation` mostrado como sub-bloco discreto, prefixo "Sugestão:".
- Estado de loading: skeleton; estado vazio: esconde a caixa (não inventa texto).

**(10) O que continua determinístico (NÃO usar IA)**
- Todos os números, percentagens, contagens, ratios, eixos de gráficos, chips de pico, donuts, bars, sample size, peak day, weekday counts, format mix, hashtag/mentions top-N.
- Estado "sem dados" e fallbacks.
- Cor/acentos de cada lado, ordenação, classificação Pro vs Free.
A IA só interpreta e narra; nunca substitui o cálculo.

---

### 4. Evidence pack (input para o modelo)

JSON compacto, ~2–3k tokens, construído por um adapter `buildComparisonEvidence(primary, competitor, window)`:

```ts
{
  window: "30d",
  primary:   { handle, displayName, bio, followers, postsCount,
               avgLikes, avgComments, engagementRate,
               cadencePerWeek, peakDay, formatMix:{image,video,carousel},
               weekdayCountsIso, topHashtags:[...], topMentions:[...],
               recentPosts:[{type, isoDay, likes, comments, captionShort, hashtags}] },
  competitor:{ ...same, hasFormatStats, hasWeekdayData },
  deltas:    { followers_pct, engagementRate_pct, cadence_diff, peakDay_match }
}
```

Tudo o resto fica fora.

---

### 5. Prompt template

System:
```
És um analista editorial de Instagram. Escreves em português europeu, tom credível e prático, sem superlativos.
Recebes um EVIDENCE PACK com métricas comparativas entre PERFIL e CONCORRENTE.
Regras absolutas:
- Usa apenas valores presentes no EVIDENCE PACK. Nunca inventes números, datas, ou factos.
- Cada card tem de ter 2–4 evidence_points cujos field/value vêm literalmente do pack.
- Se faltar dado de um lado: confidence="low", recommendation=null, e adiciona caveat.
- Não comentes thumbnails, identidades pessoais, ou conteúdo não presente.
- Devolve estritamente o schema JSON pedido. Sem markdown, sem texto fora do JSON.
```

User:
```
EVIDENCE_PACK:
<json>

Gera ComparisonAIReadings v1 para os cards: overview-hero, engagement, cadence, mix-formatos.
```

Saída forçada via AI SDK `Output.object({ schema: ComparisonAIReadingsZod })`.

---

### 6. Fases de implementação

**Fase 0 — Aprovação (esta).** Sem código.

**Fase 1 — Foundation (server-only).**
- Migration: tabela `comparison_ai_insights` + GRANTs + RLS.
- `buildComparisonEvidence()` adapter (puro, testado, sem chamadas externas).
- Zod schema `ComparisonAIReadings`.
- `createServerFn generateComparisonReadings({ primary, competitor, window })` com middleware auth, cache por `evidence_hash`, log em `provider_call_logs`.

**Fase 2 — Integração com job de enriquecimento.**
- Disparar `generateComparisonReadings` após snapshot pronto, atrás de feature flag `AI_READINGS_ENABLED`.
- Admin: botão "Regenerar leituras IA" + diagnóstico (tokens, custo, status, evidence_hash).

**Fase 3 — UI Fase 1 (4 cards).**
- `useComparisonReadings(primary, competitor, window)` (TanStack Query).
- Componente `<LeituraIA cardId=... />` dentro de `CompareCardShell` em overview-hero, engagement, cadence, mix-formatos.
- `<ExecutiveSummary />` no topo do report.
- Skeleton + estado vazio (esconde quando não existe).

**Fase 4 — Expansão.**
- Adicionar cards Fase 2 e 3 ao schema/prompt e à UI.
- A/B de `prompt_version` v2.

**Fase 5 — Qualidade.**
- Validador automático que recusa respostas com claims não suportados.
- Painel admin de auditoria das últimas N leituras (preview side-by-side com evidence pack).

---

### 7. Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Hallucination numérica | Validador server compara `evidence_points` com pack; resposta inválida descartada e marcada `failed`. |
| Custo descontrolado | Single-shot por comparação + cache por `evidence_hash` + feature flag + log em `provider_call_logs`. |
| Latência no report | Geração assíncrona; UI esconde caixa até existir; nunca bloqueia render. |
| Dados parciais (concorrente sem formatStats) | Schema obriga `caveats` + `confidence=low` + `recommendation=null`. |
| Drift de tom / qualidade | `prompt_version` versionado; regeneração controlada; admin review. |
| PII / privacidade | Evidence pack só com campos públicos; thumbnails URLs nunca enviados ao modelo. |
| Mudança de schema do snapshot | Adapter `buildComparisonEvidence` é o único acoplamento; testes unitários. |

---

### 8. O que NÃO construir agora

- IA no cliente, IA em render, IA por card on-demand.
- Streaming de tokens na UI do report.
- Chamadas Apify adicionais para "enriquecer" a IA.
- Sumários longos, multi-parágrafo, ou "chat com o report".
- Tradução multi-idioma (fica PT-PT).
- Edição manual de leituras pelo user.
- Geração para Free tier.
- Leituras IA em `/report.example` (continua mockup editorial).
