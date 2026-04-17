

## Entendimento

**1. Fluxo landing → analyze → gate**: hero (`/`) → `/analyze/$username[?vs=h1,h2]` → `<PublicAnalysisDashboard>` (header + métricas + benchmark + concorrentes reais + premium gate) → `<ReportGateModal>` com quota server-side via `/api/request-full-report` (insere em `leads` + `report_requests`).

**2. Estado real de `/analyze/[username]`**: SSR-disabled, lê `?vs=` via `validateSearch`, chama `fetchPublicAnalysis(username, competitors)` no `useEffect` → `POST /api/analyze-public-v1`. Estados `loading | ready` com `<AnalysisSkeleton>` / `<AnalysisErrorState>` / `<PublicAnalysisDashboard>`. **Cada visita = nova chamada Apify.**

**3. Fluxo provider actual**: `/api/analyze-public-v1` valida payload (Zod), 1 call batched ao `instagram-profile-scraper` com `[primary, ...competitors]`, depois `Promise.allSettled` ao `instagram-post-scraper` por handle (12 posts via `directUrls`). Normaliza tudo via `normalizeProfile()` + `computeContentSummary()` → devolve `PublicAnalysisSuccess { profile, content_summary, competitors[], status }`. Boundary servidor sólido, `APIFY_TOKEN` em secret.

**4. Foundation Supabase**: 2 tabelas (`leads`, `report_requests`) com RLS fechado, escritas só via `supabaseAdmin` no server route. Trigger `set_updated_at()` partilhado. Sem tabela de análises hoje — cada análise é volátil.

**5. Porquê cache+snapshot agora antes de PDF/email**: cada análise consome 1 profile call + N post calls Apify. Sem cache, refresh do browser, share de link, ou reanálise dispara nova factura. Mais grave: PDF e email vão precisar de **referenciar** uma análise concreta (`snapshot_id`) para gerar o ficheiro/enviar — sem persistência, teria de re-scrapear no momento de gerar o PDF, duplicando custo e arriscando dados diferentes entre dashboard e PDF. Persistir o payload normalizado primeiro estabelece a *source of truth* sobre a qual PDF/email/admin/reanálise vão assentar. Cache de 24h é o equilíbrio entre frescura (Instagram move-se devagar à escala de 1 dia) e custo.

---

## Discrepâncias e decisões

**Snapshot key vs (username, vs)**: cache key determinística baseada em `lower(primary) + sort(lower(competitors))` joined com `|`. Ordenação alfabética dos concorrentes evita duplicar `nike|adidas,puma` vs `nike|puma,adidas` — a UI mostra a mesma comparação independente da ordem de input. Format: `v1:nike|adidas,puma`. Prefix `v1:` permite invalidar tudo no futuro mudando para `v2:` sem migração.

**Reanálise forçada**: adicionar `?refresh=1` à query como escape hatch server-side (não exposto na UI agora). Bypassa cache, força provider call, sobrescreve snapshot. Útil para dev e para um futuro botão "Atualizar análise" sem mudar contracto.

**Stale-while-error**: se provider falhar e existir snapshot expirado < 7 dias, devolver o expirado com `data_source: "stale"`. Robustez sem complicar — limite duro de 7 dias evita servir dados arqueologicamente velhos.

**`updated_at` trigger**: reusar `set_updated_at()` existente. Aplicar à nova tabela.

**RLS**: enable + zero policies. `supabaseAdmin` (service role) bypassa, browser não toca. Mesmo padrão de `leads`/`report_requests`.

**Frontend**: mudança mínima. `PublicAnalysisStatus` ganha `data_source: "fresh" | "cache" | "stale"` (substitui o actual `"apify_v1"` que era source-of-data, não freshness). Hint subtil opcional no header (decisão: **não adicionar UI hint agora** — guardrail diz "do not clutter"; basta que o backend devolva a info para uso futuro).

**Sem nova lib**: `createHash` do `node:crypto` já disponível no Worker runtime (nodejs_compat). Cache key é texto deterministico, hash não estritamente necessário, mas usado para coluna `cache_key` curta e indexável. **Decisão: sem hash** — cache key é human-readable (`v1:nike|adidas,puma`), cabe folgado em `text`, mais fácil de debugar.

---

## Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `supabase/migrations/{ts}_analysis_snapshots.sql` | **Criar** — tabela + trigger updated_at + indexes + RLS enabled (zero policies) | Não |
| `src/lib/analysis/cache.ts` | **Criar** — `buildCacheKey()`, `lookupSnapshot()`, `storeSnapshot()`, constantes TTL | Não |
| `src/lib/analysis/types.ts` | Editar — `PublicAnalysisStatus.data_source` passa a `"fresh" \| "cache" \| "stale"`; mantém `analyzed_at` | Não |
| `src/routes/api/analyze-public-v1.ts` | Editar — cache lookup antes do provider; após scrape persistir snapshot; stale-on-error fallback | Não |
| `src/lib/analysis/client.ts` | Não mexer (response shape estável) | Não |
| `src/routes/analyze.$username.tsx` | Não mexer | Não |
| `src/components/product/public-analysis-dashboard.tsx` | Não mexer (não usa `data_source` hoje) | Não |

**Zero ficheiros locked tocados.** Confirmar contra `mem://constraints/locked-files` antes de editar.

---

## Schema da tabela

```sql
CREATE TABLE public.analysis_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  instagram_username text NOT NULL,
  competitor_usernames jsonb NOT NULL DEFAULT '[]'::jsonb,
  normalized_payload jsonb NOT NULL,
  provider text NOT NULL DEFAULT 'apify',
  analysis_status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX idx_analysis_snapshots_expires_at ON public.analysis_snapshots (expires_at);
CREATE INDEX idx_analysis_snapshots_username ON public.analysis_snapshots (instagram_username);

CREATE TRIGGER set_updated_at_analysis_snapshots
  BEFORE UPDATE ON public.analysis_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.analysis_snapshots ENABLE ROW LEVEL SECURITY;
-- No policies: server-only via service role.
```

`UNIQUE` em `cache_key` permite `upsert` atómico (`onConflict: "cache_key"`).

---

## Cache key

```ts
function buildCacheKey(primary: string, competitors: string[]): string {
  const p = primary.toLowerCase();
  const c = [...competitors].map(s => s.toLowerCase()).sort();
  return `v1:${p}|${c.join(",")}`;
}
```

Exemplos:
- `("Nike", [])` → `v1:nike|`
- `("Nike", ["Adidas", "Puma"])` → `v1:nike|adidas,puma`
- `("Nike", ["Puma", "Adidas"])` → `v1:nike|adidas,puma` (mesma key)

---

## Fluxo do server route

```
1. validate payload (existing)
2. cacheKey = buildCacheKey(primary, competitors)
3. snapshot = SELECT * WHERE cache_key = $1
4. if snapshot && expires_at > now() && !refresh:
     return { ...snapshot.normalized_payload, status: { data_source: "cache", analyzed_at: snapshot.updated_at } }
5. try provider (existing scrape + normalize logic)
6. on success:
     payload = { profile, content_summary, competitors }  // sem status
     UPSERT snapshot (cache_key, payload, expires_at = now() + 24h, ...)
     return { ...payload, status: { data_source: "fresh", analyzed_at: now() } }
7. on provider failure:
     if snapshot && (now() - snapshot.created_at) < 7 days:
       return { ...snapshot.normalized_payload, status: { data_source: "stale", analyzed_at: snapshot.updated_at } }
     else:
       return failure(UPSTREAM_FAILED)
```

**Snapshot stored shape**: o `normalized_payload` guarda `{ profile, content_summary, competitors }` — **sem** o campo `status`. O `status` é sempre re-calculado na resposta (depende de cache vs fresh vs stale, e do `analyzed_at` correcto).

---

## TypeScript — shape update

```ts
export interface PublicAnalysisStatus {
  success: true;
  data_source: "fresh" | "cache" | "stale";
  analyzed_at: string; // ISO timestamp
}
```

Remoção de `"apify_v1"`. Se algo no frontend depender da string antiga (não depende — grep confirmará), ajustar.

---

## Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem PDF / email / pagamentos / auth / IA / admin | ✅ |
| Sem novas dependências | ✅ |
| Provider só server-side | ✅ |
| Secrets em Supabase | ✅ |
| UI sem caching/persistência | ✅ |
| Locked files intactos | ✅ |
| pt-PT impessoal | ✅ |
| Comentários em inglês | ✅ |
| RLS fechado por defeito | ✅ |
| Future-ready (PDF/email referenciam `snapshot.id`) | ✅ |

---

## Checkpoints

- ☐ Migração `analysis_snapshots` criada (tabela + trigger + indexes + RLS)
- ☐ `cache.ts` com `buildCacheKey` deterministica + helpers de lookup/store
- ☐ `PublicAnalysisStatus.data_source` actualizado para `"fresh" | "cache" | "stale"`
- ☐ Server route consulta cache antes de chamar Apify
- ☐ Snapshot persistido após scrape bem-sucedido (upsert por `cache_key`)
- ☐ Stale-on-error fallback (≤ 7 dias) implementado
- ☐ `?refresh=1` escape hatch server-side
- ☐ Frontend continua funcional sem mudanças visuais
- ☐ Sem PDF/email/pagamentos/auth/IA/admin introduzidos

