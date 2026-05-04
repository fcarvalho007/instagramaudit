## Problema

A página `/app/reports` dá "Something went wrong" porque:

1. **Server functions devolvem 401**: O middleware `requireSupabaseAuth` espera um header `Authorization: Bearer <token>` no pedido HTTP. Mas as chamadas de `createServerFn` no browser (via fetch) não incluem automaticamente o token Supabase. Resultado: todas as server functions autenticadas falham com 401.

2. **Crash "s is not iterable"**: O erro 401 propaga-se como exceção e o error boundary global captura-o, mostrando "Something went wrong".

3. **Perfil vazio (406)**: A query `profiles?select=plan&id=eq.{userId}` devolve 0 rows porque não existe row na tabela `profiles` para este utilizador (provavelmente o trigger `handle_new_user` falhou ou o user foi criado antes do trigger existir).

## Plano

### 1. Adicionar auth header automático às server functions

Criar um helper que intercepta todas as chamadas a server functions e injeta o header `Authorization: Bearer <token>` com o access token da sessão Supabase do browser.

No TanStack Start, isto faz-se configurando `defaultHeaders` no router ou usando um wrapper nos server function calls. A abordagem mais direta: criar um middleware client-side que, antes de cada chamada, obtém o token via `supabase.auth.getSession()` e o adiciona aos headers.

Ficheiro: `src/lib/server-fn-auth.ts` — exporta um helper que wraps server function calls com o token.

Alternativa mais limpa: configurar `fetch` customizado no router que adiciona o header automaticamente a pedidos `/_serverFn/`.

### 2. Garantir que o perfil existe

Inserir um row na tabela `profiles` para o utilizador `fredericodigital@gmail.com` (id: `c70e200d-441d-4625-b25e-4fe37021c79c`) se ainda não existir, via migration ou query direta.

### 3. Tornar `getUserReports` resiliente

Tratar o caso em que `profile` é null (sem lead_id) de forma graciosa — já o faz parcialmente, mas garantir que não crashe.

## Detalhes técnicos

- O `createRouter()` no TanStack Start v1 suporta `context.fetch` ou wrapping global. A melhor abordagem é fazer override do `fetch` global para pedidos a `/_serverFn/` que adiciona o bearer token.
- O token vem de `supabase.auth.getSession()` no browser.
- Ficheiros a editar: `src/router.tsx` (ou novo `src/lib/auth-fetch.ts`) e possivelmente `src/routes/app.tsx`.
- Migration ou query: inserir profile row em falta.
