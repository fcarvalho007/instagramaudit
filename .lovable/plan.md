## Auditoria — cálculo de cadência / "posts in X days"

### Conclusão geral
O fix aplicado a `@robs.cortez` **resolve o caso reportado** ("12 publicações em 1111 dias"). O pipeline está limpo: `is_pinned` é normalizado, propagado e excluído de todas as séries temporais. Faltam, contudo, **três defesas adicionais** antes de considerar isto "robusto para uso público".

---

### Findings (numerados conforme as 10 perguntas)

1. **`is_pinned` no payload normalizado** — Sim, fiável. `normalize.ts:567` faz `Boolean(raw.isPinned ?? raw.is_pinned ?? false)`. O schema (`report-snapshots/schema.ts:45`) aceita nullable. Sempre presente como boolean.

2. **Quando Apify não devolve `is_pinned`** — Cai para `false`. Logo, posts pinned antigos de actors antigos/alternativos podem **passar despercebidos**. Este é o risco real residual.

3. **Pinned excluídos de todos os cálculos temporais?** — Sim. `snapshot-to-report-data.ts:1077` filtra `cadencePostsRaw = posts.filter(p => !p.is_pinned)` e alimenta `buildTemporalSeries`, `buildPostingHeatmap`, `buildBestDays`, `computeCadence`. Existe fallback `if (cadencePosts.length === 0)` (usa todos), mas o módulo `cadence.ts:83` volta a filtrar pinned e devolve `insufficient` — não há leak de janela.

4. **Pinned em secções não-temporais?** — Sim, intencional: `topPosts`, `hashtags`, `themes`, `keywords` veem o array completo. ✅ Correcto conceptualmente, **mas não marcado visualmente** — um pinned de 2023 com muito engagement aparece como "Top post" sem etiqueta.

5. **Pinned distorce top/worst posts?** — Sim, parcialmente. `buildTopPosts` ordena por `engagement_pct` desc sem distinguir pinned. Posts pinned acumulam interacções ao longo do tempo (efeito da própria fixação), logo enviesam para cima.

6. **UI rotula como "amostra recente"?** — Sim. `snapshot-to-report-data.ts:1205-1220` produz `windowLabel = "últimos N dias"` ou `"amostra de N dias"` e `kpiSubtitle = "N publicações nos últimos N dias"`. Quando `cadence.method === "insufficient"`, copy neutro ("amostra recente insuficiente"). ✅

7. **Distingue estados?** — Parcialmente. O módulo `cadence.ts` distingue `window_30d | window_90d | sample_span | insufficient`. **Falta**: `stale_data` (já existe em `editorial-verdict-warnings` mas baseado em `days_since_last_post`, não propaga para a cadência) e **falta uma flag explícita `pinned_excluded`** quando há pinned filtrados.

8. **Evita "12 posts in 1111 days"?** — Sim. A cascata 30d→90d→sample_span (≤180d) torna o cenário 1111 dias **impossível** de emergir: o ramo `sample_span` rejeita spans > 180 dias.

9. **Defesa contra outliers sem `is_pinned`** — **Não existe.** Se um actor devolver pinned com flag em falta, o post passa para a cascata. No 30d/90d isto é inócuo (filtrado por janela). No `sample_span` (≤180d, ≥2 posts) um outlier antigo pode entrar — mas o cap de 180d limita o estrago a um span razoável. Recomenda-se mesmo assim defesa preventiva.

10. **Cobertura de testes** — `cadence.test.ts` (12 testes) e `snapshot-pinned-window.test.ts` (2 testes). Falta: outlier sem pin, marcação visível de pinned em top posts, defesa quando 1 post recente + 1 muito antigo entram no `sample_span`.

---

### Mudanças propostas (em 3 camadas)

#### A. `src/lib/report/cadence.ts` — defesa por outlier e flags
- Adicionar detecção de outlier por data **independente de `is_pinned`**:
  - Depois de filtrar pinned/inválidos, calcular mediana e MAD dos timestamps.
  - Excluir posts > 180 dias mais antigos que a mediana do cluster recente (top-10).
- Estender `CadenceResult`:
  ```ts
  reliability: "high" | "medium" | "low";
  warnings: Array<"pinned_excluded" | "low_sample" | "date_outlier_detected" | "stale_data">;
  excludedPinned: number;
  excludedOutliers: number;
  ```
