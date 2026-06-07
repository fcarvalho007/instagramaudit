## Plan — Comparação "Perfil vs Concorrente" no Overview e Engagement (Pro)

### Estratégia

Em vez de editar a `EditorialIdentityCard` (1012 linhas) ou o `EngagementCardRefined`, **adicionar dois blocos irmãos** dentro de `report-overview-block.tsx`. Mantém os cartões existentes intocados e respeita "enhancement, not replacement".

### Ficheiros a criar

1. **`src/components/report-redesign/v2/overview/competitor-overview-compare.tsx`** (novo)
   - Recebe `primary` (handle, followers, postsAnalyzed, engagementRate, avgLikes, avgComments, postingFrequencyWeekly) e `competitor` (entrada de `competitorBreakdown`).
   - Renderiza um cartão `surface-secondary` com header curto ("Comparação com concorrente · @handle"), pequeno hint quando `windowAligned === false` ("competidor em baseline"), e uma grelha responsive de `CompareStatBlock`:
     - Followers (`unit: "abs"`)
     - Posts analisados (`unit: "abs"`)
     - Engagement médio (`unit: "pp"`)
     - Likes/post (`unit: "abs"`) — apenas se `avgLikes > 0` de ambos os lados
     - Comentários/post (`unit: "abs"`) — apenas se `avgComments > 0` de ambos os lados
     - Posts/semana (`unit: "abs"`) — apenas se ambos > 0
   - Para cada métrica, se o lado do concorrente é `null/0/NaN`, a linha é omitida (nunca zero placeholder).
   - Se após filtragem só sobrar a métrica de engagement e ela também faltar, devolve `null`.

2. **`src/components/report-redesign/v2/competitor-engagement-compare.tsx`** (novo)
   - Recebe `primary` (handle, engagementRate, avgLikes, avgComments) e `competitor`.
   - Um `CompareStatBlock` em destaque para engagement (pp).
   - Duas linhas inferiores compactas (não `CompareStatBlock` cheio) para Likes/post e Comentários/post quando disponíveis — apenas labels + valores com a mesma legenda de cores azul/roxo das primitives. Mantém leveza visual.
   - Uma frase deterministic em `text-content-secondary text-sm` calculada como:
     - `ratio = primaryER / competitorER`
     - `ratio` ∈ [0.95, 1.05] → "Os dois perfis estão em linha no envolvimento médio."
     - `ratio > 1.05` → "Este perfil está acima do concorrente em envolvimento médio."
     - `ratio < 0.95` → "O concorrente gera N,N× mais envolvimento médio por publicação." (1/ratio, 1 decimal pt-PT)
   - Sem competitor engagement → devolve `null`.

### Ficheiro a editar (mínimo)

3. **`src/components/report-redesign/v2/report-overview-block.tsx`**
   - Importar os dois novos componentes + `CompetitorOverviewCompare` e `CompetitorEngagementCompare`.
   - Ler `competitorBreakdown[0]` de `result.data.competitorBreakdown` (com TODO marcando suporte a 2+ concorrentes).
   - Inserir `<CompetitorOverviewCompare …/>` **apenas** nos branches `mode === "all"` e (futuro Pro) — colocado imediatamente depois de `MethodologyLine`, antes de `EngagementCardRefined`.
   - Inserir `<CompetitorEngagementCompare …/>` **apenas** nos branches `mode === "all"` e `mode === "locked"` — colocado imediatamente depois de `<EngagementCardRefined />`, dentro do mesmo `<div id="engagement">` ou logo a seguir.
   - **Não tocar** em `free` nem `free_with_engagement` → Free/Public report renderiza idêntico a hoje.
   - Quando `competitorBreakdown.length === 0` ambos os componentes devolvem `null` → Overview/Engagement visualmente inalterados.

### Métricas comparadas (exatas)

| Card | Métrica | Unidade | higherIsBetter |
|---|---|---|---|
| Overview | Followers | abs | true |
| Overview | Posts analisados | abs | true |
| Overview | Engagement médio | pp | true |
| Overview | Likes/post (opcional) | abs | true |
| Overview | Comentários/post (opcional) | abs | true |
| Overview | Posts/semana (opcional) | abs | true |
| Engagement | Engagement médio (destaque) | pp | true |
| Engagement | Likes/post (linha) | abs | true |
| Engagement | Comentários/post (linha) | abs | true |

### Comportamento com dados em falta

- `competitorBreakdown.length === 0` → ambos os blocos `null`, cartões originais inalterados.
- `competitor.averageEngagementRate` falsy → bloco de Engagement comparison `null`.
- Linha individual com lado do concorrente em 0/null/NaN → linha omitida; nunca renderizar 0 como placeholder.
- 2+ concorrentes → usa só `competitorBreakdown[0]`; comentário `// TODO: multi-competitor layout (Fase 1.5)` no call site.

### Cópia (PT-PT, determinística)

Apenas as três frases listadas no prompt. Sem referência a estratégia, criatividade, algoritmo ou causas. O hint "competidor em baseline" só aparece quando `windowAligned === false`.

### Validação

- Typecheck: `bunx tsc --noEmit`.
- Visual: `/report/example` (mock tem 1 competitor `marketing.digital.pt`) — Overview mostra grelha de comparação; Engagement mostra bloco focado.
- Mobile 375px: `CompareStatBlock` já stacka `grid-cols-1 sm:grid-cols-[1fr_auto_1fr]` — sem overflow esperado.
- Free/Public render (modo `free` / `free_with_engagement`) sem alteração visual.

### O que NÃO se toca

`EditorialIdentityCard`, `EngagementCardRefined`, `ReportCompetitors` (gauge legacy), `competitors` array legacy, adapter, payload, Apify/OpenAI/DataForSEO, payments, checkout, EuPago, credits, entitlements, schema, pricing, Add Competitor logic, locked teaser cards, mock data shape, `competitorBreakdown` adapter.
