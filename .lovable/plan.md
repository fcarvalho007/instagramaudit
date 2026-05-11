## Auditoria read-only — fluxo público de análise InstaBench

> Nenhum ficheiro alterado. Resultado de inspeção a `src/routes/api/analyze-public-v1.ts`, `src/lib/analysis/*`, `src/lib/enrichment/*`, `src/lib/security/*`, `src/lib/unlock.server.ts`, `src/components/report-redesign/v2/*` e `report-shell-v2.tsx`.

---

### 1. Diagrama do fluxo (texto)

```text
[A] Utilizador escreve handle no input público
     │
     ▼
[B] Browser navega para /analyze/$username  (route SSR-disabled)
     │   src/routes/analyze.$username.tsx
     │   - flip body[data-theme=light]
     │   - mount AnalyzePage
     ▼
[C] fetchPublicAnalysis(username, competitors[]) → POST /api/analyze-public-v1
     │   src/lib/analysis/client.ts
     │   payload: { instagram_username, competitor_usernames[] (≤2) }
     ▼
[D] Server route /api/analyze-public-v1  (src/routes/api/analyze-public-v1.ts)
     │
     ├─ 0. Zod valida username (regex [A-Za-z0-9._]{1,30})
     ├─ 1. cacheKey = "v1:<primary>|<sorted_competitors>"
     ├─ 2. lookupSnapshot(cacheKey) em analysis_snapshots
     │     ├─ HIT fresh (≤15 dias)         → buildCachedResponse "cache" + logEvent
     │     ├─ HIT stale (16-30d? na prática =15d) → usado como fallback defensivo
     │     └─ MISS                          → continua
     ├─ 3. executionMode == "cache_only"   → serve stale ou CACHE_ONLY_NO_DATA
     ├─ 4. APIFY_TESTING_MODE → isAllowed(primary) ? continua : PROFILE_NOT_ALLOWED
     ├─ 5. !APIFY_ENABLED                  → stale ou PROVIDER_DISABLED
     ├─ 6. assertApifyDailyBudgetAvailable → stale ou BUDGET_EXCEEDED
     ├─ 7. assertWithinPublicRateLimit (IP+handle 24h fresh+success) → RATE_LIMITED
     │
     ├─ 8. APIFY: runActorWithMetadata (apify/instagram-scraper)
     │     ├─ chamada por handle, em paralelo (1 primary + ≤2 competitors)
     │     ├─ 12 posts por handle, profile + latestPosts num único actor run
     │     ├─ provider_call_logs: 1 linha por handle (status, duration, cost)
     │     └─ tratamento: 404 → PROFILE_NOT_FOUND, is_private → PROFILE_PRIVATE
     │
     ├─ 9. Normalize + computeContentSummary + benchmark positioning (in-memory)
     ├─ 10. prefetchThumbnailsAsBase64 (HTTP a CDN do IG, sem custo de provider)
     ├─ 11. storeSnapshot → analysis_snapshots (BASE payload, sem AI)
     ├─ 12. recordAnalysisEvent → analysis_events (outcome=success)
     ├─ 13. INSERT enrichment_jobs (5 jobs: dataforseo, insights_v1, insights_v2,
     │       visual_cover, caption_semantic) com status=pending
     ├─ 14. fire-and-forget POST /api/public/enrich-snapshot (Bearer INTERNAL_API_TOKEN)
     ├─ 15. (se COMMENT_SCRAPER_ENABLED) INSERT comment_enrichment_jobs +
     │       fire-and-forget POST /api/public/enrich-comments
     │
     └─ 16. Devolve PublicAnalysisSuccess imediatamente (Apify + benchmark prontos;
            insights AI ainda em pending)
     ▼
[E] /analyze/$username re-renderiza com dados Apify
     │   ReportShellV2 com lockBoundary="engagement" se gated
     │   - Block 01 Visão geral (free part: EditorialIdentityCard)
     │   - ReportLockGate envolve do Engagement card até Block 06
     │     (Engagement, Diagnóstico, Performance, Conteúdo, Procura, Comparação)
     │
[F] Polling do snapshot (analysis-snapshot.by-id.$snapshotId.ts) preenche
    insights AI quando enrichment-jobs concluem (re-render gradual)
     ▼
[G] Utilizador clica CTA → UnlockModal abre
     ▼
[H] Submete email/nome → POST /api/public/report-unlock
     │   processReportUnlock (src/lib/unlock.server.ts)
     │   - upsert lead por email_normalized
     │   - upsert report_request (lead_id, analysis_snapshot_id)
     │   - ensureReportSnapshotForRequest → INSERT report_snapshots (cópia imutável
     │     do analysis_snapshot.normalized_payload, expires_at +15d)
     │   - maybeAdvanceLeadStatus → "relatorio_visto"
     │   - se primeiro unlock: sendLeadMagnetSequence (welcome-beta + report-summary)
     │   - syncLeadToBrevo (awaited, ~300-600ms)
     │   - product_events: report_unlock_*
     │   ⚠ NÃO chama Apify, OpenAI nem DataForSEO
     ▼
[I] Frontend define unlocked=true → ReportLockGate transparente, conteúdo visível
```

