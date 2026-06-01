## Objetivo

Adicionar monitorização ligeira da persistência de thumbnails (já existe a função `persistThumbnailsInPayload` com contadores estruturados — só faltam persistência + visualização).

Sem mexer em UI de relatório, providers ou lógica de persistência em si.

## 1. Migration — tabela `thumbnail_persistence_runs`

Aditiva, só admin/service_role lê. Campos:

- `id uuid PK`
- `created_at timestamptz default now()`
- `cache_key text not null`
- `handle text not null`
- `attempted int not null`
- `stored int not null`
- `failed_403 int not null default 0`
- `failed_timeout int not null default 0`
- `failed_invalid_content_type int not null default 0`
- `failed_upload int not null default 0`
- `failed_other int not null default 0`
- `avatar text not null` (`'ok' | 'fail' | 'none'`)
- `duration_ms int`

GRANT a `service_role` apenas. RLS enabled, sem policies (acesso só via `supabaseAdmin`).

Índice `(created_at desc)` para listar últimas 10.

## 2. Escrita — `src/lib/analysis/cache.ts`

No bloco onde já corre `persistThumbnailsInPayload(...)` e loga `[thumbnails]`, adicionar um `supabaseAdmin.from("thumbnail_persistence_runs").insert({...})` best-effort dentro do mesmo try (com `.then().catch(() => {})` ou try/catch isolado para nunca falhar a análise). Sem novo módulo separado — mantém o contexto perto do uso.

Nada muda em `persist-thumbnails.server.ts`. `PersistSummary` já tem todos os campos necessários.

## 3. ServerFn de leitura — `src/lib/admin/thumbnail-monitor.functions.ts`

`createServerFn({ method: "GET" })` com `requireAdminAuth` (mesmo padrão dos restantes admin functions). Devolve:

```ts
{
  recent: Array<{ created_at, handle, cache_key, attempted, stored, failed_403, failed_timeout, failed_invalid_content_type, failed_upload, failed_other, avatar, duration_ms }>,  // últimas 10
  aggregate: {
    runs: number,                  // últimos 50 ou últimos 7 dias
    total_attempted: number,
    total_stored: number,
    success_rate: number,          // stored / attempted
    failures_by_reason: { failed_403, failed_timeout, failed_invalid_content_type, failed_upload, failed_other }
  }
}
```

Janela do agregado: últimos 7 dias (`created_at >= now() - interval '7 days'`).

## 4. Card admin — `src/components/admin/v2/sistema/thumbnail-persistence-card.tsx`

Card pequeno seguindo padrão dos restantes (`visual-cover-debug-card.tsx` como referência). Mostra:

- KPI: taxa de sucesso média (7d) + total tentados/armazenados
- Breakdown de falhas por razão (lista compacta)
- Tabela das últimas 10 runs: `handle`, `attempted`, `stored`, razão de falha dominante, `avatar`, idade relativa

Inter / tabular-nums para números, tokens semânticos (sem cores hardcoded). Sem mudar copy do relatório.

## 5. Montagem em `src/routes/admin.sistema.tsx`

Adicionar `<ThumbnailPersistenceCard />` na secção "Estado do sistema" (junto ao `HealthSection`/`visual-cover-debug-card`).

## 6. Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (testes existentes de persist-thumbnails continuam a passar — sem alterar a função)

## Ficheiros tocados

- Nova migration `supabase/migrations/<ts>_thumbnail_persistence_runs.sql`
- `src/lib/analysis/cache.ts` (insert best-effort após persistência)
- Novo `src/lib/admin/thumbnail-monitor.functions.ts`
- Novo `src/components/admin/v2/sistema/thumbnail-persistence-card.tsx`
- `src/routes/admin.sistema.tsx` (montar card)

## Fora de âmbito

- UI do relatório
- Lógica de providers / `persistOne`
- Schema do `PersistSummary`

## Checklist

- ☐ Migration aplicada
- ☐ Insert best-effort no cache (nunca falha análise)
- ☐ ServerFn admin com auth
- ☐ Card no /admin/sistema
- ☐ tsc + vitest verdes