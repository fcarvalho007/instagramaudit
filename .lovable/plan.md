# Refinamento Fase 1 — `report_snapshots` leve e versionado

Sem migrations nem código nesta fase. Apenas contrato de dados.

## 1. Princípios

- `analysis_snapshots` continua como **cache técnico** (TTL curto, payload completo, base64, blobs intermédios permitidos).
- `report_snapshots` é **histórico imutável user-facing** (15 dias, payload mínimo necessário para reconstruir o relatório, sem nada pesado).
- Nunca copiar bytes binários, base64 ou estruturas de enrichment cru.
- Tudo o que não for estritamente necessário para renderizar o relatório histórico **fica fora**.
- Versionar agressivamente para permitir migrações futuras sem partir histórico antigo.

## 2. Estrutura de `report_payload_jsonb`

Top-level fixo, schema validado por Zod no builder:

```text
{
  "schema": {
    "payload_schema_version": "1",
    "report_version": "r1",
    "algorithm_version": "alg-2026-05-a"
  },
  "context": {
    "instagram_username": "frederico.m.carvalho",
    "competitor_usernames": ["...", "..."],
    "generated_at": "ISO-8601",
    "data_provenance": {
      "provider": "apify",
      "snapshot_captured_at": "ISO-8601",
      "posts_window_days": 90
    }
  },
  "profile": {
    "handle": "...",
    "display_name": "...",
    "followers": 12345,
    "following": 321,
    "posts_count": 210,
    "biography_text": "string truncado <= 500 chars",
    "external_url": "https://...",
    "is_verified": false,
    "is_business": true,
    "category": "...",
    "avatar_url": "https://... (URL only, never base64)"
  },
  "metrics": {
    "engagement_pct": 2.31,
    "avg_likes": 412,
    "avg_comments": 18,
    "avg_views_reels": 9100,
    "posting_frequency_per_week": 3.2,
    "tier": "micro",
    "benchmark_engagement_pct": 1.8
  },
  "format_stats": {
    "image": { "count": 12, "engagement_pct": 1.9 },
    "carousel": { "count": 8, "engagement_pct": 2.7 },
    "reel": { "count": 10, "engagement_pct": 3.4 }
  },
  "content_summary": {
    "top_themes": ["..."],
    "top_hashtags": ["..."],
    "posting_hours_histogram": [/* 24 ints */]
  },
  "posts": [
    {
      "id": "shortcode",
      "url": "https://www.instagram.com/p/...",
      "type": "reel|image|carousel",
      "taken_at": "ISO-8601",
      "caption_text": "string truncado <= 1000 chars",
      "likes": 0,
      "comments": 0,
      "views": 0,
      "engagement_pct": 0,
      "media_url": "https://... (HTTPS only, never base64, never data:)"
    }
    // máx. 30 posts
  ],
  "competitor_summaries": [
    {
      "handle": "...",
      "followers": 0,
      "engagement_pct": 0,
      "avg_likes": 0,
      "avg_comments": 0,
      "tier": "...",
      "top_format": "reel"
    }
  ],
  "insights": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "opportunities": ["..."],
    "recommendations": [
      { "title": "...", "body": "...", "priority": "high|med|low" }
    ]
  }
}
```

## 3. Campos incluídos vs. excluídos

### Incluídos (whitelist explícita)
- `schema.*` (versionamento)
- `context.*` (handle, competitors, datas, provenance)
- `profile.*` sem base64; `avatar_url` apenas como URL HTTPS
- `metrics.*` agregadas finais
- `format_stats.*` agregados por formato
- `content_summary.*` (temas, hashtags, histograma de horas)
- `posts[]` máx. 30, **caption truncado a 1000 chars**, apenas URLs HTTPS
- `competitor_summaries[]` apenas agregados
- `insights.*` texto final apresentado ao utilizador

### Excluídos (nunca copiar para `report_snapshots`)
- Qualquer `data:image/...;base64,...` (helper `stripBase64Urls()` no builder)
- `caption_semantic_analysis` (intermediário pesado)
- `visual_cover_analysis` (thumbnails/embeddings)
- `ai_insights_v1` cru (apenas o resultado final entra em `insights`)
- `market_signals_free` cru
- `enrichment_status` (estado técnico do cache)
- `raw_*`, `_meta`, `__debug`, blobs binários
- Comentários completos por post (apenas contagem agregada)
- HTML cru, screenshots, embeddings, vectors
- Tokens, custos, IDs internos de provider
- Avatars/thumbnails inline; só URLs

## 4. Versionamento

Três níveis, todos persistidos:

- **`payload_schema_version`** (coluna + dentro de `schema`): forma do JSON. Incrementa quando muda a estrutura do payload (ex: adicionar `posts[].saves`).
- **`report_version`**: versão do relatório user-facing (ex: `r1`, `r2`). Incrementa quando muda o que o utilizador vê (secções, narrativa).
- **`algorithm_version`**: versão dos cálculos/insights (ex: `alg-2026-05-a`). Incrementa quando mudam fórmulas, benchmarks ou prompts de IA.

Regra: snapshots antigos **nunca** são recalculados. O renderer histórico lê `payload_schema_version` e escolhe o adapter apropriado.

## 5. Retenção e cleanup

- `report_snapshots.expires_at = created_at + 15 dias` (constante central `REPORT_RETENTION_DAYS`).
- `analysis_snapshots` continua com TTL técnico curto independente (não muda nesta fase).
- **Cleanup automático fica fora da Fase 1.** Apenas marcamos `expires_at`; soft-delete via `expired_at` numa fase posterior. Sem cron, sem DELETE.
- Leitura futura filtra por `expires_at > now()`; expirados existem em DB mas não são servidos.

## 6. O que esta fase NÃO faz

- Sem migration ainda (próximo passo, a seguir à tua aprovação deste contrato).
- Sem builder code, sem testes, sem types regenerados.
- Sem alterações a `analysis_snapshots`.
- Sem cleanup, sem cron, sem UI, sem PDF storage logic.
- Sem alterações a Brevo/Resend/providers.

## 7. Próximo passo (a seguir a aprovares este refinamento)

Volto a Plan Mode da migration concreta com este contrato fixo:
1. Migration `report_snapshots` + coluna `payload_schema_version` + FK fraco em `report_requests`.
2. `src/lib/report-snapshots/schema.ts` com Zod refletindo exatamente esta estrutura.
3. `build-report-snapshot-payload.server.ts` com whitelist + `stripBase64Urls()` + truncagem.
4. Testes de exclusão (base64, campos pesados, truncagem, validação Zod).

☐ Aprovas esta estrutura leve + versionamento triplo antes de eu avançar para a migration?
