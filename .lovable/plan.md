

## Plano: Fase 1 (bugs críticos) + Persistência no Cloud

Combino as direcções 2 e 3: corrigir os bugs da auditoria **e** ligar o gate modal ao Lovable Cloud (`report_requests` table com RLS).

---

### Parte A — Bugs críticos (Fase 1 da auditoria)

**A1. `__root.tsx` — pt-PT em todo o root**
- `<html lang="en">` → `<html lang="pt-PT">`
- Todos os meta tags (title, description, og:*, twitter:*) em pt-PT
- 404 page copy em pt-PT ("Página não encontrada", etc.)

**A2. `hero-action-bar.tsx` — validação rigorosa de username** ⚠️ **LOCKED FILE**
- Confirmar com utilizador antes de tocar (ver questão abaixo)
- Adicionar regex `/^[A-Za-z0-9._]{1,30}$/` após `extractUsername`
- Normalizar para lowercase antes de navegar
- Mensagem específica pt-PT: "Username inválido. Apenas letras, números, ponto e underscore."

**A3. `report-gate-modal.tsx` — reset síncrono**
- Mover lógica de reset do `useEffect` com `setTimeout(200)` para handler `handleOpenChange` directo
- Eliminar flash visual ao reabrir rapidamente

**A4. `analysis-header.tsx` — renderizar `displayName`**
- Adicionar nome editorial (Fraunces) acima do `@handle` mono
- Hierarquia: nome > handle > categoria/seguidores

---

### Parte B — Persistência Cloud (substituir mock submit)

**B1. Migração: tabela `report_requests`**
```sql
create table public.report_requests (
  id uuid primary key default gen_random_uuid(),
  username text not null,           -- handle analisado
  name text not null,
  email text not null,
  company text,
  rgpd_accepted_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.report_requests enable row level security;

-- Public insert (gate é anónimo — sem auth ainda)
create policy "Anyone can submit report requests"
  on public.report_requests for insert
  to anon, authenticated
  with check (true);

-- Sem SELECT policy → ninguém lê via client (admin-only futuramente)

create index idx_report_requests_email on public.report_requests(email);
create index idx_report_requests_created_at on public.report_requests(created_at desc);
```

**B2. `report-gate-modal.tsx` — wiring Supabase**
- Importar `supabase` de `@/integrations/supabase/client`
- Substituir `setTimeout(900)` mock por `supabase.from('report_requests').insert(...)`
- Manter o delay artificial mínimo (ex: garantir UX de 600ms via `Promise.all([insert, delay])`) para sensação premium
- Tratar erro com mensagem pt-PT calma: "Não foi possível processar o pedido. Tentar novamente."
- Manter prop `onSubmit` opcional como override (futuro: quotas, edge functions)

**Nota:** Não envio email ainda (fora do escopo desta sub-tarefa). Próximo prompt liga Resend/Lovable Email.

---

### Ficheiros tocados

| Ficheiro | Mudança | Locked? |
|---|---|---|
| `src/routes/__root.tsx` | `lang="pt-PT"` + meta tags + 404 copy | Não |
| `src/components/landing/hero-action-bar.tsx` | Validação regex + lowercase | ⚠️ **Sim** |
| `src/components/product/report-gate-modal.tsx` | Reset síncrono + Supabase insert | Não |
| `src/components/product/analysis-header.tsx` | Renderizar displayName | Não |
| Migração SQL | Criar `report_requests` + RLS | — |

---

### Confirmar antes de avançar

1. **Autorizo tocar em `hero-action-bar.tsx` (locked)?** Sem isso, A2 fica de fora e o user pode submeter `/analyze/!!!`.
2. **Política RLS de SELECT em `report_requests`**: por agora **nenhuma** (só insert público) — leitura admin será adicionada quando houver auth + roles. OK?
3. **`displayName` (A4)**: render como `<p>` Fraunces 18px medium acima do `@handle` (que fica como mono secundário). Confirmas?

