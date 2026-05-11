## Alinhar cache de perfis-teste do `/admin/sistema` à retenção de 15 dias

### Auditoria — TTL actual

| Camada | Estado |
|---|---|
| Source of truth (`src/lib/report/retention.ts`) | `CACHE_TTL_DAYS = 15` ✓ |
| `storeSnapshot` em `src/lib/analysis/cache.ts` | já usa `CACHE_TTL_MS` (15d) ✓ |
| Caminho de refresh (`/api/admin/refresh-profile` → `analyze-public-v1?refresh=1` → `storeSnapshot`) | já 15d ✓ |
| Linhas existentes em `analysis_snapshots` para perfis-teste | **3 a 11 dias** (escritas antes da migração para 15d) ✗ |
| UI do card (`test-profiles-card.tsx`) | mostra `expires_at` correctamente, mas usa relativos vagos ("Válida há 3 dias") em vez de "Expira em X dias" |
| "Abrir relatório" no card | aponta para `/analyze/$username` (rota bloqueada que aciona o pipeline público) ✗ |

Ou seja, **a infraestrutura já está em 15 dias** — falta (a) backfill das linhas antigas para a UI deixar de mostrar TTLs curtos, (b) trocar o link de "Abrir relatório" para a snapshot-route que já existe (`/admin/report-preview/snapshot/$snapshotId`), e (c) afinar a cópia.

### Plano

#### Passo 1 — Migração de backfill (15d)

Nova migration: para cada linha de `analysis_snapshots` cujo `expires_at < created_at + 15 days` e que ainda não esteja propositadamente expirada (ou seja, `expires_at > now()` OU dentro da janela 15d), recalcular `expires_at = greatest(expires_at, created_at + interval '15 days')`. Para snapshots já passados de 15d desde `created_at`, deixar como estão (são genuinamente expirados).

```sql
update public.analysis_snapshots
set expires_at = created_at + interval '15 days'
where expires_at < created_at + interval '15 days'
  and created_at + interval '15 days' > now();
```

Isto **estende** TTLs encurtados para a janela completa, sem ressuscitar dados verdadeiramente antigos. Sem deletes. Sem recálculo de payload.

#### Passo 2 — Expor `latestSnapshotId` em `TestProfileStatus`

Em `src/server/admin/execution-mode.functions.ts`:
- adicionar `latestSnapshotId: string | null` à interface
- popular a partir de `snap?.id ?? null`

#### Passo 3 — Card: link "Abrir relatório" para snapshot

Em `src/components/admin/v2/sistema/test-profiles-card.tsx` substituir:

```tsx
<Link to="/analyze/$username" params={{ username: p.handle }}>
  Abrir relatório
</Link>
```

por:

```tsx
{p.latestSnapshotId && !isExpired ? (
  <Link to="/admin/report-preview/snapshot/$snapshotId" params={{ snapshotId: p.latestSnapshotId }}>
    Abrir relatório
  </Link>
) : (
  <button disabled title={isExpired ? "Cache expirada — usar Atualizar agora." : "Sem snapshot guardada."}>
    Abrir relatório
  </button>
)}
```

Garante que `Abrir relatório` **nunca** chama provider — vai à snapshot exacta. `Atualizar agora` mantém-se como único botão que toca em provider.

#### Passo 4 — Cópia alinhada

Na linha de metadata do card, quando `expiresAt` existe e não está expirada, mostrar:
- `Expira em N dias` (em vez de "Válida há …") — usando `Math.ceil((expiresAt - now)/86_400_000)`
- Tooltip permanece `Cache válida até DD/MM/YYYY`
- Quando expirada: `Pronto para atualizar` + ícone âmbar (em vez de "Expirada há …"), tooltip `Cache expirou em DD/MM/YYYY`

Sem hardcoded colors novos — reutilizar paleta admin já presente (`#BA7517` âmbar / `#1D9E75` verde já em uso no ficheiro).

#### Passo 5 — Toggle de modo (verificação, sem alteração)

Confirmar (apenas leitura) que `getExecutionMode` continua a respeitar `cache_only` e que `analyze-public-v1` só chama provider quando recebe `?refresh=1` + `INTERNAL_API_TOKEN`. Isto já está garantido pela infra existente — sem mudanças.

#### Passo 6 — Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual em `/admin/sistema`:
  - depois da migration, `frederico.m.carvalho` e `martimsilvai` mostram "Expira em ~15 dias" para os snapshots cuja idade é `< 15d`
  - cliquei em "Abrir relatório" → URL é `/admin/report-preview/snapshot/<uuid>`, sem chamadas a `/api/analyze*`
  - "Atualizar agora" continua a funcionar e deixa o snapshot com `expires_at = now + 15d`
  - se um snapshot estiver para lá dos 15d, "Abrir relatório" fica disabled e "Atualizar agora" é a única acção activa

### Constrangimentos respeitados

- Sem chamadas a providers (Apify/OpenAI/DataForSEO) nesta tarefa.
- Sem deletes nem regeneração de relatórios.
- Sem mexer em UI pública nem em email/Brevo.
- Sem editar `analyze.$username.tsx` (locked).
- TTL referenciado sempre via `CACHE_TTL_DAYS` / `CACHE_TTL_MS` da source of truth.

### Ficheiros a tocar

- `supabase/migrations/<timestamp>_backfill_snapshot_retention_15d.sql` (novo)
- `src/server/admin/execution-mode.functions.ts` (+ `latestSnapshotId`)
- `src/components/admin/v2/sistema/test-profiles-card.tsx` (link + cópia)

### Checkpoints

- ☐ Migration aplicada e verificada via `psql`
- ☐ Card mostra "Expira em N dias" para snapshots válidas
- ☐ "Abrir relatório" usa `/admin/report-preview/snapshot/$snapshotId`
- ☐ "Abrir relatório" disabled quando expirado
- ☐ `tsc` + `vitest` verdes
