## Re-auditoria — última inconsistência

Após cobrir `system-queries`, `cost-sync` e `billing-reconciliation`, falta **um único endpoint** que ainda mostra custos sem aplicar a regra `actual>0 ? actual : estimated`:

### `src/routes/api/admin/leads-kanban.ts` (linhas 95–128)

Alimenta o **custo por lead** no kanban de `/admin/visao-geral`. Tem dois problemas:

1. **Código morto**: faz query a `provider_call_logs` (linha 106) e atribui a `costs`, mas a variável **nunca é usada**.
2. **Fonte errada**: o `costBySnapshot` é construído a partir de `analysis_events.estimated_cost_usd` (linha 119), que é **só estimado, snapshot-level**. Não reflecte os custos reais (`actual_cost_usd`) registados em `provider_call_logs`. Resultado: o custo por lead na kanban diverge do custo por análise mostrado em `/admin/receita` e da reconciliação.

### Tudo o resto está OK

- `system-queries.server.ts:1076–1128` (CommentScraperMetrics) usa `actual_cost_usd` directamente em 3 sítios — **intencional** (mede "quanto a Apify cobrou" para guardrails). Não é cost reporting, é monitoring de billing real. Manter.
- `market-signals.ts` e `run-enrichment.server.ts` — DataForSEO sempre grava `actual_cost_usd`, então usar `actual` directo é correcto. Manter.
- `report-cost-summary.server.ts` já implementa a regra correctamente (linha 146).

---

## Plano final

### Patch único — `src/routes/api/admin/leads-kanban.ts`

Substituir o bloco 95–128 por agregação via `provider_call_logs.analysis_event_id → analysis_event → snapshot_id`, aplicando `resolveCallCost`.

```ts
import { resolveCallCost } from "@/lib/admin/cost-resolution";

// ... dentro do handler ...

// 4. Custo real por snapshot — agregar provider_call_logs via analysis_events.
let costBySnapshot = new Map<string, number>();
if (snapshotIds.length > 0) {
  // a) eventos dos snapshots em causa
  const { data: events } = await supabaseAdmin
    .from("analysis_events")
    .select("id, analysis_snapshot_id")
    .in("analysis_snapshot_id", snapshotIds);

  const eventToSnapshot = new Map<string, string>();
  for (const ev of events ?? []) {
    if (ev.analysis_snapshot_id) eventToSnapshot.set(ev.id, ev.analysis_snapshot_id);
  }

  // b) chamadas de provider ligadas a esses eventos
  const eventIds = [...eventToSnapshot.keys()];
  if (eventIds.length > 0) {
    const { data: calls } = await supabaseAdmin
      .from("provider_call_logs")
      .select("analysis_event_id, actual_cost_usd, estimated_cost_usd")
      .in("analysis_event_id", eventIds);

    for (const c of calls ?? []) {
      const snapId = eventToSnapshot.get(c.analysis_event_id ?? "");
      if (!snapId) continue;
      const cost = resolveCallCost(c);
      costBySnapshot.set(snapId, (costBySnapshot.get(snapId) ?? 0) + cost);
    }
  }
}
```

Mantém o output `report_cost_usd` por lead com a mesma chave (`snapshotId`), por isso o frontend não muda.

### Validação

- `bunx vitest run` (helper já tem cobertura).
- Manual: abrir `/admin/visao-geral` (kanban). Custo por lead deve agora bater com a soma de `provider_call_logs` para o snapshot desse lead, e estar alinhado com o "custo médio por análise fresh" de `/admin/receita`.

### Ficheiros alterados
- `src/routes/api/admin/leads-kanban.ts` (1 import + 1 bloco refeito)

Sem mudanças de schema.
