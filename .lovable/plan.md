## Objetivo

Tornar `market_signals_free` parte da geração primária do snapshot em `/api/analyze-public-v1` para que report, OpenAI e PDF leiam todos a mesma fonte de verdade, sem depender da segunda chamada client-side a `/api/market-signals`.

## Ficheiros a modificar

1. `src/routes/api/analyze-public-v1.ts` — passo inline DataForSEO + summary para OpenAI.
2. `src/lib/insights/types.ts` — alargar `InsightsContext.market_signals` com campos opcionais.
3. `src/lib/insights/prompt.ts` — incluir novos campos no payload do utilizador, registar paths em `available_signals`, reforçar regra editorial.
4. `src/lib/insights/validate.ts` — aceitar novos paths (já cobertos automaticamente porque a allow-list é derivada do `ctx`, mas confirmar e adicionar testes mentais).

Nada mais é tocado. `/report/example`, ficheiros locked, PDF, UI, esquema Supabase, modelo OpenAI, Apify client, admin UI ficam intactos.

## Mudança em `analyze-public-v1.ts`

Local: imediatamente após `primaryEnriched` ser calculado e antes da construção do `ctx: InsightsContext`.

Pseudo-fluxo:

```text
let marketSignalsFree: PersistedMarketSignals | null = null;

const tentativeNormalized = {
  profile, content_summary, competitors, posts, format_stats
} as Record<string, unknown>;

// 1. Cache: se snapshot existing já tinha market_signals_free válido,
//    reaproveitar (evita chamada duplicada quando refresh=1 sem TTL expirado).
if (existing) {
  const cached = readCachedSummary(existing.normalized_payload, "free");
  if (cached) marketSignalsFree = cached;
}

// 2. Gates: kill-switch + allowlist (testing mode). Sem chamada se bloqueado.
if (!marketSignalsFree && isDataForSeoEnabled() && isAllowed(primaryProfile.username)) {
  try {
    const result = await buildMarketSignals(tentativeNormalized as SnapshotPayload, {
      ownerHandle: primaryProfile.username,
      plan: "free",
      totalTimeoutMs: 20_000, // mais curto que o cap externo de 60s
    });

    // Recolher provider_call_logs criados nesta janela (para custo + ids).
    // Igual ao padrão de /api/market-signals.

    const ttl = decideCacheTtlSeconds(result);
    if (ttl !== null) {
      marketSignalsFree = buildPersistedSummary({
        result, plan: "free", ttlSeconds: ttl,
        providerCostUsd, providerCallLogIds, now: new Date(),
      });
    }
  } catch (err) {
    console.warn("[analyze-public-v1] market signals failed", err);
  }
}
```

Garantias:
- `buildMarketSignals` nunca atira; o `try/catch` é apenas defesa em profundidade.
- Cache hit (cached !== null) NÃO chama `buildMarketSignals` → não cria novos `provider_call_logs`.
- Kill-switch off → log info, sem chamada, sem persistência (estado "disabled" não é cacheável).
- Allowlist bloqueia → sem chamada, sem persistência.
- Erros soft (timeout / unknown) cacheados 10 min via `decideCacheTtlSeconds`, igual ao endpoint atual.
- Erros hard (auth / blocked / disabled) não cacheados.

Persistência: `normalizedPayload` ganha `market_signals_free` quando existe, antes de `storeSnapshot`. Mantém compatibilidade — campo opcional.

## Mudança em `insights/types.ts`

```ts
market_signals: {
  has_free: boolean;
  has_paid: boolean;
  top_keywords?: string[];
  strongest_keyword?: string | null;
  trend_direction?: "up" | "flat" | "down" | null;
  dropped_keywords?: string[];
};
```

Todos os novos campos opcionais → snapshots existentes continuam válidos.

## Mudança em `analyze-public-v1.ts` — derivação do summary

