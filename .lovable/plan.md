## Objetivo

Remover o login Google do `/admin` e substituir por um gate trivial: o utilizador escreve um email, e se for `fredericodigital@gmail.com` entra. Sem password, sem magic link, sem 2FA, sem Supabase Auth.

> Aviso explícito: este modo deixa o `/admin` aberto a qualquer pessoa que escreva o teu email. O backoffice expõe custos, perfis analisados, snapshots, KB, alertas, secrets-status e ações de regenerar PDF/reenviar email. Confirmaste que aceitas este risco. Vou registar isto na security memory.

## Como vai funcionar

1. Em `/admin` aparece um único input "Email" + botão "Entrar".
2. Se o email (case-insensitive, trim) bater certo com a allowlist `ADMIN_ALLOWED_EMAILS` (já contém `fredericodigital@gmail.com`), gravamos uma flag em `localStorage` (`admin.simple-gate.v1` = email).
3. Todas as sub-rotas `/admin/*` e chamadas a `/api/admin/*` passam a aceitar essa flag — sem JWT, sem Bearer token.
4. Botão "Terminar sessão" limpa a flag.

## Alterações

### Frontend

- **`src/components/admin/v2/admin-auth-shell.tsx`** — reescrever:
  - Remover toda a lógica Supabase (`onAuthStateChange`, `getSession`, cache de whoami, spinner de "A verificar sessão").
  - Estado local: `email | null` lido de `localStorage.getItem("admin.simple-gate.v1")` no mount.
  - Se vazio → render `<SimpleEmailGate onSubmit={…}/>` (input + botão).
  - Submit faz `POST /api/admin/simple-login` com `{ email }`. Se 200 → grava no localStorage e entra. Se 403 → mostra "Email não autorizado".
  - Handler de logout limpa `localStorage` e volta ao gate.

- **`src/components/admin/admin-gate.tsx`** — apagar (já não é usado).

- **`src/integrations/lovable/index.ts`** — manter intacto (auto-gerado; deixar de ser importado pelo admin já basta).

- **`src/lib/admin/fetch.ts`** — alterar:
  - Remover dependência de `supabase.auth.getSession()`.
  - Ler email de `localStorage.getItem("admin.simple-gate.v1")` e enviar em header `X-Admin-Email`.
  - Em 401/403 → limpar localStorage e `window.location.reload()` (volta ao gate).

### Backend

- **Novo: `src/routes/api/admin/simple-login.ts`** — `POST` com `{ email }`. Valida contra `getAdminAllowlist()`. Devolve `{ ok: true }` ou 403. Sem cookies, sem sessão server-side — é apenas a verificação inicial; o cliente é que persiste a flag.

- **`src/lib/admin/session.ts`** — substituir `requireAdminSession()`:
  - Lê `X-Admin-Email` (header) em vez de `Authorization: Bearer`.
  - Valida com `isAdminEmailAllowed(email)`.
  - Mantém a mesma assinatura `Promise<AdminUser>` para não tocar nos ~30 handlers `/api/admin/*` que a usam.
  - Apaga referência a `supabaseAdmin.auth.getUser`.

- **`src/routes/api/admin/whoami.ts`** — simplificar: lê `X-Admin-Email`, devolve `{ allowed, email }`. (Mantém-se por compatibilidade; o gate novo nem precisa de chamar.)

### Limpeza

- **Remover do `admin.tsx`**: import de `AdminGate` (já não existe).
- **Não tocar** em `LOCKED_FILES.md`, `/report.example`, tokens, design system, `src/integrations/supabase/client.ts`.

## Implicações de segurança (registadas)

- Vou atualizar o `@security-memory` a documentar que o `/admin` está intencionalmente sem autenticação real durante a fase de testes privados, a pedido explícito do owner.
- Os scanners vão flaggar isto; vamos marcar como "risco aceite — testing mode".
- **Recomendação que fica em aberto**: quando publicares de novo o produto ou abrires acesso a outros, voltar para email + password ou Google + allowlist (15 minutos de trabalho).

## Validação

- `bunx tsc --noEmit`
- Manual: abrir `/admin` → escrever `fredericodigital@gmail.com` → entrar → navegar tabs (Visão Geral, Sistema, Perfis, Conhecimento) → carregar KPIs / snapshots → terminar sessão → confirmar que volta ao gate.
- Confirmar que escrever outro email → "Email não autorizado".

## Ficheiros a alterar

1. `src/components/admin/v2/admin-auth-shell.tsx` — reescrita completa (gate simples).
2. `src/lib/admin/fetch.ts` — header `X-Admin-Email` em vez de Bearer.
3. `src/lib/admin/session.ts` — `requireAdminSession()` lê `X-Admin-Email`.
4. `src/routes/api/admin/whoami.ts` — simplificar.
5. `src/routes/api/admin/simple-login.ts` — criar.
6. `src/routes/admin.tsx` — remover import órfão se houver.
7. `src/components/admin/admin-gate.tsx` — apagar.
8. Security memory — atualizar.

## Checkpoint

- ☐ `AdminAuthShell` mostra apenas input email + botão Entrar
- ☐ Email correto entra; email errado mostra "Não autorizado"
- ☐ Todas as chamadas `/api/admin/*` continuam a funcionar via `X-Admin-Email`
- ☐ Botão "Terminar sessão" limpa estado
- ☐ Sem dependências de `lovable.auth` / Supabase Auth no fluxo admin
- ☐ `bunx tsc --noEmit` limpo
- ☐ Security memory atualizada com o risco aceite
