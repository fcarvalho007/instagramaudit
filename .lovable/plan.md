## Dedup `report_viewed` — reforço cliente + servidor

### Diagnóstico

Ambas as defesas pedidas no prompt **já existem no código**:

- **Cliente** (`src/routes/analyze.$username.tsx:291-305`): `useRef<Set<string>>` guarda snapshots já registados na sessão montada.
- **Servidor** (`src/lib/tracking.functions.ts:54-78`): janela de 5s por `snapshot_id` + `lead_id` + `event_type`.

Apesar disso, a base de dados continua a registar **4 eventos por minuto** para o mesmo lead/snapshot (consistente em 2026-05-09 12:37 → 12:59). Investigação:

- Único call site é `analyze.$username.tsx`. Sem origens paralelas.
- Padrão "4 por minuto" + clusters de 2-4ms entre eventos = **race condition no servidor**: várias requests chegam quase em simultâneo (provável StrictMode dev × re-mount em navegação), todas fazem `SELECT` antes de qualquer `INSERT` ter completado, todas passam o check, todas inserem.
- O `useRef` cliente não cobre **remounts entre route changes** nem **múltiplos tabs/refreshes**, mas o principal contribuidor é mesmo o servidor.

### Mudanças propostas

**1. `src/routes/analyze.$username.tsx` — endurecer dedup cliente**

Substituir o `useRef<Set>` (escopo por mount) por um **module-level `Set`** que sobrevive a re-mounts dentro do mesmo SPA load. Combinar com `sessionStorage` para sobreviver a refreshes do mesmo tab durante a sessão de browser.

```ts
// no topo do ficheiro
const TRACKED_SNAPSHOTS = new Set<string>();
const SESSION_STORAGE_KEY = "ib:tracked_report_views";

function hasTrackedSnapshot(snapshotId: string): boolean {
  if (TRACKED_SNAPSHOTS.has(snapshotId)) return true;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    if (arr.includes(snapshotId)) {
      TRACKED_SNAPSHOTS.add(snapshotId);
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

function markSnapshotTracked(snapshotId: string) {
  TRACKED_SNAPSHOTS.add(snapshotId);
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    if (!arr.includes(snapshotId)) {
      arr.push(snapshotId);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(arr.slice(-50)));
    }
  } catch { /* ignore */ }
}
```

No `useEffect` substituir o ref por estas helpers. Defensivo: `try/catch` em torno de `sessionStorage` para SSR-safety (no browser apenas).

**2. `src/lib/tracking.functions.ts` — pattern "insert + cleanup" para fechar a race**

Após o `await recordProductEvent(...)` (apenas para `report_viewed` com `snapshotId` + `leadId` resolvidos), fazer um `SELECT` dos eventos `report_viewed` para esse `(snapshot_id, lead_id)` criados nos últimos 5s, ordenados por `created_at ASC`. Se vierem >1, apagar todos exceto o primeiro (mais antigo). Fail-open: erros aqui são silenciosos.

```ts
if (data.eventType === "report_viewed" && data.snapshotId && leadId) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sinceIso = new Date(Date.now() - 5_000).toISOString();
    const { data: rows } = await (supabaseAdmin as any)
      .from("product_events")
      .select("id, created_at")
      .eq("event_type", "report_viewed")
      .eq("snapshot_id", data.snapshotId)
      .eq("lead_id", leadId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true });
    if (rows && rows.length > 1) {
      const idsToDelete = rows.slice(1).map((r: any) => r.id);
      await (supabaseAdmin as any)
        .from("product_events")
        .delete()
        .in("id", idsToDelete);
    }
  } catch { /* fail open */ }
}
```

Isto converge para 1 evento mesmo quando 4 requests passam o check de pré-insert em paralelo. Pequeno custo: 1 extra SELECT + DELETE condicional por `report_viewed`.

### Ficheiros tocados

- `src/routes/analyze.$username.tsx` — substituir ref por módulo-level Set + sessionStorage
- `src/lib/tracking.functions.ts` — adicionar bloco "insert + cleanup" após o `recordProductEvent`

### Fora de scope (confirmado)

- Sem alterações em UI do report.
- Sem alterações de schema.
- Sem chamadas a Apify/OpenAI/DataForSEO/Resend.
- Sem remoção de duplicados históricos (eventos antigos permanecem).

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Smoke manual: abrir `/analyze/frederico.m.carvalho` em produção 2x, navegar entre rotas, refrescar, e confirmar via `SELECT count(*) FROM product_events WHERE event_type='report_viewed' AND created_at > now() - interval '2 minutes'` que cresce de forma 1-por-visita.

### Output esperado

- `client dedup` reforçado (module-level + sessionStorage)
- `server dedup` reforçado com cleanup pós-insert (resolve race)
- Resultados de tsc + vitest
