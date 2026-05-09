## Backfill `report_link_sent` para timeline histórica

### Linhas a corrigir (1)

| lead_id | report_request_id | instagram_username | email_sent_at | analysis_snapshot_id |
|---|---|---|---|---|
| `a0000000-0000-0000-0000-000000000001` | `b0000000-0000-0000-0000-000000000001` | `frederico.m.carvalho` | `2026-05-04 16:53:53Z` | `683e4c21-60e0-4045-b43a-dfcd85fe9896` |

Apenas o registo seed/QA do Frederico tem `delivery_status='sent'` + `email_sent_at` sem o evento correspondente em `product_events`. Mais nenhum lead em produção tem o gap.

### Critério de detecção (já validado)

Faltam ambas estas verificações para evitar duplicados:
- nenhum `product_events.report_link_sent` com `metadata->>'report_request_id' = rr.id`;
- nenhum `product_events.report_link_sent` com `lead_id` + `snapshot_id` correspondentes (cobre eventos antigos sem `report_request_id` no metadata).

### SQL proposto (NÃO executar ainda — revisão primeiro)

```sql
INSERT INTO product_events (
  lead_id, snapshot_id, handle, event_type, created_at, metadata
)
SELECT
  rr.lead_id,
  rr.analysis_snapshot_id,
  rr.instagram_username,
  'report_link_sent',
  COALESCE(rr.email_sent_at, rr.updated_at, now()),
  jsonb_build_object(
    'report_request_id', rr.id,
    'channel', 'backfill',
    'reason', 'historical email_sent_at without product_event'
  )
FROM report_requests rr
WHERE (rr.delivery_status = 'sent' OR rr.email_sent_at IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM product_events pe
    WHERE pe.event_type = 'report_link_sent'
      AND (pe.metadata->>'report_request_id')::uuid = rr.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM product_events pe
    WHERE pe.event_type = 'report_link_sent'
      AND pe.lead_id = rr.lead_id
      AND pe.snapshot_id = rr.analysis_snapshot_id
  );
```

Notas:
- `created_at` usa `email_sent_at` (timestamp real do envio) — preserva a ordenação cronológica do timeline.
- `actor_hash` deixado a NULL (coluna nullable).
- Idempotente: o `WHERE NOT EXISTS` garante que correr o script duas vezes não cria duplicados.

### Riscos

| Risco | Mitigação |
|---|---|
| Duplicação se um evento legacy tiver outro shape de metadata | Dupla verificação (metadata + `lead_id`+`snapshot_id`). |
| Triggers no insert disparam efeitos colaterais (email, lifecycle) | Não há triggers em `product_events` (verificado em `<db-triggers>`). Insert é puro registo. |
| `commercial_status` do lead | Não é tocado. Backfill só insere o evento histórico. |
| Conflito com a regra de **não alterar leads / report_requests** | Cumprida — só `INSERT` em `product_events`. |
| Backfill ficar com `created_at` no futuro/passado errado | `email_sent_at` está em `2026-05-04` (timestamp do seed); aceitável porque coincide com o `delivery_status=sent`. |

### Rollback

Reversível por `report_request_id` + marcador `channel:"backfill"`:

```sql
DELETE FROM product_events
WHERE event_type = 'report_link_sent'
  AND metadata->>'channel' = 'backfill'
  AND metadata->>'reason' = 'historical email_sent_at without product_event'
  AND (metadata->>'report_request_id')::uuid IN (
    'b0000000-0000-0000-0000-000000000001'
  );
```

### Próximo passo

Aguardar aprovação para executar o `INSERT`. Após execução, validar com:

```sql
SELECT lead_id, snapshot_id, created_at, metadata
FROM product_events
WHERE event_type = 'report_link_sent'
  AND metadata->>'channel' = 'backfill';
```
