# Diagnóstico: contas orfãs invisíveis em /admin

## Resumo executivo

`frederico.carvalho@digitalfc.pt` **existe** em `auth.users` (id `f7d12047-…`, criado `2026-06-09 12:52:19`, `email_confirmed_at = NULL`) e em `public.profiles`, mas **não existe** em `public.leads`. /admin lista exclusivamente `leads`, por isso o email é invisível. Não é caso isolado — todos os 4 utilizadores em `auth.users` estão sem `lead` correspondente, e todas as 9 leads são pré-flow password (sem `auth.users`).

## Mapa do fluxo actual

### Detecção de "email existe" (modal de onboarding)

`POST /api/onboarding/check-email` (`src/routes/api/onboarding/check-email.ts`, função `findLead`)
- Consulta **apenas** `public.leads` por `email_normalized`.
- `auth.users` **não** é consultada.
- Em erro de DB, devolve `exists: true` por segurança (fail-closed).

`POST /api/onboarding/start` (`src/routes/api/onboarding/start.ts`, função `createAuthUser` → `upsertLead`)
- Tenta `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })`.
- Se o email já estiver em `auth.users` (status 422 / "already registered"), devolve `409 EMAIL_ALREADY_EXISTS` e o cliente salta para `LoginPanel`.
- Só corre `upsertLead` **depois** do `createUser` ter sucesso — é uma criação não transacional, mas neste path os dois passos correm juntos.

### Listagem de /admin

`GET /api/admin/leads-kanban` (`src/routes/api/admin/leads-kanban.ts`, linha 36)
- `supabaseAdmin.from("leads").select("*").order(...)`.
- Não junta `auth.users`, nem `profiles`, nem `report_requests`. Lead sem registo na tabela `leads` ⇒ invisível.
- `/api/admin/leads-funnel` e `/api/admin/follow-ups` lêem o mesmo conjunto.

### Path que cria `auth.users` sem `leads` (a causa raiz)

`src/routes/signup.tsx` (linha 61): página pública `/signup` chama `supabase.auth.signUp` **directamente do browser**. Cria a auth user e nada mais — nunca toca em `/api/onboarding/start`, logo nunca cria `leads`, nunca atribui créditos, nunca regista qualificação.

Outros paths que tocam auth mas não criam lead:
- `/login` (sign-in com password de uma conta já existente) — não cria nada novo.
- `/reset-password` — só faz `resetPasswordForEmail` / `updateUser`, não cria conta.
- `autoLogin` (admin beta shortcut) — `admin.createUser` para o email allowlist, sem lead. Gated por `BETA_AUTOLOGIN=1`.

### Recuperação parcial existente

`POST /api/onboarding/claim-existing` (`src/routes/api/onboarding/claim-existing.ts`, `findOrCreateLeadForEmail`) **já** cria lazy uma lead quando o utilizador faz login no modal e o lead não existe (`source: 'otp_claim'`). Funciona, mas só é chamada quando o user completa um login no modal — não corre no `/login` standalone, nem retroactivamente para os 3 orfãos actuais.

## Source-of-truth mismatch

| Pergunta | Resposta |
| --- | --- |
| Onde o onboarding decide "exists"? | `public.leads.email_normalized` |
| Onde a criação real acontece? | `auth.users` (via /start ou /signup) |
| Onde /admin lê? | `public.leads` |
| Pode auth user existir sem lead? | **Sim** — actualmente 4/4 |
| Pode lead existir sem auth user? | **Sim** — actualmente 9/9 (todos os antigos `public_report_unlock`) |
| Resultado | O conceito "conta" está fragmentado em duas tabelas que não se mantêm sincronizadas. /admin vê metade da realidade. |

## Onde está o email exemplo

| Tabela | Presente? | Notas |
| --- | --- | --- |
| `auth.users` | ✅ | id `f7d12047-4c27-4777-8bd2-6626b7982f33`, `email_confirmed_at = NULL` ⇒ veio de `/signup` (que não usa `email_confirm: true`) |
| `public.profiles` | ✅ | criado pelo trigger `handle_new_user`; `lead_id = NULL` porque não há lead para ligar |
| `public.leads` | ❌ | nunca passou no `/api/onboarding/start` nem completou login no modal (que dispararia `claim-existing`) |
| `report_requests`, `credit_ledger`, `lead_payments` | ❌ | dependem de `lead_id` |

## Ficheiros / funções envolvidos

- `src/routes/api/onboarding/check-email.ts` (`findLead`)
- `src/routes/api/onboarding/start.ts` (`handleOnboardingStart`, `createAuthUser`, `upsertLead`)
- `src/routes/api/onboarding/claim-existing.ts` (`findOrCreateLeadForEmail`)
- `src/routes/signup.tsx` (causa raiz: cria auth user sem lead)
- `src/routes/api/admin/leads-kanban.ts` (consumidor: só lê `leads`)
- Trigger `public.handle_new_user` em `auth.users` (cria profile, tenta `link_user_to_existing_reports` por email — falha em silêncio quando não há lead)

## Tabelas envolvidas

