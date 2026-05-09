## Batch P1-C — Performance indexes em `product_events`

### Estado actual

`pg_indexes` em `public.product_events`:

| Índice | Definição |
|---|---|
| `product_events_pkey` | UNIQUE btree (id) |
| `idx_product_events_type_created` | btree (event_type, created_at DESC) |

Não existe índice em `lead_id`, `snapshot_id` nem `handle`. Tudo o que filtra por estas colunas faz hoje sequential scan.

### Padrões de query observados (`rg`)

| Caller | Filtro | Ordem |
|---|---|---|
| `api/admin/lead-timeline.$id.ts` | `lead_id = X OR handle = Y` | `created_at DESC LIMIT 50` |
| `api/admin/leads-kanban.ts` | `lead_id IN (...)` | `created_at DESC` (último evento por lead) |
| `api/admin/leads-kanban.ts` | `event_type='report_viewed' AND handle IN (...)` | — (count) |
| `lib/tracking.functions.ts` (dedup) | `event_type='report_viewed' AND snapshot_id=X AND lead_id=Y AND created_at>=...` | — |
| `api/public/feedback.$requestId.ts` | `event_type='feedback_started' AND lead_id=X AND metadata @> {report_request_id}` | LIMIT 1 |
| `api/admin/beta-funnel.ts` | `event_type IN (link_sent, viewed)` | — (já coberto por `idx_product_events_type_created`) |

### Migração proposta (idempotente)

```sql
-- 1. Timeline + kanban "último evento por lead"
CREATE INDEX IF NOT EXISTS idx_product_events_lead_created
  ON public.product_events (lead_id, created_at DESC)
  WHERE lead_id IS NOT NULL;

-- 2. Dedup de report_viewed por snapshot (tracking.functions.ts) +
--    futuras agregações snapshot-based
CREATE INDEX IF NOT EXISTS idx_product_events_snapshot_type_created
  ON public.product_events (snapshot_id, event_type, created_at DESC)
  WHERE snapshot_id IS NOT NULL;

-- 3. Lookup por handle (kanban "report_viewed por handle", lead-timeline OR-arm)
CREATE INDEX IF NOT EXISTS idx_product_events_handle_type_created
  ON public.product_events (handle, event_type, created_at DESC)
  WHERE handle IS NOT NULL;
```

### O que NÃO faço

- **Sem `(lead_id, event_type, created_at DESC)`** triplo: as queries por lead na timeline e no kanban não filtram por `event_type`. O índice `(lead_id, created_at DESC)` é mais barato e cobre os mesmos padrões. O único caller que combina `lead_id + event_type` é o dedup de `feedback_started` (LIMIT 1, baixo volume), perfeitamente servido pelo novo `idx_product_events_lead_created` + filtro residual em memória.
- **Sem GIN em `metadata`**: única query com `@>` é o dedup de `feedback_started`, executado no início de um form humano (volume residual). Não justifica o custo de manutenção GIN em todas as inserções (`report_viewed` é o evento mais quente).
- Os índices usam `WHERE col IS NOT NULL` parciais para excluir linhas onde a coluna de prefixo é nula, reduzindo tamanho sem afetar selectividade.

### Constraints respeitadas

- Apenas migração SQL. Sem alterações de UI/aplicação/dados.
- `IF NOT EXISTS` em todos. Sem duplicar `idx_product_events_type_created` existente.
- Sem chamadas a Apify/OpenAI/DataForSEO/Resend.

### Validação pós-migração

1. `supabase--linter` → mantém o resultado actual (estes índices não introduzem novos avisos).
2. `bunx tsc --noEmit` → 0 erros (sem código alterado).
3. `bunx vitest run` → 163/163.
4. `EXPLAIN` opcional read-only em `lead-timeline` e `leads-kanban` para confirmar `Index Scan` em vez de `Seq Scan`.

### Retorno após execução

- Índices antes (acima).
- Índices criados (lista acima).
- Output do linter pós-migração e dos testes.

Após aprovação, aplico a migração.