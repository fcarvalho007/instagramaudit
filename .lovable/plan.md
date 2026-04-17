

## Entendimento

**1. Fluxo landing → analyze → gate**: hero action bar → `/analyze/$username` → `<PublicAnalysisDashboard>` (header, métricas, benchmark, concorrentes, premium gate) → modal já real (server route + Supabase).

**2. Rota `/analyze/$username`**: SSR friendly, chama `getMockAnalysis(username)` (determinístico via hash do handle) e passa `data` ao dashboard. Sem loader, sem fetch, sem error/notFound boundaries ainda.

**3. Partes já reais no fluxo público**:
- Captura de leads (`/api/request-full-report`) — server route + service role + Supabase (`leads` + `report_requests`).
- Quota local (localStorage).
- Validação de username, navegação, design system, modal premium.

**4. Partes ainda provisórias / mock**:
- **Tudo o que é dados de análise**: profile, métricas, benchmark, concorrentes, premium teasers — todos derivados de `getMockAnalysis()`.
- Sem Apify, sem cache, sem persistência de análises, sem backend de análise.

**5. Porquê o benchmark deve ser real antes dos concorrentes**: o benchmark é a peça que dá *contexto interno* a uma única conta — depende só de métricas próprias + tabela de referência. Concorrentes exigem scraping adicional (Apify), gestão de quotas, cache cruzada. Tornar benchmark real primeiro: (a) elimina dependência de hash determinístico no número mais visível do dashboard, (b) cria a camada de configuração reutilizável que os concorrentes vão consumir, (c) é entregável sem nova dependência externa.

---

## Discrepância arquitectural a resolver

**A spec assume um "Edge Function de análise pública" que enriquece a resposta com `benchmark_positioning`. Esse endpoint NÃO existe.** A única coisa que a rota `/analyze/$username` faz é correr `getMockAnalysis()` em SSR. O único endpoint server real é `/api/request-full-report` (captura de leads, irrelevante aqui).

Opções:

**A. Criar um server route `/api/analyze/$username`** que faz o "mock + benchmark enrichment" no servidor, e mudar a rota para fazer fetch via loader.
- Prós: cumpre literalmente a spec ("Edge Function enrichment").
- Contras: introduz fetch+loader+boundaries para zero ganho real (os dados continuam mock); o "enrichment" está a acontecer em código que vai ser deitado fora quando o Apify entrar; cria infra que será reescrita.

**B. Criar a engine de benchmark como módulo puro** (`src/lib/benchmark/`) que recebe `{ followers, engagement, dominantFormat }` e devolve `BenchmarkPositioning`. Chamar essa engine **dentro** de `getMockAnalysis()` (substitui o cálculo `reference` baseado em hash) ou no loader da rota. A engine fica isolada, testável, e quando o Apify+Edge Function chegarem é literalmente um `import` dentro do handler server.
- Prós: cumpre o objectivo real da spec ("benchmark logic in reusable product layer, not in UI"); zero código throwaway; evita fetch fictício; mantém SSR rápido; engine 100% reutilizável depois.
- Contras: o "Edge Function enrichment" da spec passa a ser "library that any future Edge Function will call" — diferença semântica, não arquitectural.

**Recomendação: B.** A spec optimiza para o estado final (server-side enrichment), mas no estado actual não há server de análise. Construir a engine como módulo puro cumpre a *intenção* (lógica fora da UI, reutilizável, productizada) sem criar plumbing descartável. Quando o Apify+server entrarem, o módulo é importado lá dentro — zero retrabalho.

---

## Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `src/lib/benchmark/tiers.ts` | **Criar** — `AccountTier` enum + `getTierForFollowers()` + thresholds explícitos (Nano/Micro/Mid/Macro/Mega) | Não |
| `src/lib/benchmark/reference-data.ts` | **Criar** — tabela 2D `[tier][format] → benchmark engagement %` + labels pt-PT + última actualização | Não |
| `src/lib/benchmark/engine.ts` | **Criar** — `computeBenchmarkPositioning({ followers, engagement, dominantFormat })` → `BenchmarkPositioning` shape normalizado + fallback `unavailable` | Não |
| `src/lib/benchmark/types.ts` | **Criar** — `BenchmarkPositioning`, `PositionStatus`, `AccountTier`, `BenchmarkFormat` | Não |
| `src/lib/mock-analysis.ts` | **Editar** — substituir cálculo aleatório de `reference` por chamada real à engine; expor novo campo `benchmarkPositioning` na `AnalysisData`; manter `benchmark` legacy preenchido a partir do positioning para não partir nada | Não |
| `src/components/product/analysis-benchmark-block.tsx` | **Editar** — consumir `BenchmarkPositioning` (props nova `positioning`); renderizar tier + formato + delta% + estado; tratar caso `unavailable` com mensagem pt-PT calma | Não |
| `src/components/product/public-analysis-dashboard.tsx` | **Editar mínimo** — passar `data.benchmarkPositioning` ao block | Não |

**Zero ficheiros locked.** Não toco em tokens, layout, modal, server route de leads, types Supabase, `__root.tsx`.

---

## Engine de benchmark — design

### Tiers (thresholds explícitos)

```ts
nano:  0       – 9,999     followers
micro: 10,000  – 49,999
mid:   50,000  – 249,999
macro: 250,000 – 999,999
mega:  1,000,000+
```

### Reference data (engagement % esperado, formato × tier)

