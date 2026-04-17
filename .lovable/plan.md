

## Entendimento

**1. Fluxo landing → analyze → gate**: hero action bar (`/`) → `/analyze/$username` → `<PublicAnalysisDashboard>` (header real + métricas reais + benchmark real + concorrentes placeholder + premium gate) → `<ReportGateModal>` com quota agora 100% server-side via `/api/request-full-report`.

**2. Rota `/analyze/$username`**: SSR-disabled, faz `fetchPublicAnalysis(cleaned)` no `useEffect`, gere `loading | ready` com `<AnalysisSkeleton>` / `<AnalysisErrorState>` / `<PublicAnalysisDashboard>`. Não passa concorrentes ao backend hoje.

**3. Estado real do perfil primário**: totalmente real via `POST /api/analyze-public-v1` → Apify `instagram-profile-scraper` + `instagram-post-scraper` (12 posts via `directUrls`) → `normalizeProfile()` + `computeContentSummary()` → shape `PublicAnalysisResponse`. Boundary servidor sólido (`APIFY_TOKEN` em secret).

**4. Estado do bloco benchmark**: real desde Sprint anterior — engine pura `computeBenchmarkPositioning()` em `src/lib/benchmark/engine.ts` consome `followers`, `engagement`, `dominantFormat` reais e devolve `available | unavailable`. UI já distingue ambos os estados.

**5. Bloco concorrentes hoje**: `<PublicAnalysisDashboard>` tem uma `<section>` inline com eyebrow *"Em breve"* + parágrafo placeholder *"Comparação directa com até dois concorrentes disponível em breve."* — sem props, sem dados, sem componente dedicado.

**6. Porquê fazer concorrentes reais agora sem expandir para PDF/email/pagamentos/scoring**: o triângulo (perfil + benchmark + concorrentes) é a proposta de valor central — sem concorrentes a página parece amputada. PDF/email/pagamentos/auth são camadas de monetização e entrega que assentam sobre dados reais; sem comparação real, monetizar uma análise incompleta destrói a percepção premium. Scoring composto/IA precisam de dataset estatístico maior do que 1+2 perfis para serem credíveis. Limite de 2 concorrentes mantém custo Apify previsível (3× em vez de 1×) e contracto de UI estável para receber IA depois.

---

## Discrepâncias e decisões

**Edge Function vs server route TanStack**: Project Knowledge diz *"Do NOT use Supabase Edge Functions. Use TanStack Start's built-in server capabilities instead."* Mantenho o padrão do `/api/analyze-public-v1` actual.

**Versionar ou estender?** Estender em vez de criar `v2`. O endpoint actual já aceita um único username — adicionar `competitor_usernames?: string[]` (max 2) ao schema mantém compatibilidade total: chamadas antigas sem o campo continuam a funcionar, novas chamadas recebem `competitors` no response. Versionar agora seria over-engineering; a v2 fica para quando houver breaking changes reais (ex: concurrent benchmark, persistência).

**Como entram os usernames dos concorrentes?** Via query string `?vs=handle1,handle2` na rota `/analyze/$username`. Vantagens: shareable (link → mesma análise para todos), zero estado novo, fácil de adicionar UI de input mais tarde sem mudar contracto. URLs curtos: `/analyze/nike?vs=adidas,puma`.

**`directUrls` para perfis vs `usernames` para profile-scraper**: o `instagram-profile-scraper` aceita `usernames` array — adiciono os 3 handles num único `runActor` para baixar latência/custo (1 chamada de profile em vez de 3). Posts continuam por handle (3 chamadas paralelas com `Promise.allSettled`) porque o `instagram-post-scraper` espera `directUrls` por handle.

**Race condition / partial failure**: `Promise.allSettled` para os post fetches. Cada concorrente vira `{ success: true, profile, content_summary } | { success: false, username, error_code, message }`. Frontend renderiza o que conseguir; primário é sempre prioritário (se falhar, mostra error state global; se concorrente falhar, mostra row degradada).

---

## Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `src/lib/analysis/types.ts` | Editar — adicionar `CompetitorAnalysis` (success / failure variants); `PublicAnalysisSuccess` ganha `competitors: CompetitorAnalysis[]` | Não |
| `src/routes/api/analyze-public-v1.ts` | Editar — payload aceita `competitor_usernames` (z.array max 2 opcional); 1 call de profile com array de handles + `Promise.allSettled` para posts; devolve array `competitors` com partial failures tipados | Não |
| `src/lib/analysis/client.ts` | Editar — `fetchPublicAnalysis(username, competitors?)` aceita 2º arg opcional e envia no body | Não |
| `src/routes/analyze.$username.tsx` | Editar — ler `?vs=` da search string com `Route.useSearch()` (precisa de `validateSearch`); passar para `fetchPublicAnalysis`; key do effect inclui handles | Não |
| `src/components/product/public-analysis-dashboard.tsx` | Editar — substituir placeholder inline por `<AnalysisCompetitorComparison primary={...} competitors={data.competitors} />` | Não |
| `src/components/product/analysis-competitor-comparison.tsx` | **Criar** — recebe primary + array de concorrentes; renderiza tabela comparativa real (engagement, frequência, formato dominante, média likes, média comentários) + empty state + linhas degradadas para failures | Não |

