## ⚠️ Estado atual: Step 1 já está implementado

Antes de criar qualquer migração, é importante perceber que a fundação que estás a pedir **já existe em produção** desde uma fase anterior do projeto. Criar tabelas novas com nomes alternativos (`profile_records`) iria **duplicar dados**, **partir o código existente** e **partir o admin cockpit** que acabámos de construir.

## Mapeamento entre o pedido e o que já existe

| Pedido (Step 1) | Já existe na BD | Estado |
|---|---|---|
| Tabela `analysis_events` | `public.analysis_events` | ✅ Implementada |
| Tabela `profile_records` | `public.social_profiles` | ✅ Implementada (nome diferente, mesmo propósito) |
| Função `record_analysis_event` | `public.record_analysis_event(...)` | ✅ Implementada |
| RLS service-role only | RLS ativo, sem políticas públicas em ambas | ✅ Conforme |

### Cobertura coluna a coluna

**`analysis_events`** — todas as colunas pedidas existem, com pequenos desvios de nome:
- `instagram_username` (pedido) → `handle` + `network` (atual, mais geral; permite TikTok/LinkedIn no futuro, alinhado com a visão de produto)
- `user_agent` (pedido) → `user_agent_family` (atual, já anonimizado — melhor para privacidade)
- `apify_actor` (pedido) → não existe nesta tabela mas existe em `provider_call_logs.actor`, ligado via `provider_call_log_id` (modelo mais limpo: actor pertence à chamada do provider, não ao evento de análise)
- `provider` (pedido) → não existe diretamente, mas inferido via `provider_call_log_id` → `provider_call_logs.provider`
- Tudo o resto: `id`, `created_at`, `competitor_handles` (jsonb), `cache_key`, `data_source`, `outcome`, `error_code`, `duration_ms`, `posts_returned`, `profiles_returned`, `estimated_cost_usd`, `analysis_snapshot_id`, `request_ip_hash` ✅

**`social_profiles`** (= `profile_records` pedido) — mapeamento dos contadores:
- `analyses_total` ✅
- `cache_hits` (pedido) → `analyses_cache` (atual)
- `fresh_calls` (pedido) → `analyses_fresh` (atual)
- `stale_serves` (pedido) → ❌ ainda não separado de `analyses_cache` (a função soma stale ao bucket cache)
- `blocked_attempts` (pedido) → ❌ ainda não separado de `analyses_failed`
- `failed_calls` (pedido) → `analyses_failed` (atual, mas inclui blocked + disabled + invalid + provider_error + not_found, tudo somado)
- `last_analyzed_at`, `last_outcome`, `last_data_source`, `last_snapshot_id`, `estimated_cost_usd_total`, `first_analyzed_at`, `display_name`, `followers_last_seen` ✅

A função `record_analysis_event` já é chamada por `/api/analyze-public-v1` em **todos os caminhos** (cache, stale, blocked allowlist, provider disabled, fresh success, provider error, not found, invalid input). O admin cockpit já consome estes dados.

## Único gap real

Os contadores em `social_profiles` agrupam `stale` com `cache` e empacotam todas as falhas/bloqueios num único `analyses_failed`. Para o cockpit ficar mais granular (separar "repeated profiles" de "failed analyses" de "blocked attempts"), faltam dois contadores extra.

## Proposta minimal: uma migração aditiva e segura

Em vez de criar tabelas duplicadas, proponho **uma única migração aditiva** que estende `social_profiles` com os contadores em falta e atualiza a função `record_analysis_event` para os preencher. Tudo retro-compatível, sem mexer em nenhum código TS, sem tocar no UI público nem em `/admin`, sem tocar em `/report.example`, PDF ou email.

### SQL da migração