Valores baseados em ranges públicos comuns da indústria (Influencer Marketing Hub, HypeAuditor, etc.). Documentados como **v1 baseline editorial** — não tabela definitiva, refinável depois.

```
              Reels   Carrosséis   Imagens
nano          5.60    4.20         3.10
micro         3.20    2.40         1.80
mid           1.80    1.30         0.95
macro         1.10    0.80         0.55
mega          0.70    0.50         0.35
```

### Cálculo

```ts
function computeBenchmarkPositioning(input): BenchmarkPositioning {
  if (!input.followers || !input.engagement || !input.dominantFormat) {
    return { status: "unavailable", reason: "missing_inputs" };
  }
  const tier = getTierForFollowers(input.followers);
  const benchmarkValue = getReference(tier, input.dominantFormat);
  const delta = input.engagement - benchmarkValue;
  const deltaPct = (delta / benchmarkValue) * 100;

  // ±10% threshold for "aligned"
  const positionStatus =
    deltaPct > 10 ? "above" : deltaPct < -10 ? "below" : "aligned";

  return {
    status: "available",
    accountTier: tier,
    accountTierLabel: TIER_LABELS[tier],            // "Micro (10K–50K)"
    dominantFormat: input.dominantFormat,
    benchmarkValue,
    profileValue: input.engagement,
    differencePercent: deltaPct,
    positionStatus,
    shortExplanation: buildExplanation(positionStatus, tier, format),
  };
}
```

### Shape normalizado (consumido pela UI hoje, server amanhã)

```ts
type BenchmarkPositioning =
  | { status: "available"; accountTier; accountTierLabel; dominantFormat;
      benchmarkValue; profileValue; differencePercent; positionStatus;
      shortExplanation }
  | { status: "unavailable"; reason: "missing_inputs" | "no_reference_for_tier" };
```

Espelha exactamente o que um futuro server route devolveria — sem retrabalho.

---

## UI — alterações no benchmark block

- Header mantém-se. Subtítulo passa a ser dinâmico: *"Benchmark · {dominantFormat} · {accountTierLabel}"*.
- Barra mantém visual; `max` deixa de ser `1.8` hardcoded — usa `Math.max(profileValue, benchmarkValue) * 1.4`.
- Badge: 3 estados pt-PT — "Acima do benchmark" / "Alinhado com o benchmark" / "Abaixo do benchmark".
- Linha numérica: adicionar `differencePercent` com sinal (`+18%` / `−12%`).
- Helper text: `shortExplanation` da engine.
- Estado `unavailable`: bloco mantém estrutura, mostra mensagem pt-PT calma — *"Não foi possível calcular o benchmark neste momento. A comparação será apresentada assim que os dados estiverem disponíveis."* Sem barra, sem badge.

---

## Copy pt-PT (impessoal)

- Title: *"Posicionamento face ao benchmark"* (mantém)
- Sub: *"Comparação com contas do mesmo escalão e formato dominante"* (nova helper line)
- Status: *"Acima do benchmark"* / *"Alinhado com o benchmark"* / *"Abaixo do benchmark"*
- Explanations exemplo:
  - above: *"Envolvimento {X}% acima do benchmark para contas {tier} no formato {formato}."*
  - aligned: *"Envolvimento em linha com o benchmark para contas {tier} no formato {formato}."*
  - below: *"Envolvimento {X}% abaixo do benchmark para contas {tier} no formato {formato}. Margem para refinar formato dominante e pacing."*
- Fallback: *"Não foi possível calcular o benchmark neste momento."*

---

## Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem competitor scraping / dados reais | ✅ (concorrentes intactos no mock) |
| Sem PDF / email / pagamentos / auth | ✅ |
| Sem novas dependências | ✅ (zod já no projecto, nada novo) |
| Sem redesign | ✅ (block mantém estrutura visual, só conteúdo melhora) |
| Lógica de benchmark fora da UI | ✅ (módulo `src/lib/benchmark/`) |
| Sem hardcode de cores/fontes/spacing | ✅ |
| Zero locked files | ✅ |
| pt-PT impessoal | ✅ |
| Comentários técnicos em inglês | ✅ |
| Future-ready para Apify+server | ✅ (engine pura, importável de qualquer server route) |

---

## Checkpoints

- ☐ `src/lib/benchmark/` criado (tiers + reference-data + engine + types)
- ☐ Tier por `followers_count` implementado e legível
- ☐ Cálculo de positioning com 3 estados (`above`/`aligned`/`below`)
- ☐ Estado `unavailable` com fallback pt-PT
- ☐ `mock-analysis.ts` integra a engine real (substitui `reference` aleatório)
- ☐ `analysis-benchmark-block.tsx` consome shape normalizado
- ☐ Concorrentes intencionalmente fora de scope
- ☐ Sem novas dependências, sem locked files, sem auth/email/PDF/pagamentos

---

## Nota de comunicação ao utilizador

A spec pede para enriquecer "a Edge Function existente". Não existe nenhuma Edge Function de análise pública neste projecto — a rota `/analyze/$username` corre o mock em SSR directo. Construo a engine como módulo puro reutilizável (`src/lib/benchmark/`) que cumpre 100% a intenção arquitectural ("benchmark logic in reusable product layer, not in UI"). Quando o backend Apify+análise existir num prompt futuro, o handler server faz `import { computeBenchmarkPositioning }` e devolve o mesmo shape — zero retrabalho.

