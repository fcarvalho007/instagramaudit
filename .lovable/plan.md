

## Entendimento

**1. Fluxo landing → analyze → gate**: hero → `/analyze/$username` → `<PublicAnalysisDashboard>` (header, métricas, benchmark real, concorrentes mock, premium gate real) → modal real (server route + Supabase).

**2. Rota `/analyze/$username`**: SSR direto, chama `getMockAnalysis(username)` síncrono e renderiza dashboard. Sem loader, sem fetch, sem error/notFound boundaries.

**3. Ainda mock-based**: header (handle, displayName, categoria, followers, gradient), métricas-chave (engagement, postsAnalyzed, weeklyFrequency, dominantFormat, dominantFormatShare), concorrentes (handles + engagement), premium teasers. **Real**: benchmark positioning (engine pura) + captura de leads.

**4. Papel do Apify**: source-of-truth de dados públicos do Instagram via dois actors — `instagram-profile-scraper` (perfil: bio, followers, posts_count, verified, avatar) e `instagram-post-scraper` (publicações recentes: tipo, likes, comments, timestamp). Boundary servidor (token nunca no browser); resposta crua nunca exposta — frontend recebe shape normalizado.

**5. Porquê só perfil primário agora**: scraping de concorrentes duplica custo Apify e exige cache/dedup; benchmark v2 precisa de dataset estatístico; PDF/email exigem Resend+react-pdf. Limitar a 1 perfil + 12 posts permite: (a) validar contracto Apify→server→UI, (b) custo controlado por análise, (c) primeira sensação real sem destabilizar o resto.

---

## Discrepância arquitectural a resolver

A spec pede **Supabase Edge Function (Deno em `supabase/functions/`)**. Project Knowledge diz explicitamente: *"Do NOT use Supabase Edge Functions. Use TanStack Start's built-in server capabilities instead."* Mesma decisão dos prompts anteriores (`/api/request-full-report`).

**Decisão**: server route TanStack `src/routes/api/analyze-public-v1.ts` (POST). Cumpre intenção (boundary server-side com secret), runtime Cloudflare Worker, sem infra Deno. Nome preserva a semântica `analyze-public-v1`.

---

## Secret necessário

`APIFY_TOKEN` (não existe ainda). Será pedido via `add_secret` em Build Mode antes de implementar a chamada Apify. Sem o token, a função devolve erro estruturado calmo (não crashes).

---

## Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `src/routes/api/analyze-public-v1.ts` | **Criar** — POST + OPTIONS, valida `instagram_username`, chama Apify (profile + posts), normaliza, devolve shape estável | Não |
| `src/lib/analysis/apify-client.ts` | **Criar** — `runActor(actorId, input)` via Apify run-sync-get-dataset-items endpoint, server-only (`process.env.APIFY_TOKEN`), timeouts + erros tipados | Não |
| `src/lib/analysis/normalize.ts` | **Criar** — `normalizeProfile(raw)` + `computeContentSummary(posts)` puro (médias, dominant format, weekly freq) | Não |
| `src/lib/analysis/types.ts` | **Criar** — `PublicAnalysisResponse` (success + failure shapes) partilhado server/client | Não |
| `src/lib/analysis/client.ts` | **Criar** — `fetchPublicAnalysis(username)` no browser → `fetch("/api/analyze-public-v1")` | Não |
| `src/routes/analyze.$username.tsx` | **Editar** — usar TanStack Query (`useQuery`) ou `useState`+`useEffect`; gerir loading/error/success; passar dados reais ao dashboard | Não |
| `src/components/product/public-analysis-dashboard.tsx` | **Editar mínimo** — aceitar shape novo `{ profile, contentSummary, ... }` para header + métricas; benchmark engine consome `contentSummary`; concorrentes recebem array vazio com placeholder; premium teasers ficam derivados ou fixos | Não |
| `src/components/product/analysis-header.tsx` | **Editar** — aceitar `avatarUrl` opcional (fallback para gradient); remover `category` (Apify não devolve); badge passa de "Dados de exemplo" para "Análise pública" | Não |
| `src/components/product/analysis-skeleton.tsx` | **Criar** — loading state premium (skeletons pulse para header + 4 cards + bloco benchmark) | Não |
| `src/components/product/analysis-error-state.tsx` | **Criar** — estado erro pt-PT calmo com botão "Tentar novamente" | Não |

**Locked files**: `header.tsx` e dashboard **não** estão em `LOCKED_FILES.md` (verificado em `mem://constraints/locked-files`). `tokens.css`, `__root.tsx`, `client.ts/server.ts/types.ts` intocados.

---

## Server route — design

**Endpoint**: `POST /api/analyze-public-v1`

**Input** (Zod):
```ts
{ instagram_username: z.string().regex(/^[A-Za-z0-9._]{1,30}$/) }
```

**Fluxo**:
1. Validar payload → 400 `INVALID_USERNAME`
2. Verificar `process.env.APIFY_TOKEN` → 503 `UPSTREAM_UNAVAILABLE` se ausente
3. Chamar `instagram-profile-scraper` (run-sync-get-dataset-items, timeout 25s) com `{ usernames: [username] }`
4. Se vazio → 404 `PROFILE_NOT_FOUND`
5. Chamar `instagram-post-scraper` com `{ username, resultsLimit: 12 }`
6. Normalizar → shape estável
7. Erros Apify → 502 `UPSTREAM_FAILED` + log server-side (sem stack na UI)

**Apify endpoint pattern**:
```
POST https://api.apify.com/v2/acts/{actorId}/run-sync-get-dataset-items?token={APIFY_TOKEN}
```