```sql
-- 1) Novos contadores granulares em social_profiles (default 0, sem backfill).
ALTER TABLE public.social_profiles
  ADD COLUMN IF NOT EXISTS analyses_stale integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS analyses_blocked integer NOT NULL DEFAULT 0;

-- 2) Index úteis para o cockpit (handle rollups + custo).
CREATE INDEX IF NOT EXISTS analysis_events_created_at_idx
  ON public.analysis_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analysis_events_handle_idx
  ON public.analysis_events (handle);
CREATE INDEX IF NOT EXISTS analysis_events_outcome_idx
  ON public.analysis_events (outcome);
CREATE INDEX IF NOT EXISTS analysis_events_data_source_idx
  ON public.analysis_events (data_source);
CREATE INDEX IF NOT EXISTS analysis_events_snapshot_idx
  ON public.analysis_events (analysis_snapshot_id);

CREATE INDEX IF NOT EXISTS social_profiles_last_analyzed_idx
  ON public.social_profiles (last_analyzed_at DESC);
CREATE INDEX IF NOT EXISTS social_profiles_total_idx
  ON public.social_profiles (analyses_total DESC);
CREATE INDEX IF NOT EXISTS social_profiles_cost_idx
  ON public.social_profiles (estimated_cost_usd_total DESC);

-- 3) Atualizar record_analysis_event para preencher os novos buckets
--    sem alterar a assinatura (não parte chamadas existentes).
--    Mantém a lógica atual de cache/fresh/cost; refina failed e adiciona
--    stale + blocked como categorias próprias.
CREATE OR REPLACE FUNCTION public.record_analysis_event(
  p_network text, p_handle text, p_competitor_handles jsonb,
  p_cache_key text, p_data_source text, p_outcome text, p_error_code text,
  p_analysis_snapshot_id uuid, p_provider_call_log_id uuid,
  p_posts_returned integer, p_profiles_returned integer,
  p_estimated_cost_usd numeric, p_duration_ms integer,
  p_request_ip_hash text, p_user_agent_family text,
  p_display_name text DEFAULT NULL, p_followers_last_seen bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id uuid;
  v_handle text := lower(p_handle);
  v_network text := lower(p_network);
  v_is_cache boolean := p_data_source = 'cache';
  v_is_stale boolean := p_data_source = 'stale';
  v_is_fresh_success boolean := p_data_source = 'fresh' AND p_outcome = 'success';
  v_is_blocked boolean := p_outcome IN ('blocked_allowlist', 'provider_disabled');
  v_is_failure boolean := p_outcome IN ('provider_error', 'not_found', 'invalid_input');
  v_cost_delta numeric := COALESCE(p_estimated_cost_usd, 0);
BEGIN
  INSERT INTO public.analysis_events (
    network, handle, competitor_handles, cache_key, data_source, outcome,
    error_code, analysis_snapshot_id, provider_call_log_id, posts_returned,
    profiles_returned, estimated_cost_usd, duration_ms, request_ip_hash,
    user_agent_family
  ) VALUES (
    v_network, v_handle, COALESCE(p_competitor_handles, '[]'::jsonb),
    p_cache_key, p_data_source, p_outcome, p_error_code, p_analysis_snapshot_id,
    p_provider_call_log_id, p_posts_returned, p_profiles_returned,
    p_estimated_cost_usd, p_duration_ms, p_request_ip_hash, p_user_agent_family
  ) RETURNING id INTO v_event_id;

  INSERT INTO public.social_profiles (
    network, handle, display_name, followers_last_seen, last_outcome,
    last_data_source, last_snapshot_id, analyses_total, analyses_fresh,
    analyses_cache, analyses_stale, analyses_blocked, analyses_failed,
    estimated_cost_usd_total
  ) VALUES (
    v_network, v_handle, p_display_name, p_followers_last_seen, p_outcome,
    p_data_source, p_analysis_snapshot_id,
    1,
    CASE WHEN v_is_fresh_success THEN 1 ELSE 0 END,
    CASE WHEN v_is_cache THEN 1 ELSE 0 END,
    CASE WHEN v_is_stale THEN 1 ELSE 0 END,
    CASE WHEN v_is_blocked THEN 1 ELSE 0 END,
    CASE WHEN v_is_failure THEN 1 ELSE 0 END,
    CASE WHEN v_is_fresh_success THEN v_cost_delta ELSE 0 END
  )
  ON CONFLICT (network, handle) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.social_profiles.display_name),
    followers_last_seen = COALESCE(EXCLUDED.followers_last_seen, public.social_profiles.followers_last_seen),
    last_analyzed_at = now(),
    last_outcome = EXCLUDED.last_outcome,
    last_data_source = EXCLUDED.last_data_source,
    last_snapshot_id = COALESCE(EXCLUDED.last_snapshot_id, public.social_profiles.last_snapshot_id),
    analyses_total = public.social_profiles.analyses_total + 1,
    analyses_fresh = public.social_profiles.analyses_fresh + CASE WHEN v_is_fresh_success THEN 1 ELSE 0 END,
    analyses_cache = public.social_profiles.analyses_cache + CASE WHEN v_is_cache THEN 1 ELSE 0 END,
    analyses_stale = public.social_profiles.analyses_stale + CASE WHEN v_is_stale THEN 1 ELSE 0 END,
    analyses_blocked = public.social_profiles.analyses_blocked + CASE WHEN v_is_blocked THEN 1 ELSE 0 END,
    analyses_failed = public.social_profiles.analyses_failed + CASE WHEN v_is_failure THEN 1 ELSE 0 END,
    estimated_cost_usd_total = public.social_profiles.estimated_cost_usd_total + CASE WHEN v_is_fresh_success THEN v_cost_delta ELSE 0 END,
    updated_at = now();

  RETURN v_event_id;
END;
$$;
```

