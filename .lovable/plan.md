## Objetivo

Substituir o gate de token estático do `/admin` por **Google Sign-in via Lovable Cloud**, restrito a `fredericodigital@gmail.com` através de allowlist de emails. O `INTERNAL_API_TOKEN` permanece para o seu uso atual no endpoint público de análise (`?refresh=1`) — apenas deixa de gatekeep o admin.

---

## Decisões aprovadas

- **Estratégia:** Allowlist de emails via env var `ADMIN_ALLOWED_EMAILS` (CSV, lowercase). Sem tabela `user_roles`, sem migração de DB.
- **Email autorizado inicial:** `fredericodigital@gmail.com`.
- **Quem entrar com outro email:** vê mensagem "Acesso restrito" e a sessão Supabase é imediatamente terminada via `supabase.auth.signOut()`.
- **Provider:** Google, gerido pela Lovable Cloud (OAuth pré-configurado, sem necessidade de Google Cloud Console).

---

## Novo secret a configurar

Vou pedir-te para definir **uma única env var** após a implementação:

| Nome | Valor | Onde |
|---|---|---|
| `ADMIN_ALLOWED_EMAILS` | `fredericodigital@gmail.com` | Lovable Cloud → Settings → Secrets |

CSV separado por vírgulas para adicionares mais admins no futuro (ex.: `frederico@x.com,outro@y.com`).

---

## Arquitetura nova

```text
                    ┌──────────────────────────────────┐
                    │  Browser (/admin)                │
                    │  ─────────────────────────────   │
                    │  AdminGate                       │
                    │  → "Entrar com Google"           │
                    │     supabase.auth.signInWith…    │
                    └────────────┬─────────────────────┘
                                 │ OAuth Google
                                 ▼
                    ┌──────────────────────────────────┐
                    │  Lovable Cloud Auth (Supabase)   │
                    │  Devolve sessão JWT              │
                    └────────────┬─────────────────────┘
                                 │ JWT na cookie/Authorization
                                 ▼
                    ┌──────────────────────────────────┐
                    │  /api/admin/* handlers            │
                    │  requireAdminSession():           │
                    │   1. Lê JWT Supabase              │
                    │   2. Valida user.email            │
                    │   3. Verifica em ALLOWED_EMAILS   │
                    │   → 200 ou 401                    │
                    └──────────────────────────────────┘
```

---

## Ficheiros a alterar

### 1. `src/lib/admin/session.ts` — reescrita completa

Substitui a sessão baseada em `INTERNAL_API_TOKEN` + cookie `useSession` por validação de JWT Supabase + allowlist:

- Remove `getSessionConfig()`, `setAdminSession()`, `clearAdminSession()`, `isAdminAuthenticated()`.
- Mantém o nome `requireAdminSession()` para minimizar diff nos handlers que já o importam.
- Nova implementação:
  - Lê o token Bearer do header `Authorization` ou da cookie de sessão Supabase.
  - Usa `supabaseAdmin.auth.getUser(token)` para validar o JWT.
  - Compara `user.email.toLowerCase()` com a lista `ADMIN_ALLOWED_EMAILS` (parseada com helper `getAdminAllowlist()`).
  - Devolve o `user` em caso de sucesso, lança `Response 401` caso contrário.
- Adiciona `isAdminEmailAllowed(email)` exportado para uso no client.

### 2. `src/components/admin/admin-gate.tsx` — reescrita

- Remove formulário de token.
- Substitui por card editorial com botão **"Entrar com Google"** que chama `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/admin" } })`.
- Mantém o estilo Editorial Tech Noir (mesma estrutura de card, mesma tipografia, mesmo `bg-surface-elevated`).
- Adiciona estado de erro caso o OAuth falhe.

### 3. `src/routes/admin.tsx` — adaptação do fluxo

- Substitui o probe a `/api/admin/report-requests?page=1&pageSize=1` por:
  - Setup de listener `supabase.auth.onAuthStateChange` **antes** de `supabase.auth.getSession()` (ordem crítica para evitar deadlock conhecido do Supabase).
  - Validar que `session.user.email` está na allowlist (chamando endpoint novo `/api/admin/whoami` que devolve `{ allowed: boolean, email: string | null }`).
  - Se autenticado mas não autorizado: chamar `supabase.auth.signOut()` automaticamente e mostrar `<AccessDeniedScreen />`.
- `handleLogout()` passa a chamar `supabase.auth.signOut()` em vez de `POST /api/admin/logout`.

### 4. `src/routes/api/admin/auth.ts` — **eliminar**

Já não é necessário. Auth é feita inteiramente client-side via Supabase Auth.

### 5. `src/routes/api/admin/logout.ts` — **eliminar**

Substituído por `supabase.auth.signOut()` no client.

### 6. **Novo:** `src/routes/api/admin/whoami.ts`