---

### 2. Tabela de chamadas a providers externos

| Provider | Ficheiro / função | Trigger | Antes/Depois unlock | Anónimos? | Kill-switch | Bloqueado por testing/allowlist? | Cacheado? | Custo estimado |
|---|---|---|---|---|---|---|---|---|
| **Apify** `instagram-scraper` | `lib/analysis/apify-client.ts` ← `analyze-public-v1.ts` step 8 | Cache miss + APIFY_ENABLED + allowlist + budget OK + rate-limit OK | **Antes** do unlock | Sim | `APIFY_ENABLED=true` | Sim, `APIFY_TESTING_MODE` + `APIFY_ALLOWLIST` | Sim, `analysis_snapshots` 15d | ~$0.05–0.15 por handle |
| **DataForSEO** Trends | `lib/dataforseo/market-signals.ts` ← `enrichment_jobs[type=dataforseo]` | Após snapshot base, async via `/api/public/enrich-snapshot` | **Antes** do unlock (async) | Sim | `DATAFORSEO_ENABLED=true` | Sim, `DATAFORSEO_ALLOWLIST` | Sim, `market_signals_free` no payload | ~$0.0005/keyword (free tier) |
| **OpenAI** insights v1 | `lib/insights/openai-insights.server.ts` `generateInsights()` | enrichment_jobs[type=insights_v1] | **Antes** do unlock (async) | Sim | `OPENAI_ENABLED=true` | Sim, `OPENAI_TESTING_MODE` + `OPENAI_ALLOWLIST` | Output guardado em `analysis_snapshots.normalized_payload.ai_insights_v1` | ~$0.01–0.05 (gpt-5-mini) |
| **OpenAI** insights v2 (hero, sections) | `generateInsightsV2()` | enrichment_jobs[type=insights_v2] | **Antes** do unlock (async) | Sim | mesmo | mesmo | `ai_insights_v2` no payload | ~$0.02–0.08 |
| **OpenAI** visual_cover | `lib/report/visual-cover-analysis.server.ts` | enrichment_jobs[type=visual_cover] | **Antes** do unlock (async) | Sim | mesmo | mesmo | `visual_cover` no payload | ~$0.05–0.15 (multimodal) |
| **OpenAI** caption_semantic | `lib/report/caption-semantic-analysis.server.ts` | enrichment_jobs[type=caption_semantic] | **Antes** do unlock (async) | Sim | mesmo | mesmo | `caption_semantic` no payload | ~$0.01–0.03 |
| **Apify** comment scraper | `enrich-comments.ts` | `COMMENT_SCRAPER_ENABLED=true` + tem URLs | **Antes** do unlock (async) | Sim | `COMMENT_SCRAPER_ENABLED` | — | `comment_intelligence` no payload | ~$0.05/run |
| **Brevo** upsert contact | `lib/brevo/sync.server.ts` ← `unlock.server.ts` | Após processReportUnlock (awaited) | **Depois** do unlock | Não (precisa email) | — | — | n/a | sem custo marginal (incluído no plano) |
| **Brevo** transactional emails | `lib/email/lead-magnet-sequence.server.ts` | Após primeiro unlock (fire-and-forget) | **Depois** do unlock | Não | — | dedup por `product_events[report_request_id]` | n/a | sem custo marginal |
| **Resend** (alternativa) | `RESEND_API_KEY` no env, mas `BREVO_API_KEY` é o canal ativo | inativo no fluxo público actual | — | — | — | — | — | — |
| **PDF generation** (PDFShift) | `routes/api/public/public-report-pdf.ts` / `generate-report-pdf.ts` | Pedido manual via UI ou `request-full-report` | **Depois** do unlock | Não | `PDFSHIFT_API_KEY` presente | — | `pdf_storage_path` em `report_requests` | ~$0.005/página |