## O que NÃO mexo

- ❌ Não crio `profile_records` (duplicava `social_profiles` e partia o cockpit).
- ❌ Não crio uma `analysis_events` nova (já existe e está em uso ativo).
- ❌ Não toco em `analysis_snapshots`, `provider_call_logs`, `report_requests`, `usage_alerts`, `leads`, `benchmark_references`.
- ❌ Não toco em UI pública, `/admin`, `/report.example`, `/api/analyze-public-v1`, PDF, email.
- ❌ Não crio tabelas de pagamento, subscrições ou revenue.
- ❌ Não armazeno payloads brutos do Apify nem IPs reais.

## Como confirmar que ficaste a precisar de mais

Se preferires literalmente ter tabelas com os nomes `profile_records` e colunas exatas (`cache_hits`, `fresh_calls`, etc.) em vez de reutilizar a infraestrutura existente, isso obriga a:
1. Criar tabelas duplicadas em paralelo, ou
2. Renomear `social_profiles` → `profile_records` e migrar todas as referências em código (`src/lib/analysis/events.ts`, painéis do cockpit, função RPC), partindo o que está estável.

Qualquer um destes caminhos é destrutivo e contradiz o pedido de "não modificar admin tabs" e "não modificar /api/analyze-public-v1". Por isso o plano default é **só estender, não duplicar**.

## Pergunta de decisão

**Opção A (recomendado):** aplicar a migração aditiva acima — adiciona `analyses_stale` + `analyses_blocked` em `social_profiles`, cria os 8 índices e atualiza a função RPC. Não parte nada.

**Opção B:** parar e debater renomeações antes de migrar (não recomendo agora).

## Checkpoint (Opção A)

- ☐ Migração única `add_granular_counters_and_indexes.sql` aplicada.
- ☐ `analyses_stale` e `analyses_blocked` adicionadas a `social_profiles` (default 0).
- ☐ 8 índices criados (5 em `analysis_events`, 3 em `social_profiles`).
- ☐ `record_analysis_event` atualizada para preencher os novos buckets.
- ☐ Sem alterações em código TS.
- ☐ Sem alterações em UI pública, `/admin`, `/report.example`, PDF, email.
- ☐ RLS continua ativo sem políticas públicas.
