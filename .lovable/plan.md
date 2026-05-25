## Auditoria — cadência errada em `robs.cortez`

### Causa raiz (1 linha)

`ReportPayloadV1Schema` em `src/lib/report-snapshots/schema.ts` **não inclui `is_pinned`** no `PostSchema`. Quando o Zod valida o payload antes de gravar em `report_snapshots`, a flag `is_pinned` é silenciosamente removida. O filtro de pinned em `snapshot-to-report-data.ts:968` torna-se um no-op para reports históricos, e os 2 posts fixos de 2023 voltam a inflar a janela para 1111 dias.

### Evidência

Snapshot `cdec97d1-…` (robs.cortez, persistido 16:00 hoje):

| Camada | `posts[*].is_pinned` presente? | Cadência calculada |
|---|---|---|
| `analysis_snapshots.normalized_payload.posts` | ✅ `true`/`false` | 10 posts / 13 dias ≈ **5,4/sem** ✔ |
| `report_snapshots.report_payload_jsonb.posts` | ❌ `null` em todos | 12 posts / 1111 dias ≈ **0,08/sem** ✘ |

A página `/analyze/$username` (lê de `analysis_snapshots`) mostra cadência correta. Qualquer leitor que use `report_snapshots` (link partilhado, email summary, dashboard pessoal, PDF) mostra "12 publicações em 1111 dias".

Bónus: `report_payload_jsonb.content_summary.estimated_posts_per_week = 0.1` vem já errado do upstream (calculado em `content_summary` antes do filtro de pinned). A reescrita em `snapshot-to-report-data.ts:1012` corrige isto, mas só funciona quando `is_pinned` chega ao adapter — daí o bug ficar invisível para `/analyze` e visível para `/report`.

### Resumo das respostas

1. **Onde:** `src/lib/report/snapshot-to-report-data.ts:968-1016`. Override de `postingFrequencyWeekly` em `:1012-1015` a partir de `cadencePosts.length / windowDays * 7`.
2. **Fonte de dados:** janela entre `min` e `max` `taken_at_iso` da amostra retornada pelo Apify, **excluindo pinned**. Não usa janelas fixas 30/60/90 dias nem `profile.posts_count`.
3. **Ordenação:** `temporalSeries`/`heatmap` ordenam internamente; o cálculo da janela é min/max, não depende de ordem.
4. **Pinned a distorcer:** sim — para reports gravados em `report_snapshots` (causa do bug). Não para `/analyze` direto.
5. **Timestamps:** `taken_at_iso` (string ISO) parseado com `new Date(...).getTime()` em ms. Sem mistura s/ms.
6. **Amostra suficiente:** 12 posts (`apify/instagram-scraper`), inclui ~10 recentes + 2 pinned antigos. Suficiente para janela 12-15 dias.
7. **Fresh vs stale:** UI atual lê dependendo da rota. `/analyze/$username` = `analysis_snapshots` (correto). `/report/$id` partilhado/email = `report_snapshots` (estragado).
8. **Cache velha?:** não — só existe 1 snapshot para este handle, criado hoje 15:53/16:00. Bug é estrutural, não de cache.
9. **Campos relevantes:** `posts[].taken_at_iso`, `posts[].is_pinned`. Cálculo final em `snapshot-to-report-data.ts` (`cadencePosts`, `windowDays`, `keyMetrics.postingFrequencyWeekly`).

### Plano de correção (cirúrgico)

**Edit 1 — `src/lib/report-snapshots/schema.ts`**
Adicionar `is_pinned: z.boolean().nullable().optional()` ao `PostSchema`. Single line. Sem migration, sem novo campo na base de dados.

**Edit 2 — backfill leve (opcional, sem code change na primeira volta)**
O snapshot `cdec97d1-…` ficou gravado sem `is_pinned`. Opções:
- (a) **não fazer nada** — quando o utilizador voltar a desbloquear ou o pipeline reescrever o report (re-publish/re-analyze), o novo schema preserva o flag. Custo zero.
- (b) **regenerar 1 snapshot** chamando `persistReportSnapshotInternal(reportRequestId, source)` para o request id do robs.cortez. Custo $0 (não bate no Apify, só relê `analysis_snapshots`).

Recomendo (b) só para o robs.cortez (1 row), para que a tua próxima visita ao report partilhado mostre já o número certo. Faço isto via `psql` num script one-off, sem mutar mais nada.

**Edit 3 — defesa em profundidade em `snapshot-to-report-data.ts`**
Acrescentar fallback: se `windowDays > 365` E `cadencePosts.length >= 3`, descartar os outliers mais antigos (posts isolados a > 90 dias do segundo-mais-recente) e recalcular. Isto protege contra pinned não marcados, posts arquivados, ou perfis que voltam após hiato. Comentado claramente como guarda secundária.

**Edit 4 — teste de regressão**
Novo teste `src/lib/report-snapshots/__tests__/schema-pinned.test.ts`:
- payload com 2 posts `is_pinned: true` antigos + 10 recentes
- `ReportPayloadV1Schema.parse(payload)` mantém `is_pinned: true` em ambos
- `snapshotToReportData` aplicado ao parsed payload devolve `windowDays <= 20`, `postingFrequencyWeekly >= 3`

### Fora de scopo (não tocar nesta volta)

- Copy do card "Identidade Editorial" — só voltar a olhar depois do número estar certo.
- `content_summary.estimated_posts_per_week` upstream — fica a ser sobrescrito pelo adapter, não vale a pena tocar agora.
- Scoring / benchmark engagement — não depende de `postingFrequencyWeekly`.
- UI/copy/locales — sem mudanças.

### Checkpoint

- ☐ `PostSchema` aceita e preserva `is_pinned`
- ☐ Snapshot do robs.cortez regenerado (opcional, mas recomendado)
- ☐ Novo teste verde
- ☐ `bunx vitest run` global verde (sem regressão nos 90 testes existentes)
- ☐ Confirmação por query SQL: `report_payload_jsonb->'posts'->0->>'is_pinned'` deixa de ser `null` para snapshots novos
