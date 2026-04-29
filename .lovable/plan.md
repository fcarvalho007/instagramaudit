## Diagnóstico

**Bug 1 — "No QueryClient set"**
Várias secções do admin (`/admin/sistema`, `health-section`, `costs-detail-section`, `secrets-config-section`, `expense-section`, `cost-caps-modal`, `section-state`) usam `useQuery`/`useMutation` do TanStack Query, mas a app **não monta nenhum `QueryClientProvider`**. O router (`src/router.tsx`) cria o `Router` com `context: {}` e o `__root.tsx` renderiza `<Outlet/>` directo dentro de `AppShell`. Resultado: qualquer rota que dispare um hook do React Query rebenta com `No QueryClient set, use QueryClientProvider to set one`. É o caso típico do `/admin/sistema`.

**Bug 2 — "A verificar sessão…" demora segundos**
O `AdminAuthShell`:
1. Sempre arranca com `authState = "checking"` em cada montagem do layout `/admin`.
2. Dispara **dois** caminhos de avaliação em simultâneo: `onAuthStateChange` (que emite logo `INITIAL_SESSION`) **e** `supabase.auth.getSession().then(...)`. O segundo é redundante — o primeiro já cobre o estado actual.
3. O ecrã "A verificar sessão…" aparece imediatamente, mesmo quando a verificação acaba em ~200ms — gera flash visível.
4. O resultado da verificação não é cacheado entre navegações, por isso navegar de tab para tab pode reavaliar.

A latência real vem da chamada `/api/admin/whoami` (round-trip ao worker). Não conseguimos eliminá-la, mas podemos esconder o spinner se ela for rápida e evitar duplicação.

## Plano

### Parte A — Montar QueryClient global

1. **`src/router.tsx`** — criar `QueryClient` dentro de `getRouter` (uma instância por request, conforme regra SSR) e injectar no `context` do router:
   ```ts
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
     },
   });
   const router = createRouter({
     routeTree,
     context: { queryClient },
     defaultPreloadStaleTime: 0,
     ...
   });
   ```

2. **`src/routes/__root.tsx`** — converter `createRootRoute` em `createRootRouteWithContext<{ queryClient: QueryClient }>()` e wrappar `<Outlet/>` com `<QueryClientProvider client={queryClient}>`:
   ```tsx
   function RootComponent() {
     const { queryClient } = Route.useRouteContext();
     return (
       <QueryClientProvider client={queryClient}>
         <AppShell><Outlet /></AppShell>
       </QueryClientProvider>
     );
   }
   ```

3. Adicionar a declaração de tipo `interface Register { router: ReturnType<typeof getRouter> }` se ainda não existir (e remover redundâncias se existir).

### Parte B — Acelerar o gate de auth

Refactor de `src/components/admin/v2/admin-auth-shell.tsx`:

1. **Remover o `getSession().then(evaluate)` duplicado** — `onAuthStateChange` dispara `INITIAL_SESSION` no arranque com a sessão actual, cobre o caso inicial sem nova chamada nem race.

2. **Mostrar "A verificar sessão…" apenas após 150ms** — usar um pequeno delay (`setTimeout` + state `showSpinner`) para eliminar o flash quando o `whoami` responde rápido. Se `authState` resolve antes de 150ms, o utilizador vai directo do branco para o conteúdo.

3. **Cachear o resultado em `sessionStorage`** com chave por token — quando o utilizador navega entre tabs, se o token não mudou e o resultado ainda é fresco (<60s), começamos já em `"in"` em vez de `"checking"`, eliminando o spinner em navegações dentro do admin. A primeira entrada continua a ir até ao `whoami`, mas as seguintes ficam instantâneas.

4. **Manter o ref `lastEvaluatedTokenRef`** para deduplicar avaliações dentro da mesma montagem.

### Parte C — Validação

- `bunx tsc --noEmit` deve passar.
- `/admin/sistema` deixa de rebentar com "No QueryClient set".
- `/admin` e navegações entre tabs deixam de mostrar o spinner "A verificar sessão…" se a verificação for rápida ou já estiver cacheada.

## Detalhes técnicos

- **`QueryClient` por request**: criado dentro do factory `getRouter()` (não module-level) para evitar leaks entre requests SSR.
- **`createRootRouteWithContext`**: factory que requer chamada dupla — `createRootRouteWithContext<T>()({...options})`.
- **`defaultPreloadStaleTime: 0`** já está no router — mantém-se para o Query controlar a freshness.
- **Cache do gate**: `sessionStorage` com payload `{ token, allowed, email, ts }`. Invalida em logout (já há cleanup) e quando token muda.
- **Sem alterações ao `LOCKED_FILES.md`**: nenhum dos ficheiros tocados está bloqueado (`src/router.tsx`, `src/routes/__root.tsx`, `src/components/admin/v2/admin-auth-shell.tsx`).

## Ficheiros a editar

- `src/router.tsx`
- `src/routes/__root.tsx`
- `src/components/admin/v2/admin-auth-shell.tsx`

Sem ficheiros novos.