---

### 3. Cache — comportamento

- **Tabela:** `analysis_snapshots`
- **Cache key:** `v1:<primary_lowercased>|<comma_sorted_competitors_lowercased>` (`buildCacheKey`)
- **TTL fresco:** 15 dias (`CACHE_TTL_DAYS` em `src/lib/report/retention.ts`)
- **Janela stale:** mesmos 15 dias (TTL == retenção; serve como fallback defensivo se Apify falhar, kill-switch, budget excedido ou cache_only mode)
- **Cache hit:** devolve `buildCachedResponse(snapshot, "cache")` em <50ms; recomputa benchmark_positioning contra dataset corrente; logEvent com `data_source=cache`. **Não chama nenhum provider.**
- **Cache miss:** entra no pipeline completo (Apify + jobs assíncronos)
- **Stale:** servido em 4 cenários: (a) `cache_only` mode, (b) `!APIFY_ENABLED`, (c) `BudgetExceededError`, (d) qualquer erro de Apify após tentativa
- **Bypass:** `?refresh=1` exige `Authorization: Bearer ${INTERNAL_API_TOKEN}` — público não consegue forçar refresh
- **Persistência incremental:** snapshot BASE persiste **antes** de OpenAI; enrichment jobs fazem `patchSnapshotPayload` à medida que correm

---

### 4. OpenAI — uso

- **Onde corre:** `src/lib/enrichment/run-enrichment.server.ts` chama 4 funções OpenAI:
  1. `generateInsights` (insights_v1) — texto editorial por secção
  2. `generateInsightsV2` (insights_v2) — hero text + sections (formats, heatmap, daysOfWeek, language, marketSignals, benchmark, evolutionChart) usados em `renderInsight()`
  3. `generateVisualCoverAnalysis` (visual_cover) — análise multimodal das thumbnails
  4. `generateCaptionSemanticAnalysis` (caption_semantic) — análise semântica das captions
- **Quando:** **ANTES** do unlock, **assincronamente** após Apify devolver. Polling do `analysis-snapshot.by-id` preenche os campos no front à medida que enriquecem.
- **Block 1 (Visão geral):** usa `enriched.aiInsightsV2?.sections.hero?.text` no `EditorialIdentityCard` — depende de OpenAI v2
- **Block 2 (Diagnóstico):** ver `ReportDiagnosticBlock` — também consome insights_v2 e v1 (texto editorial)
- **Persistência:** outputs são merged em `analysis_snapshots.normalized_payload` via `patchSnapshotPayload`. Quando o utilizador faz unlock, `ensureReportSnapshotForRequest` copia o payload inteiro (incluindo AI) para `report_snapshots.report_payload_jsonb` (imutável, 15 dias)
- **Se OpenAI desligado:** jobs marcam `status=skipped`, payload mantém `ai_insights_*` ausentes. UI renderiza fallbacks textuais não-AI (componentes `renderInsight` retornam null/placeholder).
- **Gates:** `OPENAI_ENABLED=true` (kill-switch) + `OPENAI_TESTING_MODE` + `OPENAI_ALLOWLIST`. **Mesma lógica restritiva que Apify** — handles fora do allowlist em modo testing não recebem insights AI.

