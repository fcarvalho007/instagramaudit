# Diagnóstico — "conta apagada no /admin continua a existir"

## TL;DR
O bulk-delete do `/admin` **só apaga leads + dependentes**. **Não apaga `auth.users`**. O `check-email` consulta `leads` E `auth.users` (defesa em profundidade) → vê o auth user órfão e responde `exists: true`. Resultado: o utilizador é mandado para o ecrã de login de uma conta que o admin "apagou".

Confirmado no DB para os dois emails de teste:

| Email | auth.users | leads |
|---|---|---|
| `fredericodigital@gmail.com` | ✅ existe (`c70e200d…`) | ✅ existe (`c5e5c43c…`) |
| `frederico.carvalho@digitalfc.pt` | ✅ existe (`f7d12047…`) | ✅ existe (`b5eb4450…`) |

(Nenhum apagado neste momento — mas o problema reproduz-se assim que apagares pelo /admin: o lead some, o auth fica.)

## 1. O que o "delete" do /admin faz hoje

Ficheiro: `src/routes/api/admin/leads-bulk.ts` (DELETE)

Ordem hard-delete (sem transação cross-table):
1. `profiles.lead_id := NULL` (unlink)
2. `beta_feedback` DELETE WHERE lead_id IN (…)
3. `report_snapshots` DELETE
4. `report_requests` DELETE
5. `product_events` DELETE
6. `leads` DELETE
7. Audit em `product_events` (`leads_bulk_deleted`)

**Não toca em**: `auth.users`, `lead_payments`, `credit_ledger`, `lead_entitlements`, `lead_report_unlocks`, `coupon_redemptions`, `lead_reports`, sessões/cookies. Sem soft-delete; sem `archived_at`.

## 2. Tabelas envolvidas numa "conta"
- `auth.users` (Supabase Auth)
- `public.profiles` (1:1 com auth.users, FK opcional para `leads`)
- `public.leads` (email_normalized)
- `public.report_requests`, `report_snapshots`, `lead_reports`
- `public.lead_payments`, `credit_ledger`, `lead_entitlements`, `lead_report_unlocks`, `coupon_redemptions`
- `public.beta_feedback`, `product_events`
- Sessão: cookie `lead_session` (assinado, server-side), `localStorage` `onboarding_draft_*`

## 3. O que o `check-email` usa
`src/routes/api/onboarding/check-email.ts`:
1. `findLead(email_normalized)` em `public.leads`
2. Se não encontrou → `authUserExists()` paginando `auth.admin.listUsers()`
3. `exists = lead || auth_user` (fail-closed: erro = exists)
4. **Não filtra por** `archived`/`deleted` (não existem essas colunas)

## 4. Porque é que some no /admin mas o check-email diz que existe
Causa #1 (confirmada pelo código): **o admin apaga `leads`, mas `auth.users` sobrevive** → `authUserExists()` devolve `true` → modal abre ecrã de login.

Causas secundárias possíveis (ordenadas por probabilidade):
- **Auth user órfão** ← raiz.
- `handle_new_user` trigger: ao tentares recriar conta, qualquer `auth.users` INSERT recria automaticamente o lead — portanto se o utilizador tentou re-signup entretanto, o lead "reaparece". Ver `public.handle_new_user()`.
- Cookie `lead_session` antigo no browser (irrelevante para check-email, mas pode dar sensação de "já estou logado").
- `localStorage` `onboarding_draft_*` (só pre-fill, não decide exists).
- Não há cache server-side de check-email.
- Normalização: `email.toLowerCase().trim()` consistente entre `leads.email_normalized`, `check-email` e trigger. Sem mismatch.

## 5. Ficheiros / funções implicados
- `src/routes/api/admin/leads-bulk.ts` — DELETE incompleto.
- `src/routes/api/onboarding/check-email.ts` — `findLead` + `authUserExists`.
- `src/routes/api/onboarding/start.ts` — também rejeita se `admin.createUser` falhar com email duplicado.
- `public.handle_new_user()` trigger — recria `leads` a partir de `auth.users`.
- `src/lib/admin/session.ts` — gate admin.
- UI: o componente que chama `DELETE /api/admin/leads-bulk` (admin leads page).

## 6. Regra de produto recomendada — opção D
Duas acções distintas no /admin:

**Archive** (default, GDPR-safe)
- marca `leads.archived_at = now()`
- esconde de listas activas
- **mantém** `auth.users`, pagamentos, créditos, snapshots, audit
- check-email continua a devolver `exists: true` (conta ainda válida)

