# Admin observability — Pro windows, créditos, custos (sem schema)

## Princípio de design

Nenhuma migração. Tudo derivado do que já existe:
- **Window**: `analysis_events.analysis_window` quando existir; caso contrário, parsing do sufixo `:w=30d` / `:w=90d` em `cache_key` (sem sufixo = `baseline`). Mesma regra para `credit_ledger.cache_key` (já cobre o lead `01bf861c…` — ver evidência abaixo).
- **Credit ↔ analysis link**: sem FK `analysis_event_id`, mas `credit_ledger` já tem `cache_key`, `handle`, `analysis_snapshot_id` — chega para correlacionar visualmente.

### Evidência (lead `01bf861c-6a17-4b36-81b7-130ef2f143da`)

```
initial_grant +2  →  reserve -1 (cache_key "v1:frederico.m.carvalho|")          → confirm 0  snapshot 683e4c21  (baseline)
                  →  reserve -1 (cache_key "v1:frederico.m.carvalho|:w=30d")    → confirm 0  snapshot 3f8b1dcf  (30d)
```
Sufixo `:w=30d` torna a janela óbvia sem schema change.

## Mudanças

### 1. Reports table (`/admin/relatorios`)
**Backend** — `src/routes/api/admin/report-requests.ts`:
- Após carregar `analysis_snapshots`, fazer 1 query extra a `analysis_events` `IN (snapshot_ids)` selecionando `analysis_snapshot_id, analysis_window, cache_key, data_source, outcome, competitor_handles, provider_call_log_id, estimated_cost_usd`. Indexar `Map<snapshot_id, event>` (preferir o evento `outcome='success'` mais recente).
- Adicionar à `Row`: `analysis_window` ("baseline"|"30d"|"90d"), `data_source` ("fresh"|"cache"|"stale"|"blocked"|null), `competitor_count` (length de `competitor_handles`), `snapshot_short` (`snapshot_id.slice(0,8)`), `estimated_cost_usd`.
- Helper partilhado `deriveWindow(analysis_window, cache_key)` em novo `src/lib/admin/analysis-window.ts`.

**Frontend** — `src/components/admin/v2/relatorios/reports-table-section.tsx`:
- Estender `ReportRow` interface.
- Adicionar 3 colunas entre "Perfil analisado" e "Início": **Janela** (badge: `baseline` neutro / `30d` info / `90d` revenue), **Origem dados** (badge: `cache` neutro / `fresh` signal / `stale` warning / `blocked` danger), **Concorrentes** (chip com count + tooltip handles), **Snapshot** (mono short id, copy on click).
- Manter ordem responsiva — em <1024 esconder Concorrentes/Snapshot via `hidden md:table-cell`.

### 2. Lead detail — nova tab "Créditos & análises"
**Backend** — novo `src/routes/api/admin/lead-credit-activity.$id.ts`:
- `requireAdminSession`. Lê:
  - `credit_balance(p_lead_id)` via RPC para saldo.
  - `credit_ledger` `WHERE lead_id=$id ORDER BY created_at DESC LIMIT 100` (todas as colunas + parsing do window via cache_key suffix).
  - `analysis_events` para os handles do lead (`SELECT DISTINCT handle FROM credit_ledger WHERE lead_id=$id AND handle IS NOT NULL`) — `LIMIT 50` mais recentes com `analysis_window, data_source, outcome, estimated_cost_usd, analysis_snapshot_id, cache_key`.
- Resposta: `{ balance, ledger: LedgerRow[], events: EventRow[] }`.

**Frontend** — `lead-detail-sheet.tsx` (já tem `Tabs`):
- Adicionar `TabsTrigger value="credits"` + `TabsContent` que faz `useQuery` do novo endpoint.
- 3 sub-secções:
  1. **Saldo actual** — número grande (Inter SemiBold, tabular-nums) + linha contextual ("granted 2 · usados 2 · disponíveis 0").
  2. **Movimentos** — tabela compacta (delta, reason badge, handle, window badge derivado de cache_key, snapshot short, timestamp). Variantes:
     - `initial_grant` → badge `info`
     - `reserve` → badge `signal` (delta vermelho `-1`)
     - `confirm` → badge `revenue` (delta verde `0`)
     - `release` → badge `neutral`
     - + tag separada "Período" vs "Concorrente" inferida (cache_key tem `:w=…` → período; senão → competitor ou baseline conforme contexto).
  3. **Análises recentes do lead** — lista de `analysis_events` com window badge, data_source, snapshot short, cost. Link mono para copy do `cache_key`.
- Não tocar nas outras tabs.

### 3. Report drawer (`/admin/relatorios` → drawer)
`src/components/admin/v2/report-drawer.tsx` + endpoint `src/routes/api/admin/report-detail/...` (verificar caminho real):
- No header: badges `Janela` + `Origem dados` + `Concorrentes (n)`.
- Nova mini-secção entre "Estado e timing" e "Custos detalhados": **Análise & evento** — handle, `analysis_window`, `cache_key` (mono, copy), `data_source`, provider call status (já existe?), snapshot id short, competitor handles como chips.
- Se backend ainda não devolver estes campos, estender o endpoint de detail (`report-detail/$id`) com o mesmo join a `analysis_events`.

### 4. Helper partilhado
`src/lib/admin/analysis-window.ts`:
```ts
export type AnalysisWindow = "baseline" | "30d" | "90d" | "other";
export function deriveWindow(
  analysisWindow: string | null | undefined,
  cacheKey: string | null | undefined,
): AnalysisWindow {
  const aw = analysisWindow?.toLowerCase();
  if (aw === "30d" || aw === "90d" || aw === "baseline") return aw;
  const m = cacheKey?.match(/:w=(\d{1,3}d)$/i);
  if (m) {
    const v = m[1].toLowerCase();
    if (v === "30d" || v === "90d") return v;
    return "other";
  }
  return "baseline";
}
export function windowBadgeVariant(w: AnalysisWindow) {
  return w === "baseline" ? "neutral" : w === "30d" ? "info" : w === "90d" ? "revenue" : "neutral";
}
```

## Não tocar
- Schema (`credit_ledger`, `analysis_events` — sem alterações).
- Backend de credits / `analyze-public-v1` / providers.
- Customer-facing report.
- Free/Public flow.

## Validação
- Manual: `/admin/relatorios` mostra coluna "Janela" com `baseline`/`30d`/`90d` para os snapshots conhecidos (`683e4c21…` baseline, `3f8b1dcf…` 30d).
- Lead `01bf861c…` na nova tab "Créditos & análises" mostra: saldo 0/2, 5 movimentos com 2 pares reserve/confirm, janelas baseline + 30d distinguíveis.
- `bunx vitest run` (typecheck via build automática).
- Sanity: `psql -c "SELECT cache_key FROM credit_ledger LIMIT 5"` continua a casar com o parser.

## Ficheiros (novos / editados)
1. **NOVO** `src/lib/admin/analysis-window.ts` (helper)
2. **NOVO** `src/routes/api/admin/lead-credit-activity.$id.ts`
3. `src/routes/api/admin/report-requests.ts` (join + 5 campos novos na Row)
4. `src/components/admin/v2/relatorios/reports-table-section.tsx` (3 colunas + interface)
5. `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` (nova tab "Créditos")
6. `src/components/admin/v2/report-drawer.tsx` (badges + secção análise)
7. (Se existir) endpoint do drawer detail — estender com mesmo join

Sem alterações a i18n (admin é interno, PT-PT inline).
