# Conclusão do contrato `editorial_verdict`

A implementação está praticamente toda feita e o typecheck/testes passam (462/462). Faltam apenas dois pontos do plano original.

## Lacunas detectadas

1. **`stale_data` nunca é emitido.** O tipo `EditorialVerdictWarning` em `src/lib/insights/types.ts` inclui `"stale_data"`, mas `finalizeEditorialVerdict` em `src/lib/insights/openai-insights.server.ts` (linhas 369–400) não tem a regra correspondente.
2. **Sem teste dedicado para warnings.** Existe `validate-v2-verdict.test.ts` (schema/validador), mas falta o `editorial-verdict-warnings.test.ts` que cobre o pós-processamento determinístico.

## Mudanças

### 1. `src/lib/insights/openai-insights.server.ts`
Acrescentar a regra de frescura dentro de `finalizeEditorialVerdict`, lendo a data do último post a partir do `InsightsContext`. Confirmar primeiro o campo exacto disponível em `ctx` (provavelmente `ctx.content_summary.last_post_at` ou `ctx.profile.last_post_at`); se não existir, derivar de `ctx.content_summary` quando houver `days_since_last_post`.

```ts
const daysSinceLastPost = ctx.content_summary.days_since_last_post ?? null;
if (daysSinceLastPost !== null && daysSinceLastPost > 60) {
  warnings.push("stale_data");
}
```

Manter a ordem actual (low_sample → cadence_uncertain → stale_data → no_market_signals → benchmark_missing) e os caps de `confidence` (≥2 warnings → low, 1 warning + high → medium, limited_data → low).

### 2. `src/lib/insights/__tests__/editorial-verdict-warnings.test.ts` (novo)
Testes mínimos sobre `finalizeEditorialVerdict`:

- 3 posts → contém `low_sample` e `verdict_label === "limited_data"` e `confidence === "low"`.
- cadência semanal < 0.25 com 7 posts → contém `cadence_uncertain`.
- `days_since_last_post = 90` → contém `stale_data`.
- `market_signals.has_free = false` → contém `no_market_signals`.
- `benchmark = null` → contém `benchmark_missing`.
- 2+ warnings com `confidence: "high"` no raw → final `confidence === "low"`.
- 1 warning com `confidence: "high"` → final `confidence === "medium"`.
- Cenário limpo (8 posts, cadência saudável, benchmark presente, market_signals com free) → `warnings.length === 0` e `confidence` preservado.

Usar factories locais para `InsightsContext` e `EditorialVerdict` (objectos mínimos válidos), sem mocks de rede.

## Verificação

- `bunx tsc --noEmit`
- `bunx vitest run src/lib/insights/__tests__/editorial-verdict-warnings.test.ts`
- `bunx vitest run` (confirmar 463+ testes verdes)

## Não-objectivos

- Não tocar em UI, prompt, schema ou adapter.
- Não alterar lógica de `confidence` para além do já especificado.
- Não adicionar novos campos ao contrato.

## Checkpoint

- ☐ Confirmar campo de frescura disponível em `InsightsContext`
- ☐ Adicionar regra `stale_data` em `finalizeEditorialVerdict`
- ☐ Criar `editorial-verdict-warnings.test.ts` com os 8 cenários
- ☐ `tsc --noEmit` limpo
- ☐ `vitest run` todo verde
