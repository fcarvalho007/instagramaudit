# Auditoria — Enriquecimento Pago & Interpretação de Captions

> Modo Plan apenas. Nenhum ficheiro alterado. Nenhum provider chamado.

## TL;DR

- **Captions já chegam do Apify** no actor único `apify/instagram-scraper` (campo `latestPosts[].caption`). **Não é preciso um segundo actor** para captions.
- Captions são persistidas em `analysis_snapshots.normalized_payload.posts[].caption` e copiadas para `report_snapshots` (truncadas a 500/1000 chars). Competitor captions têm o mesmo tratamento.
- Free report: **0 jobs de enriquecimento criados**. Toda a análise determinística (hashtags, CTA, length, padrões editoriais) corre na ingestão e fica disponível em free.
- Paid report: 6 tipos de enrichment (`dataforseo`, `insights_v1`, `insights_v2`, `visual_cover`, `caption_semantic`, `comparison_readings`) só são enfileirados após entitlement.
- **Risco real**: `comparison_readings` usa Lovable AI Gateway diretamente, **sem `isOpenAiAllowed` / `OPENAI_ENABLED` / cap diário**. O gate de pagamento ainda protege, mas a defesa em profundidade está fraca neste caminho.
- Falta um padrão de "leitura IA por card" — hoje só existe leitura global (comparison) e análise batch de captions (caption_semantic), nada keyed por `post.id` nem por secção do report.

---

## 1. Existe um segundo actor Apify hoje?

**Não para captions.** Existem dois actors no codebase:

| Actor | Uso | Captions? |
|---|---|---|
| `apify/instagram-scraper` | Profile + competitors + `latestPosts[]` | ✅ Sim, via `latestPosts[].caption` |
| `apify/instagram-comment-scraper` | Comentários agregados (feature-flag `COMMENT_SCRAPER_ENABLED`) | n/a (comentários) |

Input enviado: `resultsType: "details"`, `resultsLimit`, opcional `onlyPostsNewerThan`. Sem parâmetro `fields` — o actor devolve o schema completo, incluindo `caption`, `hashtags` derivadas, `mentions`, `videoViewCount`, `coauthors`, `taggedUsers`, `locationName`, `musicInfo`, `videoDuration`.

## 2. Um segundo actor é necessário?

**Não.** O actor atual já entrega tudo o que estamos a usar e mais (ver auditoria de cobertura de dados anterior). Um segundo actor (ex.: `apify/instagram-post-scraper` por URL de post) só faria sentido se:
- precisássemos captions completas sem truncate de 2200+ chars (o actor de profile às vezes corta long captions),
- precisássemos comentários *raw* por post para análise semântica (já cobre o `comment-scraper`),
- ou precisássemos posts além dos últimos 12 (cenário improvável no MVP).

Recomendação: **não adicionar segundo actor** agora. Focar em explorar melhor o payload existente.

## 3. Matriz Free vs Paid (estado atual)

| Capacidade | Free | Paid |
|---|---|---|
| Apify scrape (profile + posts + competitors) | ✅ | ✅ |
| Captions, hashtags, mentions persistidas | ✅ | ✅ |
| Análise determinística (cadence, format, length buckets, CTA, keywords, hashtag perf) | ✅ | ✅ |
| Comment intelligence (agregado) | ✅ se flag ON (não gated por pagamento) | ✅ |
| DataForSEO tendências de mercado | ❌ skipped_free | ✅ |
| OpenAI `insights_v1` (leitura editorial global) | ❌ | ✅ |
| OpenAI `insights_v2` (leituras por secção) | ❌ | ✅ |
| OpenAI `visual_cover` (análise de thumbnails) | ❌ | ✅ |
| OpenAI `caption_semantic` (temas, intent, brand voice — batch) | ❌ | ✅ |
| Lovable AI `comparison_readings` (perfil vs concorrente) | ❌ | ✅ |
| Leitura IA por card / por post | ❌ | ❌ (não existe) |

Free fica com **toda** a análise determinística rica. Paid acrescenta camada IA + DataForSEO.

## 4. Captions — disponíveis vs usadas

**Disponíveis no snapshot:**
- `posts[].caption` (até 500 chars normalizer / 1000 chars report payload)
- `posts[].caption_length`, `hashtags[]`, `mentions[]` derivados
- `caption_semantic_analysis` (paid)

**Usadas hoje (determinístico):** extração de hashtags & mentions, buckets short/medium/long, deteção de CTA + perguntas, top keywords, padrões editoriais, opening/ending types no Caption Diagnostics, top-post `caption_excerpt` no contexto do prompt.

**Usadas hoje (IA paga):**
- `caption_semantic` envia conjunto de captions para `gpt-5.4-mini` → temas, intent, hook quality, brand voice (batch global).
- `insights_v2` recebe `caption_length.best_bucket`, top-post excerpts, padrões editoriais.
- `comparison_readings` recebe hashtags + padrões derivados de captions.