`auth.users`, `public.profiles`, `public.leads`, `public.report_requests`, `public.credit_ledger`, `public.lead_payments`.

## Fix recomendado (a aprovar antes de qualquer edição)

Política proposta: **toda a auth user tem uma lead correspondente; /admin lista a partir da união consistente das duas, com `leads` como tabela canónica**.

Fix mínimo seguro, em três camadas, sem mudar checkout / créditos / reports / fluxo de auth:

1. **Backfill** dos 4 orfãos actuais via migration (lead com `source = 'auth_backfill'`, `email_normalized = lower(u.email)`, nome derivado do `raw_user_meta_data.full_name` ou local-part). Reaproveita o trigger `handle_new_user` para ligar `profiles.lead_id` automaticamente.
2. **Estender o trigger `handle_new_user`** para criar a `lead` quando ainda não existir (em vez de só ligar). Garante que **qualquer** caminho que crie `auth.users` (modal, /signup, autoLogin, futuros OAuth) deixa lead em DB. Mantém `source` por origem (`auth_signup`, `oauth`, etc.).
3. **Endurecer `check-email`** para consultar também `auth.users` via `supabaseAdmin.auth.admin.listUsers` (ou um índice/RPC dedicado) — assim o modal mostra o login screen logo na entrada para emails que existam só em `auth`, sem ter de chegar ao `/start` para descobrir. Continua fail-closed em erro.

Camadas 1 e 2 resolvem a invisibilidade em /admin. Camada 3 melhora a UX (evita o atalho actual em que `check-email` diz "novo" e `/start` rejeita 409).

## Riscos

- **Trigger em `auth.users`**: a regra é "não tocar no schema `auth`". A solução é colocar o trigger no schema `public` apontando para `auth.users` (já é o que `handle_new_user` faz) — mantém-se essa convenção.
- **Backfill com nome vazio**: usar `local-part(email)` como fallback é consistente com o que `claim-existing` já faz (`args.email.split("@")[0]`).
- **`gdpr_consent_at` = NULL** nos backfilled: deve-se manter NULL (não fabricar consentimento). /admin precisa de saber filtrar leads sem consent — verificar se o kanban já tolera `null` aqui (sim, é só uma timestamp informativa).
- **Race condition entre /start e trigger**: `/start` chama `admin.createUser` (dispara o trigger → lead lazy criada) e a seguir corre `upsertLead`. O upsert por `email_normalized` já é idempotente, mas há uma janela em que o trigger cria a lead com defaults e o `/start` faz update. Aceitável — `upsertLead` faz `UPDATE` quando encontra a lead.
- **Detecção via `admin.listUsers`** em `check-email`: O list está paginado (50/req por defeito). Para >50 utilizadores, usar `listUsers({ page, perPage })` em loop ou criar uma função RPC `auth_user_exists(email)` security definer. Não introduzir antes de medir.

## Verificações manuais (SQL e admin)

```sql
-- 1. Quantos orfãos auth↔lead existem hoje
SELECT
  (SELECT count(*) FROM auth.users) AS auth_users,
  (SELECT count(*) FROM public.leads) AS leads,
  (SELECT count(*) FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.leads l
                      WHERE l.email_normalized = lower(u.email))) AS auth_sem_lead,
  (SELECT count(*) FROM public.leads l
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u
                      WHERE lower(u.email) = l.email_normalized)) AS lead_sem_auth;
-- Estado actual: 4 / 9 / 4 / 9.

-- 2. Lista detalhada dos orfãos auth-only
SELECT u.id, u.email, u.created_at, u.email_confirmed_at, p.lead_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE NOT EXISTS (SELECT 1 FROM public.leads l
                  WHERE l.email_normalized = lower(u.email))
ORDER BY u.created_at DESC;

-- 3. Confirmar que o email exemplo está só em auth/profiles
SELECT 'auth.users' src, id::text, email FROM auth.users
  WHERE lower(email) = 'frederico.carvalho@digitalfc.pt'
UNION ALL
SELECT 'profiles', id::text, email FROM public.profiles
  WHERE lower(email) = 'frederico.carvalho@digitalfc.pt'
UNION ALL
SELECT 'leads', id::text, email FROM public.leads
  WHERE email_normalized = 'frederico.carvalho@digitalfc.pt';

-- 4. Validar que o utilizador veio de /signup (sinal: email_confirmed_at NULL)
--    /start usa email_confirm:true → confirmed != NULL
--    /signup usa signUp() padrão → confirmed = NULL até clicar
```

Em /admin: pesquisar pelo email e confirmar que não aparece em nenhuma vista (kanban, follow-ups, leads-funnel) — todas leem `leads`.

## Decisões pendentes do utilizador

1. Aprovar o fix em 3 camadas (backfill + trigger + check-email) ou prefere começar só pelo backfill + trigger e deixar `check-email` para depois?
2. Para leads backfilled, manter `qualification = NULL` e marcar `source = 'auth_backfill'`, ou atribuir uma `qualification` por defeito (ex.: `curiosity`) para evitar avisos em /admin?
3. Quer que `/signup` passe a ser opcional / removido do UX público (já que o modal cobre o caso), ou mantém os dois pontos de entrada?
