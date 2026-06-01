
# Block 1 — Amostra oficial e consistência matemática

Objetivo: definir UMA amostra canónica para o Bloco 1 (Visão Geral) do relatório gratuito, alinhar todas as métricas a essa amostra, clarificar a copy e remover do índice global o sub-score de interação que hoje é praticamente constante (25).

Sem mexer em: limites do Apify, pricing, pagamentos, e-mails, gates, prompts OpenAI, `/report.example`.

---

## 1. Amostra oficial do Bloco 1

Novo módulo puro: `src/lib/report/block01-sample.ts`

```ts
export interface Block01Sample {
  totalReturnedPosts: number;     // posts.length
  analyzedPosts: SnapshotPost[];  // = não-fixados (fallback: todos)
  performancePosts: SnapshotPost[]; // = analyzedPosts limpos de outliers de data
  cadencePosts: SnapshotPost[];     // = idem performancePosts
  formatPosts: SnapshotPost[];      // = analyzedPosts (opção A)
  pinnedPostsExcluded: number;
  dateOutliersExcluded: number;
  observedPeriodDays: number;       // ceil((newest-oldest)/86400000)+1, mínimo 1
  newestPostDateIso: string | null;
  oldestPostDateIso: string | null;
  sampleLabel: string;              // PT/EN curado por i18n no consumidor
}
export function buildBlock01Sample(posts: SnapshotPost[]): Block01Sample;
```

Regras:
- Base: `posts` já vem capado por `PUBLIC_INSTAGRAM_POSTS_LIMIT = 12` (sem alterar).
- Excluir `is_pinned === true` para `analyzedPosts`. Se tudo vier fixado, fallback = todos.
- Aplicar `pruneDateOutliers` (já existe em `snapshot-to-report-data.ts`) para `performancePosts/cadencePosts`.
- Formato (opção A, escolhida): distribuição calculada a partir de `analyzedPosts` (sem pinned). Mais consistente — likes/comments/engagement já vão excluir pinned.
- `observedPeriodDays` calculado a partir de `performancePosts` reais; nunca usar "30 dias" como default.

## 2. Alinhamento de métricas em `snapshotToReportData`

Ficheiro: `src/lib/report/snapshot-to-report-data.ts`

- Chamar `buildBlock01Sample(posts)` uma única vez no topo de `snapshotToReportData`.
- Passar `sample.performancePosts` em vez de `posts` para:
  - `buildKeyMetrics` (médias de likes/comments/engagement re-calculadas a partir do sample, não de `content_summary` legacy).
  - `buildTopPosts` (não-pinned, ordenados por engagement) — pinned continua disponível no payload, mas sai do "best vs worst" para não distorcer.
  - `buildFormatBreakdown` (recalcular shares a partir de `sample.formatPosts`, ignorando `format_stats` legacy quando há posts suficientes).
- `cadencePostsRaw`/`cadencePostsClean` passam a vir de `sample.cadencePosts` (remove duplicação atual).
- Expor `sample` no `coverage`/`enriched`:
  - `coverage.windowDays = sample.observedPeriodDays`
  - novo: `enriched.block01Sample` (subset serializável).

## 3. Médias canónicas

Ficheiro: `src/lib/report/post-aggregates.ts`

- `computePostAverages(posts, { excludePinned = true })` — passar a aceitar opção e usar pinned-excluded por defeito.
- Chamadores: `report-overview-block.tsx`, qualquer card P05 que use a função. P05 continua a poder pedir `excludePinned: false` se quiser comparar.

## 4. Copy clara e sem "30 dias" implícito

`src/i18n/locales/pt/report.json` e `src/i18n/locales/en/report.json`:

Novos strings (chave sugerida `overview.sample.*`):
- PT:
  - `caption`: "Análise baseada nas últimas {{count}} publicações disponíveis."
  - `period`: "Período observado: {{days}} dias."
  - `pinnedExcluded`: "{{count}} publicações fixadas foram excluídas dos cálculos de cadência e desempenho."
- EN (espelhar).

Auditar e substituir / remover qualquer frase com "30 dias" / "last 30 days" no Bloco 1 a menos que o card tenha `cadence.method === "window_30d"` (que é o único caso legítimo). Locais a varrer:
- `editorial-identity-card.tsx` (tooltip "Como foi calculado", subtítulos)
- `frequency-card.tsx`
- `format-card.tsx`
- `report-overview-engagement.tsx`
- `cadence-label.ts`
- chaves `overview.*` / `frequency.*` / `format.*` nos dois ficheiros i18n.

Render: pequena nota discreta no rodapé do `EditorialIdentityCard` (acima do MetricsStrip), 11–12px, `text-content-tertiary`.

## 5. Resolver sub-score de interação (Opção A)

