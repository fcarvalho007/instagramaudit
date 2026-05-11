## `report_snapshots.report_payload_jsonb` — Schema otimizado para histórico

### Contexto

A tabela `analysis_snapshots` actual é uma **cache de pipeline** (15 dias) que contém tudo o que cada provider devolveu. Quando criarmos `report_snapshots` (para histórico imutável de relatórios entregues), o payload deve ser **reduzido e estável**, não uma cópia bruta.

Boa notícia da auditoria: **hoje não há base64 em lado nenhum**. `avatar_url` e `thumbnail_url` são URLs HTTPS de Instagram (~440 chars). A regra "não copiar base64" é preventiva para evitar regressões futuras (ex.: alguém embeber thumbnails inline para PDF).

### 1. Forma canónica de `report_payload_jsonb`

```jsonc
{
  "schema_version": "report.v1",
  "algorithm_version": "analysis.v3",        // bump quando cálculo muda
  "generated_at": "2026-05-11T14:00:00Z",
  "handle": "frederico.m.carvalho",
  "network": "instagram",
  "competitors": ["handle_a", "handle_b"],
  "language": "pt-PT",

  "profile": {
    "username": "...",
    "display_name": "...",
    "bio": "...",                            // texto, sem HTML
    "category": "...",
    "is_business": true,
    "is_verified": false,
    "followers_count": 0,
    "following_count": 0,
    "posts_count": 0,
    "avatar_url": "https://..."              // URL apenas, NUNCA data:
  },

  "metrics": {                                // métricas finais já calculadas
    "engagement_pct": 2.34,
    "avg_likes": 0,
    "avg_comments": 0,
    "avg_video_views": 0,
    "post_frequency_per_week": 0,
    "tier": "micro",
    "benchmark_engagement_pct": 1.8,
    "benchmark_source": "knowledge.v2"
  },

  "format_stats": { "...": "..." },
  "content_summary": { "...": "..." },

  "posts": [                                  // até N posts (ex.: 30)
    {
      "id": "...",
      "shortcode": "...",
      "permalink": "https://www.instagram.com/p/...",
      "format": "reel|image|carousel",
      "taken_at_iso": "...",
      "weekday": 3,
      "hour_local": 19,
      "caption": "...",                       // texto, truncar a 1000 chars
      "caption_length": 412,
      "hashtags": ["..."],
      "mentions": ["..."],
      "likes": 0,
      "comments": 0,
      "video_views": 0,
      "video_duration": 0,
      "engagement_pct": 0,
      "thumbnail_url": "https://..."          // URL apenas, NUNCA data:
    }
  ],

  "competitor_summaries": [                   // só agregados, não posts crus
    {
      "handle": "...",
      "followers_count": 0,
      "engagement_pct": 0,
      "top_format": "reel"
    }
  ],

  "insights": {                               // saída final IA, texto pt-PT
    "summary": "...",
    "strengths": ["..."],
    "opportunities": ["..."],
    "recommendations": [
      { "title": "...", "body": "...", "priority": "high|med|low" }
    ]
  },

  "market_signals": null,                     // opcional; só se relevante para report
  "data_provenance": {
    "apify_actor": "apify/instagram-profile-scraper",
    "openai_model": "gpt-5-mini",
    "dfs_used": false,
    "scraped_at": "..."
  }
}
```

### 2. Campos da `analysis_snapshots` cache que **NÃO** copiar

Estes existem na cache para debug/regeneração mas não pertencem ao histórico imutável:

