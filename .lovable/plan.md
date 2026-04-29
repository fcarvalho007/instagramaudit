## Objetivo

Transformar a secção **Procura de mercado associada ao perfil** num bloco premium e visível em `/analyze/$username`, sem tocar em `provider logic`, no `/report/example`, em ficheiros locked, no schema, nem chamar DataForSEO durante esta implementação.

A secção passa a:

1. Usar `normalized_payload.market_signals_free` quando já existe no snapshot — sem nova chamada de rede.
2. Cair para `/api/market-signals` apenas quando o snapshot **não** contém esse bloco, mantendo o contrato actual do endpoint (que já cacheia internamente).
3. Mostrar estados gracejos (`loading`, `no_keywords`, `timeout`/`error`, `disabled`/`blocked` silencioso).
4. Renderizar 4 cards premium em linguagem simples + chart só quando os dados são fortes.

## Ficheiros a editar

- `src/components/report-market-signals/report-market-signals.tsx` — orquestração + visual premium.
- `src/components/report-market-signals/market-signals-copy.ts` — copy nova (título, subtítulo, labels dos 4 cards).
- `src/components/report-redesign/report-shell.tsx` — passar o payload do snapshot já existente como `cachedSummary` ao `<ReportMarketSignals>` para evitar fetch desnecessário; **manter** o `ReportSectionFrame` à volta (já existe).
- `src/lib/report/snapshot-to-report-data.ts` — declarar de forma loose `market_signals_free?: unknown` em `SnapshotPayload` (apenas tipo, sem mexer em adapter logic) para podermos lê-lo do `result.data` sem `as any`. Alternativa: ler via `result.payload` se já estiver exposto (verificar antes de tocar).
- `src/components/report-redesign/report-shell.tsx` — também aceitar `payload` para passar a `market_signals_free`.

Nada toca: `routes/api/market-signals.ts`, `lib/dataforseo/*`, `lib/market-signals/cache.ts`, `MarketSignalsChart` (apenas re-uso).

## Detalhe da nova UI

Wrapper externo continua a ser o `ReportSectionFrame` que já existe no shell (eyebrow "Procura de mercado", título "Procura de mercado associada ao perfil", subtítulo "Cruza temas detetados no Instagram com sinais de pesquisa para perceber se também existe interesse fora da plataforma."). O componente interior renderiza:

```text
┌─────────────────────────────────────────────────────────────┐
│  [Card 1] Tema com maior sinal     [Card 2] Palavras-chave  │
│           <strongestKeyword>                <count> analisadas │
│                                                             │
│  [Card 3] Tendência                [Card 4] O que isto sugere│
│           <Em alta / Estável / Em queda>   <frase curta>    │
└─────────────────────────────────────────────────────────────┘
[Chart opcional — só se >= 6 pontos válidos numa série]
[Chips das keywords usable]   [Chips das dropped, dim]
[Linha pequena: "X/Y sinais usados nesta análise"]
```

- Grid 2×2 desktop, 1 coluna mobile.
- Cards com `bg-surface-elevated/60`, border `border-border-subtle/40`, `rounded-2xl`, padding generoso. Eyebrow mono uppercase, valor display Fraunces grande, descrição secundária pequena.
- Tendência derivada da série mais forte: comparar média da segunda metade vs primeira metade → "Em alta" (≥ +10%), "Em queda" (≤ -10%), "Estável" (entre os dois). Chip colorido com `accent-positive` / `accent-warning` / `content-tertiary`.
- "O que isto sugere" é uma frase curta determinística baseada em `(strongest, trend, usable.length)`:
  - Se `usable.length === 0` → "Os temas detetados ainda têm pouca pesquisa pública." (vai parar ao empty state, ver abaixo).
  - Se `trend === "up"` → "Existe procura crescente por «<strongest>». Reforçar conteúdo sobre este tema."
  - Se `trend === "down"` → "A procura por «<strongest>» tem perdido força. Avaliar diversificação de temas."
  - Se `trend === "flat"` → "«<strongest>» mantém procura estável fora do Instagram. Consolidar autoridade no tema."
- Chart só aparece se a série mais forte tem ≥ 6 valores válidos. Caso contrário, omite chart e mostra apenas chips + cards (requisito: "se chart data is weak, use keyword cards and directional labels instead").

## Estados

| Situação | Render |
|---|---|
| `cachedSummary` no snapshot | usar imediatamente, sem fetch |
| Sem cache + fetch em curso | skeleton compacto (3 placeholders rounded com pulse) |
| `disabled` ou `blocked` | `return null` (silencioso) |
| `no_keywords` | card único pastel: "Os temas detetados no perfil ainda não têm volume de pesquisa fora do Instagram suficiente para análise." |
| `timeout` ou `error` | card único pastel: "Não foi possível obter sinais de pesquisa neste momento. Voltar a tentar mais tarde." |
| `ready` ou `partial` mas `usable.length === 0` ou `!trends` | tratar como `no_keywords` |
| `ready`/`partial` com dados | UI premium completa |

`disabled`/`blocked` ficam silenciosos para não exporem mecânica interna ao público; o `ReportSectionFrame` envolvente em `report-shell.tsx` precisa de ser **condicionalmente** renderizado para não deixar um título "Procura de mercado" pendurado sobre vazio. Solução: o componente exporta uma sub-componente `<ReportMarketSignalsSection />` que **inclui** o frame e devolve `null` quando o estado é silencioso. O shell passa a usar essa wrapper e remove o `ReportSectionFrame` manual.