`src/components/report-redesign/v2/overview/score-utils.ts`:
- Remover `computeInteraccao`, `interaccaoSubtitle`, `"interaccao"` de `ScoreKey`, e a entrada em `SCORE_DEFINITIONS`.
- Novo `computeGlobalScore(envolvimento, frequencia)` com pesos:
  - `envolvimento: 0.60`
  - `frequencia: 0.40`
- Tipo `ScoreKey = "envolvimento" | "frequencia"`.

`src/components/report-redesign/v2/report-overview-block.tsx`:
- Remover entrada `interaccao` em `scores`.
- Passar 2 valores para `computeGlobalScore`.

`src/components/report-redesign/v2/overview/editorial-identity-card.tsx`:
- Atualizar `EditorialIdentityCardProps.scores` para o novo `ScoreKey`.
- Remover qualquer leitura de `scores.interaccao`.
- Atualizar a guard determinística de `deriveEditorialVerdict` se depender de `interaccao` (verificar `editorial-verdict.ts`).

## 6. "Como foi calculado" — popover

`editorial-identity-card.tsx` (linha ~676) e chave i18n correspondente em `overview.global_score.tooltip`:

- PT: "O índice combina envolvimento (60%) e cadência de publicação (40%), comparados com referências de perfis semelhantes."
- EN: "The index combines engagement (60%) and posting rhythm (40%), compared with references from similar profiles."

Remover qualquer menção a "conversa" / "interação" / "comentários" no tooltip do índice global.

## 7. Benchmark — consistência mínima

Não rebuild. Apenas:
- Garantir que `EngagementCardRefined` e o `computeEnvolvimento` no `report-overview-block` lêem `k.engagementBenchmark` (mesma origem `benchmark-input.server.ts → positioning.benchmarkValue`).
- Auditar `format-card.tsx` para não mostrar um benchmark de formato com origem diferente sem label. Se houver dois (per-format vs global), prefixar com "Ref. formato" / "Ref. escalão" no caption.

## 8. Testes

Novos / atualizados (Vitest):

- `src/lib/report/__tests__/block01-sample.test.ts` (novo)
  - exclui pinned de `performancePosts`/`cadencePosts`;
  - fallback quando todos os posts são pinned;
  - `observedPeriodDays` = ceil((newest-oldest)/dia)+1;
  - dropa outlier > 180d.
- `src/lib/report/__tests__/post-aggregates.test.ts` (atualizar)
  - `excludePinned: true` ignora pinned;
  - médias batem com `performancePosts`.
- `src/lib/report/__tests__/snapshot-pinned-window.test.ts` (atualizar)
  - asserts `keyMetrics.engagementRate`, `averageLikes`, `averageComments` calculados a partir do sample sem pinned.
- `src/components/report-redesign/v2/overview/__tests__/score-utils.test.ts` (novo / substituir existente)
  - `computeGlobalScore(env, freq)` com pesos 0.6 / 0.4;
  - não exporta nenhuma referência a `interaccao`.
- `src/components/report-redesign/v2/__tests__/cadence-copy.test.ts` (atualizar)
  - copy não contém "30 dias" quando `cadence.method !== "window_30d"`.

## 9. Validação

- `bunx tsc --noEmit`
- `bunx vitest run`

## 10. Files changed (esperado)

- `src/lib/report/block01-sample.ts` (novo)
- `src/lib/report/snapshot-to-report-data.ts` (chamar sample, alinhar métricas, expor `enriched.block01Sample`)
- `src/lib/report/post-aggregates.ts` (`excludePinned` opt)
- `src/components/report-redesign/v2/overview/score-utils.ts` (remover interação, novos pesos)
- `src/components/report-redesign/v2/report-overview-block.tsx`
- `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`
- `src/i18n/locales/pt/report.json`, `src/i18n/locales/en/report.json`
- testes acima

Não tocados (locked / fora de scope): `report-mock-data.ts`, `/report.example`, normalize/cap do Apify, prompts OpenAI, `block02-diagnostic.ts`, persistência de thumbnails.

## Checkpoint final

- [ ] `buildBlock01Sample` puro + tipado
- [ ] `snapshotToReportData` usa o sample para todas as métricas Bloco 1
- [ ] `computePostAverages` exclui pinned por defeito
- [ ] `computeInteraccao` removido; índice = env 60% + freq 40%
- [ ] Tooltip "Como foi calculado" atualizado (PT + EN)
- [ ] Caption "últimas N publicações · X dias" visível no card
- [ ] Aviso "publicações fixadas excluídas" quando `pinnedPostsExcluded > 0`
- [ ] Nenhuma copy do Bloco 1 menciona "30 dias" fora de `window_30d`
- [ ] Testes novos/atualizados verdes
- [ ] `tsc --noEmit` + `vitest run` limpos