**Delete permanently** (test/GDPR-erasure)
- apaga `auth.users` via `auth.admin.deleteUser(userId)` (cascata via `profiles.id` FK e trigger limpa o resto)
- apaga `leads` + dependentes (como hoje)
- invalida cookies `lead_session` (rotaciona `SESSION_SECRET`? não — apenas confiar no JWT do auth user já apagado)
- **bloqueada** se existir `lead_payments` com `status='paid'` (proteção anti-perda contabilística), excepto se admin marcar checkbox "I understand"

## 7. Caminho de implementação mais seguro
1. **Migration**: adicionar `leads.archived_at timestamptz NULL` (índice parcial `WHERE archived_at IS NULL`).
2. **Novo endpoint** `POST /api/admin/leads/$id/archive` (soft).
3. **Refactor** `DELETE /api/admin/leads-bulk` → `mode: 'archive' | 'purge'`. Em `purge`:
   - lookup `auth.users.id` por email (via `auth.admin.listUsers` paginado ou nova função SECURITY DEFINER `public.find_auth_user_by_email(email)`).
   - guarda check: bloquear se `lead_payments.status='paid'` (override explícito).
   - `auth.admin.deleteUser(userId)` antes do delete em `leads` (ordem importa: trigger `handle_new_user` não reage a deletes).
   - apagar dependentes em falta: `lead_payments`, `credit_ledger`, `lead_entitlements`, `lead_report_unlocks`, `coupon_redemptions`, `lead_reports`.
   - audit em `product_events` (`leads_purged`).
4. **check-email**: filtrar leads com `archived_at IS NOT NULL` → tratar como `exists: false` apenas se também não houver auth user.
5. **Admin UI** ganha:
   - botão "Arquivar" (default)
   - botão "Apagar definitivamente (teste)" com confirmação dupla
   - secção **"Auth users órfãos"** que lista `auth.users` sem `leads` correspondente — botão para sanar (criar lead OU apagar auth).
6. **Backfill imediato**: script admin one-shot que apaga os 2 auth users de teste + leads.

## 8. Riscos
- **Apagar utilizador pago** → perda de histórico contabilístico/GDPR. Mitigado por bloqueio em `lead_payments.status='paid'`.
- **Apagar audit** → manter `product_events` com `lead_id NULL` mas snapshot do email/lead_id antes do delete.
- **Snapshots órfãos** (`report_snapshots` sem lead) → já apagados em cascata.
- **Cookies `lead_session` válidos** mesmo após delete → expiram em 7d; aceitável porque qualquer chamada autenticada falha ao validar `auth.users`.
- **GDPR**: archive ≠ erasure; "Delete permanently" é a única que satisfaz Art. 17 (right to erasure). Documentar.

## Checks SQL manuais
```sql
-- Auth users órfãos (existem em auth mas não em leads)
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.leads l ON l.email_normalized = lower(u.email)
WHERE l.id IS NULL;

-- Leads órfãos (existem em leads mas não em auth)
SELECT l.id, l.email, l.created_at
FROM public.leads l
LEFT JOIN auth.users u ON lower(u.email) = l.email_normalized
WHERE u.id IS NULL;

-- Estado dos 2 emails de teste
SELECT 'auth' src, id::text, email FROM auth.users
WHERE lower(email) IN ('fredericodigital@gmail.com','frederico.carvalho@digitalfc.pt')
UNION ALL
SELECT 'lead', id::text, email FROM public.leads
WHERE email_normalized IN ('fredericodigital@gmail.com','frederico.carvalho@digitalfc.pt');

-- Pagamentos por email (proteção pré-purge)
SELECT p.* FROM public.lead_payments p
JOIN public.leads l ON l.id = p.lead_id
WHERE l.email_normalized = '<email>';
```

## QA checklist
1. Criar conta com email X no modal → confirma lead + auth user.
2. /admin → "Apagar definitivamente" → confirma 0 rows em `auth.users` e `leads` para X.
3. Reabrir modal e introduzir X → `check-email` devolve `exists:false` → vai para signup.
4. Repetir mas com **Archive** → check-email continua `exists:true`, login funciona, lead some das listas activas.
5. Tentar purge num lead com `lead_payments.status='paid'` → bloqueado, exige override.
6. Lista de auth órfãos no /admin mostra zero após purge.
7. Cookie antigo após purge → qualquer rota autenticada devolve 401 (auth user já não existe).