Actor IDs:
- `apify/instagram-profile-scraper`
- `apify/instagram-post-scraper`

---

## Shape normalizado (response contract)

```ts
type PublicAnalysisResponse =
  | {
      success: true;
      profile: {
        username: string;
        display_name: string;
        avatar_url: string | null;
        bio: string | null;
        followers_count: number;
        following_count: number | null;
        posts_count: number | null;
        is_verified: boolean;
      };
      content_summary: {
        posts_analyzed: number;
        dominant_format: "Reels" | "Carrosséis" | "Imagens";
        average_likes: number;
        average_comments: number;
        average_engagement_rate: number; // %
        estimated_posts_per_week: number;
      };
      status: {
        success: true;
        data_source: "apify_v1";
        analyzed_at: string; // ISO
      };
    }
  | {
      success: false;
      error_code: "INVALID_USERNAME" | "PROFILE_NOT_FOUND"
        | "UPSTREAM_FAILED" | "UPSTREAM_UNAVAILABLE";
      message: string; // pt-PT
    };
```

**Mapeamento Apify → format dominante**: `Video`/`Reel` → "Reels"; `Sidecar` → "Carrosséis"; `Image`/`GraphImage` → "Imagens". Dominant = mais frequente nos 12 últimos.

**Engagement rate**: `(avgLikes + avgComments) / followers * 100`.

**Weekly frequency**: `posts.length / ((maxDate - minDate) em dias / 7)`, com fallback `posts.length / 4` se janela <7 dias.

---

## Frontend — fluxo

```tsx
function AnalyzePage() {
  const { username } = Route.useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analysis", username],
    queryFn: () => fetchPublicAnalysis(username),
    retry: 1,
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <AnalysisSkeleton />;
  if (error || !data?.success) return <AnalysisErrorState onRetry={refetch} message={data?.message} />;
  return <PublicAnalysisDashboard data={data} />;
}
```

**Sem fallback silencioso para mock** — failure mostra estado de erro pt-PT explícito. Benchmark e concorrentes:

- **Benchmark**: alimentado por `content_summary.average_engagement_rate` + `profile.followers_count` + `content_summary.dominant_format` na engine real (já pronta).
- **Concorrentes**: bloco fica intacto mas recebe array vazio + placeholder pt-PT *"Comparação com concorrentes disponível em breve"*. Mantém estrutura visual.
- **Premium teasers**: valores fixos sensatos (não derivados de mock determinístico) para o gate manter o aspecto premium.

---

## TanStack Query setup

Project Knowledge exige QueryClient em `__root.tsx`. **`__root.tsx` está locked** — verificar se já tem `QueryClientProvider`. Se sim, reutilizar. Se não, **STOP e pedir permissão** para tocar (provável adição mínima de provider).

Verificação rápida será o primeiro passo em Build Mode antes de qualquer outra coisa.

---

## Erros UI (pt-PT)

| Código | Mensagem |
|---|---|
| `INVALID_USERNAME` | "Username inválido. Verificar e tentar novamente." |
| `PROFILE_NOT_FOUND` | "Não foi possível encontrar este perfil. Verificar o username." |
| `UPSTREAM_UNAVAILABLE` | "Serviço de análise temporariamente indisponível." |
| `UPSTREAM_FAILED` | "Não foi possível analisar este perfil neste momento. Tentar novamente dentro de instantes." |
| Network error | "Falha de ligação. Tentar novamente." |

---

## Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem competitor scraping | ✅ (só perfil primário) |
| Sem benchmark v2 | ✅ (engine v1 reutilizada) |
| Sem PDF / email / pagamentos / auth | ✅ |
| Sem novas dependências | ✅ (`@tanstack/react-query` já existe via setup; Zod já existe) |
| Apify só server-side | ✅ (`process.env.APIFY_TOKEN` em server route) |
| Sem secrets na UI | ✅ |
| Sem redesign | ✅ (componentes existentes mantidos; apenas skeleton + error novos) |
| pt-PT impessoal | ✅ |
| Comentários em inglês | ✅ |
| Locked files | ✅ (nenhum tocado; `__root.tsx` verificado primeiro) |
| Future-ready | ✅ (cache/persistência/concorrentes plugam em cima do mesmo route) |

---

## Confirmações antes de implementar

1. **Aprovas server route TanStack `/api/analyze-public-v1`** em vez de Supabase Edge Function (Deno)? Mesma decisão dos prompts anteriores.
2. **Aprovas pedir o secret `APIFY_TOKEN`** em Build Mode (via `add_secret`) antes de testar a chamada real?
3. **Limite de 12 posts** está bem para v1 (controlo de custo)?
4. **`mock-analysis.ts` mantém-se** como utilitário de fallback/dev (não é importado pela rota real, mas fica disponível para a página `design-system`)?

---

## Checkpoints

- ☐ Server route `/api/analyze-public-v1` criada com validação Zod
- ☐ Cliente Apify server-only com timeout + erros tipados
- ☐ Normalização (perfil + content summary) em módulo puro
- ☐ Frontend chama route via `useQuery`, gere loading/error/success
- ☐ Loading skeleton premium implementado
- ☐ Error state pt-PT calmo com retry implementado
- ☐ Header e métricas-chave consomem dados reais
- ☐ Benchmark engine consome métricas reais (sem mudar o engine)
- ☐ Concorrentes ficam com placeholder pt-PT (sem scraping)
- ☐ Sem cache, persistência, PDF, email, auth, pagamentos
- ☐ `APIFY_TOKEN` apenas server-side
- ☐ Zero locked files tocados (confirmar `__root.tsx` antes)