**Nenhum ficheiro locked tocado.** Confirmado contra `mem://constraints/locked-files`: o dashboard e a rota analyze não estão lá. (O componente antigo `analysis-competitor-comparison.tsx` foi apagado na auditoria anterior — recriado aqui com shape real.)

---

## Backend — design

**Payload (Zod)**:
```ts
{
  instagram_username: string,           // existing
  competitor_usernames?: string[]       // NEW — max 2, same regex, deduped vs primary
}
```

**Fluxo**:
1. Validar payload + dedup competitors (remover dupes e o próprio primary)
2. 1 call `profile-scraper` com `usernames: [primary, ...competitors]`
3. Mapear rows → `Map<username, profile>`
4. Se primary não estiver no map → `PROFILE_NOT_FOUND` (mesmo comportamento que hoje)
5. `Promise.allSettled` para post-scraper de cada handle válido
6. Compor response: primary igual ao actual + `competitors: CompetitorAnalysis[]`

**Custo**: 1 profile call (até 3 handles) + N post calls em paralelo (1 + até 2). Apify cobra por actor run, não por handle no profile-scraper, portanto o profile fica praticamente igual; posts crescem linearmente mas paralelizados.

---

## Shape normalizado v1

```ts
type CompetitorAnalysis =
  | {
      success: true;
      profile: PublicProfile;          // mesmo shape que primary
      content_summary: ContentSummary; // mesmo shape que primary
    }
  | {
      success: false;
      username: string;
      error_code: "PROFILE_NOT_FOUND" | "POSTS_UNAVAILABLE" | "UPSTREAM_FAILED";
      message: string;                 // pt-PT, calmo
    };

PublicAnalysisSuccess.competitors: CompetitorAnalysis[]; // [] se não houver
```

Métricas comparáveis em v1 (todas já existem no `content_summary`):
- `average_engagement_rate`
- `estimated_posts_per_week`
- `dominant_format`
- `average_likes`
- `average_comments`

`followers_count` mostrado como contexto, não como métrica de comparação directa.

---

## Frontend — comparação

**Layout (mobile-first, 375px)**:
- Tabela vertical em mobile (cada concorrente em coluna stacked)
- Grid 3-col em ≥md (primary + até 2)
- Linha por métrica com label + valor
- Highlight subtil no melhor valor por linha (sem storytelling, só `font-medium` + cor accent)
- Failure: card com username + mensagem pt-PT calma + ícone discreto

**Empty state** (zero concorrentes):
- Eyebrow: *"Comparação"*
- Título: *"Comparar com até 2 concorrentes"*
- Copy: *"Adicionar `?vs=username` ao endereço para comparar desempenho directo entre perfis."*
- Mantém border + bg do bloco para não parecer buraco

---

## Search params (validateSearch)

```ts
export const Route = createFileRoute("/analyze/$username")({
  ssr: false,
  validateSearch: (search): { vs?: string } => ({
    vs: typeof search.vs === "string" ? search.vs : undefined,
  }),
  // ...
});

const { vs } = Route.useSearch();
const competitors = vs?.split(",").map(s => s.trim().replace(/^@/, "")).filter(Boolean).slice(0, 2) ?? [];
```

---

## Erros (pt-PT)

| Caso | Mensagem |
|---|---|
| Concorrente não encontrado | "Não foi possível encontrar @{handle}." |
| Posts indisponíveis | "Métricas indisponíveis para @{handle}." |
| Upstream genérico | "Não foi possível analisar @{handle} neste momento." |

Primary mantém os códigos actuais inalterados.

---

## Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem PDF / email / pagamentos / auth / IA / scoring composto | ✅ |
| Sem novas dependências | ✅ |
| Apify só server-side (`APIFY_TOKEN` em secret) | ✅ |
| Sem secrets na UI | ✅ |
| Raw payloads Apify nunca expostos | ✅ (normalize antes de devolver) |
| Locked files intactos | ✅ |
| pt-PT impessoal | ✅ |
| Comentários técnicos em inglês | ✅ |
| Mobile 375px | ✅ (layout stacked) |
| Future-ready (caching, persistência, IA, PDF) | ✅ (shape estável + boundary server) |

---

## Checkpoints

- ☐ Schema Zod aceita `competitor_usernames` (max 2, dedup, regex)
- ☐ 1 call profile-scraper com array de handles
- ☐ `Promise.allSettled` para posts dos concorrentes
- ☐ Shape `CompetitorAnalysis` (success + failure) tipado
- ☐ Rota lê `?vs=` via `validateSearch`
- ☐ `fetchPublicAnalysis` aceita competitors opcional
- ☐ `<AnalysisCompetitorComparison>` criado: tabela real + empty state + failure rows
- ☐ Dashboard substitui placeholder pelo componente novo
- ☐ Mobile 375px verificado
- ☐ Sem PDF/email/pagamentos/auth/IA introduzidos