---

### 5. Mapa de blocos do report público

Configuração em `src/components/report-redesign/v2/block-config.ts` (6 blocos). Visibilidade controlada por `VariantFeatures` (free vs full).

| # | Bloco | Componente | Fonte de dados | Usa AI? | Antes do unlock | Depois do unlock |
|---|---|---|---|---|---|---|
| 01 | Visão geral | `ReportOverviewBlock` (modes free/locked/all) | Apify + benchmark + AI hero | Sim (hero text v2) | **Sim** (free mode: só `EditorialIdentityCard`) | **Sim** (mode=all: + Engagement, Frequency, Format, PostComparison) |
| 02 | Diagnóstico editorial | `ReportDiagnosticBlock` | Apify + AI insights v1+v2 | Sim | Não (atrás do gate) | Sim |
| 03 | Desempenho | `ReportTemporalChart`, `ReportPostingHeatmap`, `ReportBestDays` | Apify (posts + timestamps) + AI | Sim (insights heatmap, daysOfWeek) | Não | Sim (`blockPerformance===full`) |
| 04 | Conteúdo | `ReportEnrichedTopLinks`, `ReportFormatBreakdown`, `ReportHashtagsKeywords`, `ReportEnrichedMentions` | Apify + caption_semantic AI | Sim (insights formats, language) | Não | Sim |
| 05 | Procura | `ReportMarketSignalsSection` | DataForSEO Trends | Sim (insight marketSignals) | Não | Sim |
| 06 | Comparação | `ReportBenchmarkGauge`, `ReportCompetitors` | benchmark_references + Apify competitors | Sim (insight benchmark) | Não | Sim |

**Modelo de gate:** `lockBoundary="engagement"`. Tudo do EngagementCard em diante (dentro de Block 01) **e** Blocks 02–06 vivem dentro de **um único `ReportLockGate`** com overlay frosted + CTA "Desbloquear". Antes do unlock o utilizador vê apenas a `EditorialIdentityCard` (identidade + scores agregados, sem detalhe acionável).

---

### 6. Diagnóstico do "Resumo executivo"

**Não existe um componente "Resumo executivo" no codebase actual.** Procura por `Resumo executivo`, `executive`, `exec_summary` em `src/` retorna 0 ocorrências.

O que existe **acima do gate** e que poderia ser percebido como resumo:
- **`EditorialIdentityCard`** (Block 01 free part): identidade do perfil + 3 scores agregados (envolvimento, frequência, interacção) + texto AI hero opcional (`enriched.aiInsightsV2.sections.hero.text`)
- **`ReportPositioningBanner`** (header): posicionamento vs benchmark
- **`ReportHeroV2`**: hero do relatório com handle, avatar, métricas chave

Se o pedido era auditar o `EditorialIdentityCard` como "resumo executivo":
- **Repete** parcialmente: scores derivam de `engagementRate`, `postingFrequencyWeekly`, `avgComments` que aparecem **outra vez** dentro do gate em `EngagementCardRefined`, `FrequencyCard`, `FormatCard` e `KPI grid`
- **Adiciona valor único** se o `aiInsightsV2.sections.hero.text` estiver presente (1-2 frases editoriais sobre o perfil) — caso contrário é puramente numérico e duplica o KPI grid
- **Recomendação:** substituir os 3 scores numéricos da `EditorialIdentityCard` por uma **observação editorial AI curta (≤3 frases)** + 1 indicador-âncora (engagement vs benchmark). Elimina duplicação e justifica o gate.

---

### 7. Riscos antes de lançamento público