- Regras de `reliability`:
  - `high`: `window_30d` com ≥5 posts e nenhum warning.
  - `medium`: `window_90d`, ou `window_30d` com 3–4 posts, ou 1 warning.
  - `low`: `sample_span`, ≥2 warnings, ou `insufficient`.

#### B. `src/lib/report/snapshot-to-report-data.ts`
- Propagar `cadence.reliability`, `cadence.warnings`, contadores excluídos para `ReportEnriched` (campo novo `cadenceMeta`).
- `buildTopPosts`: anexar `isPinned: boolean` ao output (tipo casted, igual ao `thumbnailUrl` actual), para que a UI possa marcar quando o unlock chegar.
- Reaproveitar a defesa de outlier do módulo `cadence.ts` também para `cadencePosts` antes de `buildTemporalSeries / buildPostingHeatmap / buildBestDays` — assim a heatmap/best-days não fica enviesada por 1 post solto de há 5 meses quando o cluster vive nas últimas 4 semanas.

#### C. `editorial-verdict.ts` + `EditorialIdentityCard`
- Já existe `cadenceSufficient`; adicionar leitura de `cadence.reliability`. Quando `reliability === "low"`:
  - Forçar fallback / downgrade para `confidence: "low"` no resolver.
  - Bloquear claims fortes sobre ritmo no parágrafo (já existe `cadence_contradiction`; adicionar regra "afirmação forte sobre cadência + reliability low → contradição").
- Em copy pública, padronizar para **"ritmo observado nas últimas N publicações"** em vez de "nos últimos N dias" quando `method === "sample_span"`.

#### D. Copy/i18n (`report.json` pt + en)
- Acrescentar chaves:
  - `cadence.reliability.low_hint`: "Leitura provisória — amostra recente curta."
  - `cadence.pinned_excluded_hint`: "N publicações fixadas foram excluídas do cálculo de ritmo."
  - `cadence.outlier_detected_hint`: "Publicações antigas foram excluídas do cálculo de ritmo."

---

### Testes a adicionar

`src/lib/report/__tests__/cadence-outliers.test.ts` (novo):
1. 2 pinned 2023 + 10 recentes → `excludedPinned: 2`, `reliability: "high"`, sem warnings de outlier.
2. 1 post de há 200 dias + 0 recentes → `insufficient`, `reliability: "low"`.
3. 1 post de há 200 dias (sem `is_pinned`) + 8 nos últimos 14 dias → outlier detectado, `excludedOutliers: 1`, `reliability` ≥ `medium`.
4. 2 posts apenas, ambos há 5 e 40 dias → `sample_span`, `reliability: "low"`, warning `low_sample`.
5. Posts sem datas → `insufficient`, sem crash.
6. Pinned com `is_pinned: undefined` mas datas > 1 ano vs cluster recente → defesa por outlier dispara.

`src/lib/report/__tests__/snapshot-pinned-toppost.test.ts` (novo):
7. 2 pinned com muito engagement + 5 recentes → `topPosts[0].isPinned === true` quando o pinned ganha.
8. Mesmo cenário → `temporalSeries` e `bestDays` não contêm dias dos pinned.

`src/lib/report/__tests__/editorial-verdict.test.ts` (estender):
9. `cadence.reliability === "low"` + IA afirma "ritmo consistente" → contradição → fallback.

---

### Risk assessment

- **Risco actual sem este plano**: BAIXO para perfis tipo `@robs.cortez` (resolvido). MÉDIO se um actor Apify alternativo devolver pinned sem flag — defesa por outlier mitiga.
- **Risco de regressão da mudança proposta**: BAIXO. As alterações são aditivas (novos campos), o algoritmo principal (cascata 30d/90d/sample_span) **não muda**. Apenas adiciona-se um pré-filtro de outlier e metadados.
- **Custo de provider**: ZERO. Tudo pós-processamento, sem nova chamada Apify nem OpenAI.

---

### Checkpoint
- ☐ Aprovar a divisão em 3 camadas (cadence.ts / snapshot-to-report-data.ts / editorial-verdict).
- ☐ Confirmar que o campo `isPinned` em `topPosts` pode ser emitido já (mesmo antes do unlock visual em `report-mock-data.ts`).
- ☐ Confirmar copy "ritmo observado nas últimas N publicações" para o ramo `sample_span`.
- ☐ Confirmar threshold de outlier (proposta: > 180 dias mais antigo que a mediana do cluster top-10).
