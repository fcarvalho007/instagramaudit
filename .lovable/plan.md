## 1. OpenAI daily budget gate

### Novo ficheiro: `src/lib/security/openai-budget.server.ts`

Espelha estrutura de `apify-budget.server.ts`:

- Classe `OpenAiBudgetExceededError extends Error` com `spentUsd`/`capUsd`.
- `getOpenAiDailyCapUsd()` lê `OPENAI_DAILY_CAP_USD` (default **5**).
- `getOpenAiDailySpendUsd(now)` soma `actual_cost_usd ?? estimated_cost_usd` de `provider_call_logs` com `provider='openai'` desde 00:00 UTC. Cache em memória 60s. Fail-open em erro de query (devolve 0 + console.error).
- `assertOpenAiDailyBudgetAvailable()` — atira `OpenAiBudgetExceededError` quando `spent >= cap`.
- `invalidateOpenAiBudgetCache()` para testes.

Sem "hard cap" separado (Apify distingue daily/hard porque Apify também tem cap por run; OpenAI tem um único cap). Reusar `OPENAI_DAILY_CAP_USD`.

### Integração em `run-enrichment.server.ts`

Em `runInsightsV1`, `runInsightsV2`, `runVisualCover`, `runCaptionSemantic`, no `try` logo após o `isOpenAiAllowed` guard (antes de qualquer trabalho):

```ts
try {
  await assertOpenAiDailyBudgetAvailable();
} catch (err) {
  if (err instanceof OpenAiBudgetExceededError) {
    console.warn(`${LOG} <name> skipped — daily OpenAI budget exhausted`, {
      spent: err.spentUsd, cap: err.capUsd,
    });
    return { ok: true, payloadPatch: null }; // skipped, no AI, no error to user
  }
  throw err;
}
```

Importante: devolve `{ ok: true, payloadPatch: null }` (igual ao path `DISABLED`/`NOT_ALLOWED`), portanto o job vai a `skipped`/`success` sem AI, sem propagar erro nem para o utilizador nem para o `enrichment_jobs.status='error'`. Sem patch → snapshot continua sem o campo AI, UI degrada graciosamente.

### Test
- Novo `src/lib/security/__tests__/openai-budget.test.ts` espelhando `apify-budget.test.ts`: cap default 5, lê env, soma actual/estimated, cache TTL, assert atira `OpenAiBudgetExceededError`.

## 2. Sanitização final de erros em `analyze-public-v1.ts`

`sanitizeExtra()` (linhas 158-167) já remove tudo o que não esteja em `PUBLIC_ERROR_EXTRA_KEYS = {retry_after_seconds}` — portanto `details`, `provider_message`, `provider_status`, `run_id`, `provider`, `provider_error_code` **já são droppados na response**. Mas é má prática deixar essas keys no call site, porque:

- Confunde leitor de código.
- Se alguém alargar `PUBLIC_ERROR_EXTRA_KEYS` mais tarde, expõe acidentalmente.

### Limpeza nas 3 chamadas (linhas 1084, 1115, 1133)

Remover o objecto `extra` por completo das 3 `failure(...)`:

```ts
// L1084
return failure("UPSTREAM_UNAVAILABLE");
// L1115
return failure("UPSTREAM_FAILED");
// L1133
return failure("UPSTREAM_FAILED");
```

Os campos eliminados (`provider`, `provider_error_code`, `provider_status`, `provider_message`, `run_id`, `details`) já vão para `console.error(...)` imediatamente antes de cada `failure(...)` — comprovado nas linhas 1075, 1091-1095, 1124. Para reforçar:

- Em L1124 (`console.error("[analyze-public-v1] unexpected", err)`) — manter; já loga o erro completo.
- Em L1091-1095: completar para logar `err.code` e `err.runId` também (defense in depth para post-mortems).

`provider_call_logs.error_excerpt` é populado pelo `apify-client` — não tocar.

### Sweep adicional

`rg "details:" src/routes/api/analyze-public-v1.ts` confirma apenas estas 3 ocorrências; nenhuma outra `failure(...)` no ficheiro tem `extra`. Os `competitorFailure(...)` (L190+) usam estrutura própria e não vazam mensagem.