## Mudanças concretas

### 1. `market-signals-copy.ts`

Substituir o objecto pelos novos textos:

```ts
export const marketSignalsCopy = {
  eyebrow: "Procura de mercado",
  title: "Procura de mercado associada ao perfil",
  subtitle:
    "Cruza temas detetados no Instagram com sinais de pesquisa para perceber se também existe interesse fora da plataforma.",
  loading: "A cruzar temas do perfil com sinais de pesquisa…",
  cards: {
    strongest: "Tema com maior sinal",
    keywords: "Palavras-chave analisadas",
    trend: "Tendência",
    suggestion: "O que isto sugere",
  },
  trendLabels: { up: "Em alta", down: "Em queda", flat: "Estável" },
  empty: {
    noKeywords:
      "Os temas detetados no perfil ainda não têm volume de pesquisa fora do Instagram suficiente para análise.",
    soft:
      "Não foi possível obter sinais de pesquisa neste momento. Voltar a tentar mais tarde.",
  },
  quotaSingular: "sinal de mercado usado nesta análise",
  quotaPlural: "sinais de mercado usados nesta análise",
} as const;
```

### 2. `report-market-signals.tsx`

- Aceita nova prop opcional `cachedSummary?: PersistedMarketSignals` (forma compatível com a actual `MarketSignalsResponse` via adapter local — ou um tipo loose `unknown`, validado com Zod-light dentro do componente; preferir um type-guard simples já que persistido server-side). Quando presente, salta o `useEffect` e popula directamente `state = { status: "ready", data: <converted> }`.
- Exporta também `ReportMarketSignalsSection` que renderiza `<ReportSectionFrame ...>{<ReportMarketSignals/>}</...>` ou `null` quando o componente interno devolve null. Implementação: o componente interno pode aceitar uma callback `onResolve(visible: boolean)` ou simplesmente devolver null e o shell envolve sempre — é mais simples mover o frame **para dentro** do componente, mas isso ata-o ao tom visual. Decisão: manter o frame **fora** mas exportar um `useMarketSignalsVisibility(snapshotId, payload)` hook não é necessário — escolha pragmática: incorporar o frame dentro de `ReportMarketSignalsSection`, que é o que o shell usa.
- Layout premium descrito acima usando tokens existentes. Sem cores hardcoded.
- Helper puro `computeTrend(graph, keyword): "up"|"down"|"flat"` no mesmo ficheiro.
- Helper puro `composeSuggestion(strongest, trend)` no mesmo ficheiro.

### 3. `report-shell.tsx`

- Aceita nova prop `payload: SnapshotPayload` (ou tira do `result` se já estiver exposto — verificar se `result.data` carrega o payload bruto; se não, adicionar passagem explícita a partir de `analyze.$username.tsx` onde o payload já é conhecido).
- Substitui o bloco actual pelo:

```tsx
<ReportMarketSignalsSection
  snapshotId={snapshotId}
  plan="free"
  cachedSummary={
    (payload as Record<string, unknown>).market_signals_free as
      | PersistedMarketSignals
      | undefined
  }
/>
```

E remove o `ReportSectionFrame` manual desta secção.

### 4. `analyze.$username.tsx`

Passar `payload={body.snapshot.payload}` ao `<ReportShell>`. O payload já existe no estado, é só forwarding.

### 5. `snapshot-to-report-data.ts`

Adicionar um campo opcional ao tipo `SnapshotPayload`:

```ts
market_signals_free?: unknown;
market_signals_paid?: unknown;
```

Pura mudança de tipo. Sem alterações ao adapter.

## Validação

- `bunx tsc --noEmit` — verde.
- `bun run build` (corre automaticamente pelo harness).
- QA visual local com 2 cenários:
  1. Snapshot **com** `market_signals_free` em estado `ready` → 4 cards + chart + chips + linha de quota; **zero** chamadas a `/api/market-signals` (verificar tab Network).
  2. Snapshot **sem** `market_signals_free` → loading skeleton → fetch ao endpoint; resposta `no_keywords` mostra card único pastel.
- Mobile @ 375px: 1 coluna, cards legíveis, sem overflow horizontal, chart com 224px de altura ou omitido.

## Garantias

- Sem chamadas a DataForSEO durante esta implementação (nenhum código novo invoca o provider).
- `/report/example` intocado.
- Provider logic, cache, allowlist, kill-switch, schema, RLS — tudo intocado.
- Quando o snapshot já traz cache, **zero** rede.
- `MarketSignalsChart` reusado tal-e-qual.
- `disabled`/`blocked` desaparecem silenciosamente (sem expor mecânica interna).

## Checkpoint

- ☐ `market-signals-copy.ts` com nova copy (título, subtítulo, labels dos 4 cards, frases dos estados).
- ☐ `report-market-signals.tsx` com 4 cards premium, chart condicional e helper puro de tendência/sugestão.
- ☐ Suporte a `cachedSummary` que evita fetch quando o snapshot já traz `market_signals_free`.
- ☐ Estados `loading`, `no_keywords`, `timeout`/`error` com cards pastel claros e `disabled`/`blocked` silencioso (sem frame pendurado).
- ☐ `report-shell.tsx` passa `cachedSummary` extraído do payload e remove o frame manual.
- ☐ `analyze.$username.tsx` propaga `payload` ao shell.
- ☐ `SnapshotPayload` ganha `market_signals_free?: unknown` (apenas tipo).
- ☐ `bunx tsc --noEmit` verde; QA mobile/desktop confirmado.