| Risco | Severidade | Estado |
|---|---|---|
| Utilizador anónimo dispara Apify + 4× OpenAI + DataForSEO numa só análise pública | **Alto** custo potencial | Mitigado por allowlists + `APIFY_HARD_CAP_USD=10/dia` + rate-limit IP/handle 24h. **Mas OpenAI não tem rate-limit nem hard-cap independente** — só allowlist. |
| Custo OpenAI sem hard-cap diário | Médio | `OPENAI_DAILY_CAP_USD` existe nos secrets mas **não vi gate equivalente a `assertApifyDailyBudgetAvailable` para OpenAI** no fluxo. A verificar. |
| 1 análise = até 7 chamadas a providers pagos (1 Apify primary + 2 Apify competitors + 1 DFS + 4 OpenAI + 1 comment scraper) | Alto custo unitário | Aceitável com cache 15d agressivo (HIT evita tudo); 1ª análise ainda é cara |
| Stale fallback serve dados até 15d quando Apify falha — utilizador vê "data_source=stale" sem aviso visível claro | Baixo UX | OK para MVP; verificar se `cache-status-badge` é visível |
| `APIFY_TESTING_MODE` ainda ON em produção bloqueia todos os perfis fora do allowlist com `PROFILE_NOT_ALLOWED` | Bloqueador para lançamento | **Já implementado código de proteção**, falta confirmar flip no env (turno anterior) |
| Insights AI são gerados **antes** do unlock — utilizador anónimo recebe valor pago sem capturar email | Médio business | Feature hero text aparece no Block 01 free; restante AI fica atrás do gate, OK |
| `processReportUnlock` não tem rate-limit por IP/email | Médio abuse | Comentado no código: "rate limiting is intentionally deferred" |
| Comment scraper `COMMENT_SCRAPER_ENABLED` desligado por default | Sem risco | OK |
| Erros de Apify ainda incluem `provider_message`, `details`, `run_id` em alguns paths (linhas 1115–1135 do endpoint) | Baixo info-leak | `sanitizeExtra` filtra apenas `retry_after_seconds`. **Verificar se ainda há paths que retornam `details: err.message` ao público** |

---

### 8. Próximo prompt de implementação recomendado

> **Goal:** Adicionar hard-cap diário OpenAI + verificar sanitização final de erros + diagnosticar duplicação `EditorialIdentityCard` vs KPI grid.
>
> **Context:** A auditoria mostrou que (a) OpenAI tem `OPENAI_DAILY_CAP_USD` no env mas não tem gate equivalente ao `assertApifyDailyBudgetAvailable`, (b) alguns paths de erro ainda devolvem `details: err.message` ao público, (c) `EditorialIdentityCard` mostra 3 scores numéricos que duplicam o KPI grid imediatamente abaixo do gate.
>
> **Plan first**, then implement:
> 1. Criar `src/lib/security/openai-budget.server.ts` espelhando `apify-budget.server.ts` (soma `provider_call_logs.estimated_cost_usd` provider=openai, hard-cap default $5/dia).
> 2. Inserir gate `assertOpenAiDailyBudgetAvailable()` no início de `runInsightsV1`, `runInsightsV2`, `runVisualCover`, `runCaptionSemantic` em `run-enrichment.server.ts`. Em caso de excesso: marcar job `status=skipped`, payload sem AI, sem erro ao utilizador.
> 3. Auditar todos os `failure(...)` em `analyze-public-v1.ts` (linhas 1084–1135). Remover `details`, `provider_message`, `provider_status`, `run_id` do `extra` — manter só em `console.error` e `provider_call_logs.error_excerpt`.
> 4. Plano (não implementar) para substituir os 3 scores numéricos do `EditorialIdentityCard` por 1 observação editorial AI curta + posicionamento vs benchmark (eliminar duplicação com KPI grid).
> 5. Validação: `bunx tsc --noEmit`, `bunx vitest run`, testes manuais a (a) excesso de budget OpenAI, (b) error response sem provider_message, (c) UI free com novo Editorial Card.
>
> **Constraints:** read-only no `/report.example`; não tocar Apify; não regenerar relatórios; não enviar emails.