| Campo / forma | Razão |
|---|---|
| Qualquer `data:image/...;base64,...` | **Proibido** — peso enorme, regenerável de URL |
| Blobs binários (Buffer, Uint8Array) | Não pertence ao JSON |
| Thumbnails inline (PDF embedded) | Render do PDF é separado; histórico só guarda URL |
| `enrichment_status` (estado de pipeline) | Operacional, não histórico |
| `caption_semantic_analysis` raw (5.7 KB) | Já consumido para gerar `insights`. Guardar só o destilado |
| `visual_cover_analysis` raw (5.7 KB) | Idem |
| `ai_insights_v1` (legacy) | Manter só `v2` mais recente, em `insights` |
| `market_signals_free` completo (10 KB) | Guardar apenas top-3 sinais relevantes em `market_signals` se aparecerem no PDF; senão `null` |
| Posts > N (cap 30) | Limita explosão para perfis grandes |
| Campos brutos de Apify não normalizados (`raw_*`, `_meta`) | Dependência de schema do provider |
| `coauthors`, `tagged_users` se vazios | Omitir (sem `null` ruidoso) |
| `music_title` se vazio | Omitir |

### 3. Regras de sanitização (a implementar como helper)

`buildReportPayload(analysisSnapshot): ReportPayloadV1` deve garantir:

1. **Stripping anti-base64**: percorrer o JSON e rejeitar qualquer string que comece por `data:` em campos `*_url`, `avatar_url`, `thumbnail_url`, `image`, `cover`. Substituir por `null` + log de aviso.
2. **Truncagem de captions**: `caption.slice(0, 1000)` + `caption_length` original preservado.
3. **Cap de posts**: `posts.slice(0, 30)`.
4. **Cap de hashtags/mentions**: 30 cada por post.
5. **Versionamento**: `schema_version` + `algorithm_version` obrigatórios — qualquer mudança de cálculo bumpa o algorithm_version sem reescrever histórico.
6. **Validação Zod** antes de inserir: `ReportPayloadV1Schema.parse(payload)`. Falha = erro explícito, não snapshot corrompido.
7. **Whitelist, não blacklist**: o builder constrói o objecto campo-a-campo, em vez de copiar `analysis_snapshot` e remover. Garante que campos novos do provider nunca vazam por acidente.

### 4. Forma da tabela (proposta — para próxima migração)

```sql
create table public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_request_id uuid not null,            -- FK lógica
  analysis_snapshot_id uuid,                  -- referência à cache (pode expirar)
  handle text not null,
  network text not null default 'instagram',
  schema_version text not null,
  algorithm_version text not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz,                     -- mesma janela 15d ou superior
  report_payload_jsonb jsonb not null,
  pdf_storage_path text,
  size_bytes integer generated always as (pg_column_size(report_payload_jsonb)) stored
);
create index on report_snapshots(handle, generated_at desc);
create index on report_snapshots(report_request_id);
```

`size_bytes` calculado serve para monitorizar a regra de sustentabilidade (alerta se >100 KB).

### 5. Tamanho-alvo

Comparado com a cache actual (~13 KB médio, P95 45 KB):

| Optimização | Poupança |
|---|---|
| Drop `caption_semantic_analysis` raw | −5.7 KB |
| Drop `visual_cover_analysis` raw | −5.7 KB |
| Drop `ai_insights_v1` legacy | −3 KB |
| Drop `market_signals_free` completo | −10 KB |
| Drop `enrichment_status` | −0.2 KB |
| Truncar captions a 1000 | −1-3 KB |
| **Resultado esperado** | **~6-8 KB médio, P95 ~15 KB** |

≈ **−60 % vs cache actual**, mantendo tudo necessário para reconstruir o relatório histórico.

### 6. Onde guardar a regra

- Helper `src/lib/report/build-report-payload.ts` (a criar): única fonte que produz `report_payload_jsonb`.
- Schema Zod em `src/lib/report/schemas/report-payload-v1.ts`.
- Memória do projecto: actualizar `mem://features/report-snapshots-payload` com a regra anti-base64 e schema versionado.
- `LOCKED_FILES.md`: marcar o builder como locked para evitar regressões.

### Constrangimentos

- ☐ Plan only — sem migration, sem código, sem mutações
- ☐ Sem chamadas a providers
- ☐ Não cria `report_snapshots` ainda — só define a shape e a regra