Helper local `summarizeMarketSignals(ms: PersistedMarketSignals | null)`:
- `has_free` = `ms?.status === "ready" || ms?.status === "partial"`.
- `top_keywords` = `ms.trends_usable_keywords.slice(0, 5)`.
- `strongest_keyword` = primeiro de `top_keywords` ordenado pela média de valores nas séries do Trends (fallback: primeiro item).
- `trend_direction` = comparar média das primeiras 4 semanas vs últimas 4 do `strongest_keyword`:
  - `> +5%` → `"up"`, `< -5%` → `"down"`, caso contrário `"flat"`. `null` se sem dados suficientes.
- `dropped_keywords` = `ms.trends_dropped_keywords.slice(0, 5)`.

Passar para `ctx.market_signals`. Se `marketSignalsFree` é `null`, manter `{ has_free: false, has_paid: false }`.

## Mudança em `insights/prompt.ts`

`computeAvailableSignals`:
- Quando `ctx.market_signals.has_free`, adicionar:
  - `market_signals.strongest_keyword` (se não-null)
  - `market_signals.top_keywords` (se array não vazio)
  - `market_signals.trend_direction` (se não-null)
  - `market_signals.dropped_keywords` (se array não vazio)

`InsightsUserPayload.market_signals` ganha os mesmos campos opcionais.

`buildInsightsUserPayload` propaga os campos quando presentes.

`INSIGHTS_SYSTEM_PROMPT`: acrescentar 1 parágrafo:

> "Quando `market_signals.has_free` é `true`, é OBRIGATÓRIO produzir pelo menos um insight que cruze o desempenho do perfil com a procura de mercado, citando `market_signals.strongest_keyword` e/ou `market_signals.trend_direction` em `evidence`. Quando `has_free` é `false`, NÃO referir procura de mercado, keywords nem tendências de pesquisa."

## Mudança em `insights/validate.ts`

A allow-list de evidence é derivada de `buildInsightsUserPayload(ctx)` → `computeAvailableSignals(ctx)`, logo os novos paths são automaticamente aceites quando presentes. Apenas alargar `TECHNICAL_LEAK_PATTERNS` se necessário — neste caso o regex já cobre `market_signals.…` como caminho técnico proibido em title/body, o que continua correcto (o modelo cita em `evidence` mas escreve em pt-PT no body, ex.: "tendência de procura em alta para 'fotografia lisboa'").

Sem alteração funcional ao validador além de confirmação de cobertura.

## Comportamento — checklist requerido antes de smoke-test

- `market_signals_free` será tentado inline: SIM, após `primaryEnriched` e antes do bloco OpenAI.
- DataForSEO desativado (`DATAFORSEO_ENABLED!=true`): sem chamada, sem persistência, snapshot continua, OpenAI recebe `has_free=false`.
- Allowlist bloqueia o handle: sem chamada, sem persistência, mesmo comportamento.
- Cache hit: usa `readCachedSummary` no `existing.normalized_payload`; nenhum novo `provider_call_logs`.
- Falha do DataForSEO (timeout/erro): `buildMarketSignals` devolve envelope; se `decideCacheTtlSeconds` autorizar, persiste estado negativo curto (10 min); snapshot Instagram nunca quebra.

## Validação

- `bunx tsc --noEmit`
- `bun run build`
- Smoke-test só após aprovação explícita do utilizador.

## Checkpoint

- ☐ `market_signals_free` adicionado a snapshots novos quando DataForSEO ativo + allowlisted
- ☐ Snapshot Instagram nunca falha por causa do DataForSEO
- ☐ OpenAI recebe `top_keywords`, `strongest_keyword`, `trend_direction`, `dropped_keywords` quando disponíveis
- ☐ Prompt instrui cruzamento desempenho × procura só quando `has_free===true`
- ☐ Cache hit não gera novos `provider_call_logs`
- ☐ `/report/example` e ficheiros locked intactos
- ☐ `bunx tsc --noEmit` verde
- ☐ `bun run build` verde
