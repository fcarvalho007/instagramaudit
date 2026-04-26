# Smoke test controlado · primeira chamada Apify real

Objetivo: executar **uma única** chamada fresh ao Apify para `frederico.m.carvalho`, seguida de **uma única** chamada de validação de cache, e produzir um relatório completo de cobertura de campos para decidir se podemos começar a construir o adapter real do `/report/example`.

Sem alterações de código, secrets, migrações ou UI.

---

## Fase 1 · Pré-checks (read-only, sem custo)

1. **Sondar runtime publicado** com handle fora da allowlist:
   - `POST https://instagramaudit.lovable.app/api/analyze-public-v1` com `instagram_username: "readinessprobe_doNotCall"`.
   - Esperado: HTTP 403 com `error_code: "PROFILE_NOT_ALLOWED"` (NÃO `PROVIDER_DISABLED`).
   - Se vier `PROVIDER_DISABLED` → **PARAR**. Significa que `APIFY_ENABLED` ainda não está literalmente `"true"` no Worker publicado.

2. **Validar diagnóstico admin** via `GET /api/admin/diagnostics`:
   - `apify_runtime_check.apify_token_present === true`
   - `apify_runtime_check.apify_enabled_raw_is_true === true`
   - `apify_runtime_check.testing_mode_active === true`
   - `apify_runtime_check.allowlist_includes_test_handle === true`
   - `apify_runtime_check.ready_for_smoke_test === true`
   - `secrets.INTERNAL_API_TOKEN === true`

3. **Snapshot da BD antes do teste**:
   - `SELECT count(*) FROM provider_call_logs WHERE handle = 'frederico.m.carvalho';`
   - `SELECT count(*) FROM analysis_events WHERE handle = 'frederico.m.carvalho';`
   - `SELECT id, created_at FROM analysis_snapshots WHERE instagram_username = 'frederico.m.carvalho' ORDER BY created_at DESC LIMIT 3;`

Se qualquer pré-check falhar → **PARAR e reportar**, sem tocar no Apify.

---

## Fase 2 · Chamada fresh (1× Apify real, com caps)

```
POST https://instagramaudit.lovable.app/api/analyze-public-v1
Content-Type: application/json

{ "instagram_username": "frederico.m.carvalho", "competitor_usernames": [] }
```

- **Sem** `?refresh=1`.
- Caps existentes: `maxItems=1` perfil + posts limitados por actor, `maxTotalChargeUsd=0.10`.
- Esperado: HTTP 200, `success: true`, `status.data_source === "fresh"`, `analysis_snapshot_id` presente, `content_summary.posts_analyzed > 0`.

Se a resposta vier com `data_source: "stale"` ou `cache` (existe snapshot recente) → **NÃO** forçar refresh. Reportar e esperar instruções.

---

## Fase 3 · Validação de cache (1× chamada, sem custo)

Mesma payload, imediatamente a seguir.

- Esperado: HTTP 200, `data_source === "cache"`, **sem** novo `provider_call_logs`, **com** novo `analysis_events` (`data_source = "cache"`).

---

## Fase 4 · Inspeção da BD e mapa de cobertura

Queries (read-only):

```sql
-- Snapshot recém-criado
SELECT id, created_at, expires_at, analysis_status, jsonb_pretty(normalized_payload)
FROM analysis_snapshots
WHERE instagram_username = 'frederico.m.carvalho'
ORDER BY created_at DESC LIMIT 1;

-- Provider call logs nos últimos 10 min
SELECT id, created_at, status, http_status, duration_ms,
       posts_returned, estimated_cost_usd, actual_cost_usd, error_excerpt
FROM provider_call_logs
WHERE handle = 'frederico.m.carvalho'
  AND created_at > now() - interval '10 minutes'
ORDER BY created_at DESC;

-- Eventos nos últimos 10 min
SELECT id, created_at, data_source, outcome, posts_returned,
       estimated_cost_usd, duration_ms, error_code
FROM analysis_events
WHERE handle = 'frederico.m.carvalho'
  AND created_at > now() - interval '10 minutes'
ORDER BY created_at DESC;
```

Para o snapshot, calcular cobertura presente/ausente em:

- **Profile**: `username`, `display_name`, `avatar_url`, `bio`, `followers_count`, `following_count`, `posts_count`, `is_verified`
- **Posts[]**: `caption`, `taken_at_iso`, `likes`, `comments`, `format`, `thumbnail_url`, `video_views`, `hashtags`, `mentions`, `engagement_pct`
- **Agregados**: `format_stats`

---

## Fase 5 · Relatório final (pt-PT)

Documento estruturado com:

1. Resultado HTTP fresh + excerto de body.
2. Resultado HTTP cache + excerto de body.
3. Snapshot ID.
4. Contagem de `provider_call_logs` (esperado: +1 vs baseline).
5. Eventos criados nos últimos 5 min (esperado: 2 — um `fresh`, um `cache`).
6. `posts_returned` no provider call.
7. Nº de posts persistidos em `normalized_payload.posts`.
8. Conteúdo de `format_stats` (estrutura + valores).
9. `estimated_cost_usd` real.
10. **Tabela de cobertura** (presente / parcial / ausente) para todos os campos listados.

**Veredicto final**:
- Podemos começar a construir o adapter real do `/report/example`? (sim/não, com justificação)
- Que secções do `/report/example` ficam **totalmente** suportadas pela payload real do Apify?
- Que secções ficam **parcialmente** suportadas (dados aproximáveis ou derivados)?
- Que campos estão **em falta** e exigirão fallback, derivação, ou aceitação como gap conhecido?

---

## Restrições absolutas

- 1 chamada fresh ao Apify · 0 retries · 0 chamadas com competitors · 0 chamadas a outro handle.
- Sem `?refresh=1`.
- Sem edição de ficheiros, sem migrações, sem alteração de secrets, sem alteração de UI.
- Se a fase fresh devolver erro Apify (`provider_error`, timeout, 4xx/5xx upstream), reportar sem tentar de novo.
- Custo máximo absoluto: `maxTotalChargeUsd=0.10` (já configurado no client).

## Detalhes técnicos

- Probe e chamadas reais via `stack_modern--invoke-server-function` contra a Published URL `https://instagramaudit.lovable.app`.
- Diagnóstico admin requer header `Authorization`/cookie de sessão admin — se não estiver acessível pela ferramenta, infiro a partir do probe (403 vs 503) e do snapshot da BD.
- BD acedida via `supabase--read_query` (read-only, sem migrações).