## 3. Plano (não implementar) — Editorial Identity Card vs KPI grid

### Estado actual

`src/components/report-redesign/v2/overview/editorial-identity-card.tsx` renderiza:

- **Band 1**: headline editorial (AI ou fallback) + ScoreRing global (0-100) + chip Forte/A melhorar/Crítico.
- **Band 2**: 2 mini-cartões ("Ponto forte" + "A melhorar") com subtitle que inclui:
  - `Envolvimento` → `↗ 3,42% · +12% vs benchmark`
  - `Interação` → `↘ 8 comentários/post · abaixo da média`
  - `Frequência` → `↗ 3,1 posts/semana`

A duplicação reside em **Band 2**: cada mini-cartão repete uma métrica que volta a aparecer poucos pixels abaixo:

| Mini-cartão | KPI duplicado abaixo |
|---|---|
| Envolvimento `X% · ±Y%` | `EngagementCardRefined` (mesmo `engagementRate` + delta) |
| Frequência `X posts/semana` | `FrequencyCard` (mesmo `postingFrequencyWeekly`) |
| Interação `X comentários/post` | (parcial) métrica usada em `PostComparisonBlock` médias |

### Proposta editorial (sem implementar agora)

Substituir **Band 2** por:

1. **1 linha de observação editorial AI curta** (≈140 chars) vinda de `aiInsightsV2.sections.hero.text` partido em headline (já feito) + uma observação adicional vinda de `aiInsightsV2.sections.summary.text` ou novo campo `aiInsightsV2.sections.diagnosis.text`. Fallback determinístico já existe em `buildFallbackSentence` — usar a 2ª frase quando AI ausente.
2. **1 chip de posicionamento vs benchmark** (única métrica preservada): "Acima da referência do escalão" / "Em linha" / "Abaixo" baseado em `engagementDeltaPct` (>+15%, ±15%, <-15%). Tons emerald/amber/rose. Sem número.

Resultado:
- Mantém ScoreRing global (única métrica numérica) — não duplica nada porque KPIs abaixo são por dimensão.
- Remove `TrendingUp`/`AlertCircle` mini-cards.
- Remove imports de `buildMiniCardSubtitle`, `deriveStrengthWeaknessKeys`, `SCORE_LABELS`.
- Mantém prop `scores` (necessária para ScoreRing global) e `keyMetrics.engagementDeltaPct` (para chip).
- Reduz altura do componente ~40%, alinha melhor com Iconosquare-pure (cards brancos com 1 KPI primário).

### Decisões a confirmar antes de implementar

1. Texto do chip — usar `engagementDeltaPct` (já presente) ou criar um score de posicionamento composto (engagement+frequência+interação)?
2. Quando AI ausente: chip ainda assim ou só headline?
3. Manter `SCORE_LABELS`/`deriveStrengthWeaknessKeys` (export?) para reutilização em outro lado, ou apagar?

Não tocar:
- `/report.example` (read-only por contrato).
- `score-utils.ts`, `ScoreRing`, `EngagementCardRefined`, `FrequencyCard`, `FormatCard`.
- Apify (cost source, allowlist, budget).

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (inclui o novo `openai-budget.test.ts`)
- Manual:
  - **Budget OpenAI**: forçar cap muito baixo (e.g. `OPENAI_DAILY_CAP_USD=0.001`) e correr enrichment — confirmar `enrichment_jobs.status` não fica `error`, snapshot sem campos AI, sem mensagem ao utilizador.
  - **Error sanitization**: forçar `ApifyUpstreamError` (mock no dev) e ver response — confirmar JSON contém apenas `success`, `error_code`, `message`; nada de `details`/`provider_message`/`run_id`.
  - **UI free com Editorial Card actual**: screenshot do `/analyze/<handle>` em modo free para registar o estado actual e comparar quando passo 3 for implementado.

## Constraints respeitadas

- Read-only em `/report.example` ✓
- Apify intacto ✓
- Sem regeneração de relatórios ✓
- Sem emails enviados ✓
- Passo 3 só **plano**, sem código ✓