**Onde captions já não são usadas mas poderiam ser:**
- Não há leitura IA *por post* (caption + thumbnail + métricas combinadas).
- Não há leitura IA *por card* do report (Format, Weekday, Cadence, Engagement, Hashtags, Top Posts).
- CTA detection é regex simples; podia ter classificação IA (CTA forte/fraco/ausente).
- Sem deteção de "promessas vs payoff", tom (informativo, aspiracional, humor), público implícito.

## 5. Risco de chamadas IA acidentais em free

| Risco | Severidade | Detalhe |
|---|---|---|
| `comparison_readings` sem `isOpenAiAllowed` / `OPENAI_ENABLED` / cap diário | **Médio** | Único guard é `LOVABLE_API_KEY` presente + `competitors > 0`. Se algum caminho futuro chamar `runEnrichment("comparison_readings")` sem checar entitlement, dispara. Defesa em profundidade fraca. |
| `COMMENT_SCRAPER_ENABLED` não está gated por pagamento | **Baixo** | Custo Apify em free se flag ON. Sem PII persistida. |
| `assertOpenAiDailyBudgetAvailable` fails-open em erro DB | **Baixo** | Logado mas não bloqueia. |
| Dados disponíveis no snapshot free permitem disparar IA se entitlement gate vazar | **Informativo** | O snapshot free tem tudo o que IA precisa. O único bloqueio é o gate de payment + `isOpenAiAllowed`. |

## 6. O que falta para "Leitura IA por card" premium

Infraestrutura quase toda existe (captions persistidas, idempotency por hash, `leitura-ia-box`, prompts versionados). Falta:
1. Novo `EnrichmentType: "card_readings"` (ou expandir `insights_v2` com namespace por card).
2. Schema JSON: `{ card_id, version, evidence_hash, reading, confidence, evidence_refs[] }`.
3. Renderização condicional por card (component novo `card-ai-reading.tsx`) — exibe placeholder em free, conteúdo em paid.
4. Cache por `(snapshot_id, card_id, evidence_hash, model, prompt_version)`.
5. (Opcional) `EnrichmentType: "post_readings"` para leitura por `post.id` no Top Posts.

---

## Arquitetura recomendada para interpretação IA

### Camadas

```text
                    ┌─────────────────────────────┐
                    │   Snapshot (determinístico) │
                    │  posts + captions + métricas│
                    └──────────────┬──────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼────────┐       ┌─────────▼────────┐       ┌─────────▼─────────┐
│ Global reading │       │  Per-card        │       │  Per-post (opc.)  │
│ comparison_    │       │  readings        │       │  post_readings    │
│ readings       │       │  (novo)          │       │  (futuro)         │
│ (já existe)    │       │                  │       │                   │
└────────────────┘       └──────────────────┘       └───────────────────┘
```

### Regras de custo / cache

- Idempotency key: `sha256(card_id + evidence_json + prompt_version + model)`.
- Skip se key já presente em `normalized_payload.card_readings[card_id]`.
- Hard gates antes de qualquer chamada:
  1. Entitlement do lead (paid).
  2. `isOpenAiAllowed(handle)` **ou** `isLovableAiAllowed(handle)` (criar simétrico se for via gateway).
  3. `assertDailyBudgetAvailable(provider)` (estender o cap para Lovable Gateway).
  4. Cache hit (skip).
- Modelo default por card: `gpt-5.4-mini` (custo baixo); usar `gpt-5.4` apenas no global comparison reading.
- Batch quando possível: cards relacionados podem partilhar uma chamada com `Output` schema multi-card.

### Schema cache JSON (por card)

```json
{
  "card_id": "format-mix",
  "version": 1,
  "model": "gpt-5.4-mini",
  "prompt_version": "card-readings@1",
  "evidence_hash": "sha256:...",
  "reading": { "headline": "...", "body": "...", "actions": ["..."] },
  "confidence": "high|medium|low",
  "evidence_refs": ["posts[2]", "format_stats.reel"],
  "generated_at": "2026-06-08T..."
}
```

### Correções de governance recomendadas (separado, não nesta auditoria)

1. Adicionar `isLovableAiAllowed(handle)` + `assertLovableAiDailyBudgetAvailable()` antes do `generateComparisonReadingsForSnapshot`.
2. Considerar gate de pagamento explícito em `COMMENT_SCRAPER_ENABLED` (ou manter ON apenas em paid handles).
3. Adicionar coluna `model_version` em `enrichment_jobs` (opcional) ou padronizar campos `model` + `prompt_version` dentro do payload (já parcial).

---

## Conclusão

- **Sem necessidade de segundo actor.** Captions já chegam e são bem persistidas.
- **Gate paid/free está sólido** com uma exceção (`comparison_readings` sem allowlist/budget OpenAI-style — defesa em profundidade a reforçar).
- **Free usa captions extensivamente** em análise determinística. Não precisa IA para entregar valor base.
- **Paid já tem 5 enrichments IA** mas **falta a peça "leitura por card"** que tornaria o report claramente premium e justificaria o preço.
- Próximo passo lógico (separado desta auditoria): plano para introduzir `card_readings` com schema cacheado, gates duplicados (entitlement + provider allowlist + budget) e modelo barato por defeito.

> Nada implementado. Aguardar aprovação antes de propor plano de implementação para `card_readings` e o hardening de `comparison_readings`.