Endpoint mínimo `GET` que:
- Recebe JWT no header `Authorization`.
- Valida com `supabaseAdmin.auth.getUser(token)`.
- Devolve `{ allowed: boolean, email: string | null }`.
- Usado pelo client para decidir se mostra cockpit ou ecrã de acesso negado.

### 7. Handlers `/api/admin/*` que usam `requireAdminSession()`

Sem alterações de assinatura — continuam a chamar `await requireAdminSession()` no topo. Como a função foi reescrita internamente, agora ela:
- Lê JWT da Authorization header (que o `useCockpitData` e os fetches do client passam automaticamente via `supabase.auth.getSession()`).
- Valida user + email allowlist.
- Mantém o mesmo contrato (`throw Response 401` em falha).

Ficheiros impactados (apenas validação interna muda):
- `src/routes/api/admin/diagnostics.ts`
- `src/routes/api/admin/report-requests.ts`
- `src/routes/api/admin/report-requests.$id.ts`
- `src/routes/api/admin/regenerate-pdf.ts`
- `src/routes/api/admin/resend-email.ts`

### 8. `src/components/admin/cockpit/use-cockpit-data.ts` (e qualquer outro fetcher)

Adicionar header `Authorization: Bearer ${session.access_token}` em todos os fetches a `/api/admin/*`. O token vem de `supabase.auth.getSession()`.

---

## Especificação técnica do novo `requireAdminSession()`

```text
1. Tenta ler "Authorization: Bearer <jwt>" do header.
2. Se ausente, lê a cookie sb-access-token (fallback opcional).
3. Se ainda ausente → 401 UNAUTHENTICATED.
4. supabaseAdmin.auth.getUser(jwt) → { user }.
5. Se erro ou user.email ausente → 401 INVALID_SESSION.
6. Lê ADMIN_ALLOWED_EMAILS (CSV, lowercase, trim).
7. Se user.email.toLowerCase() ∉ allowlist → 403 NOT_ALLOWED.
8. Devolve user (handler pode usar user.id, user.email).
```

Sem alteração no contrato externo (`throw Response`), portanto não quebra nenhum handler existente.

---

## Restrições estritas (não tocar)

- `/report.example` — intacto.
- Endpoint público `/api/analyze-public-v1` — intacto. O `INTERNAL_API_TOKEN` continua a proteger `?refresh=1`.
- Allowlist Apify (`APIFY_ALLOWLIST`, `APIFY_ENABLED`) — intacto.
- Componentes do cockpit (panels, tabs, formatters) — intactos.
- Schema da DB — sem migrações.
- PDF / email pipeline — intactos.

---

## Pós-implementação: o que tens de fazer

1. **Adicionar o secret** `ADMIN_ALLOWED_EMAILS = fredericodigital@gmail.com` em Lovable Cloud → Settings → Secrets.
2. Abrir `/admin` → clicar **"Entrar com Google"** → autenticar com `fredericodigital@gmail.com`.
3. Esperar o redirect de volta a `/admin`.
4. Confirmar que o cockpit aparece normalmente (mesmos painéis: Visão geral, Análises, Pedidos, Perfis, Custos, Alertas, Diagnóstico).
5. (Opcional) Testar que outro email Google é bloqueado: abrir browser anónimo, tentar entrar com outra conta → deve ver "Acesso restrito" e ser deslogado automaticamente.

---

## Validação técnica que vou correr

1. `bunx tsc --noEmit` — zero erros TypeScript.
2. Confirmar que nenhum handler `/api/admin/*` ficou com referência ao antigo `setAdminSession` / `clearAdminSession` / `isAdminAuthenticated`.
3. Confirmar que o `INTERNAL_API_TOKEN` continua usado apenas em `src/routes/api/analyze-public-v1.ts` (para o gate `?refresh=1`).

---

## Riscos conhecidos

- **Sem o secret `ADMIN_ALLOWED_EMAILS` definido**, o sistema bloqueia todos os logins (fail-closed). Será necessário definir o secret antes do primeiro teste — vou avisar-te com o tool `add_secret` no fim da implementação.
- **Primeira vez que entras com Google**, a Supabase cria automaticamente a entrada em `auth.users`. Sem ação do teu lado.
- **Sessão Supabase expira ao fim de 1h por defeito**. O cliente Supabase faz refresh automático via `onAuthStateChange`, portanto não notarás. Logout = `supabase.auth.signOut()` no botão "Terminar sessão".

---

## Resumo do que muda para ti

| Antes | Depois |
|---|---|
| Abre `/admin` → cola token longo | Abre `/admin` → clica "Entrar com Google" |
| Sessão dura 8h via cookie cifrada | Sessão Supabase com refresh automático |
| Recuperar token = ir aos secrets | "Esqueci-me da password" = problema do Google |
| Adicionar admin = partilhar token | Adicionar admin = adicionar email à allowlist |
