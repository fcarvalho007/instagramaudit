
# Auditoria DataForSEO · Sinais de Mercado

Auditoria estritamente read-only. Nenhuma chamada a DataForSEO, Apify, OpenAI ou geração de PDF foi feita.

---

## 1. Resumo do estado atual

A camada DataForSEO **existe, está bem construída tecnicamente e tem persistência + cache + custos prontos**, mas **vive em paralelo ao relatório principal**. Hoje:

- O `/api/analyze-public-v1` **não chama** DataForSEO e passa `market_signals: { has_free: false, has_paid: false }` à OpenAI (`src/routes/api/analyze-public-v1.ts:649`).
- Os Sinais de Mercado só são obtidos por uma **segunda chamada client-side** ao `/api/market-signals`, feita pelo componente `ReportMarketSignals` no `useEffect`.
- Esse componente esconde-se silenciosamente (`status: "hidden"`) em qualquer estado que não seja `ready`/`partial` — incluindo `no_keywords`, `timeout`, `error`, `disabled`, `blocked`. O utilizador nunca percebe que existia uma camada de mercado.
- O **PDF não inclui** nenhuma página de Sinais de Mercado.
- A **OpenAI nunca recebe sinais reais** — apenas dois booleans codificados como `false`.
- A **promessa de produto** ("cruzar Instagram com procura de mercado") **não está cumprida** no relatório atual.

---

## 2. O que já está a funcionar

**Fluxo da API isolado (`/api/market-signals`):**
- Kill-switch `DATAFORSEO_ENABLED`, allowlist `DATAFORSEO_ALLOWLIST`, quotas `DATAFORSEO_MAX_QUERIES_FREE` / `..._PAID`.
- Cliente DataForSEO com endpoints separados: `google-trends`, `keyword-ideas`, `serp-organic`.
- Derivação determinística de keywords a partir do snapshot (`src/lib/dataforseo/derive-keywords.ts`).
- Classificação de erros (hard vs soft) e cap por plano (`plan-limits.ts`).

**Persistência + cache (`src/lib/market-signals/cache.ts`):**
- Resultado guardado dentro de `analysis_snapshots.normalized_payload` sob a chave `market_signals_free` (e reservado `market_signals_paid`).
- TTLs documentados:
  - `ready` / `partial` / `no_keywords` → 24h
  - `timeout` / `error` (soft) → 10 min
  - Erros hard (`AUTH_FAILED`, `DISABLED`, `BLOCKED`, `ACCOUNT_NOT_VERIFIED`) → não cacheia
- Cache key efetivo = `snapshotId + plan` (idempotente por snapshot).

**Custos e logging:**
- Cada chamada DataForSEO escreve em `provider_call_logs` com `provider = "dataforseo"`.
- `actual_cost_usd` capturado a partir da resposta da DataForSEO (`provider_cost_source: "provider_reported"`).
- IDs dos `provider_call_logs` ficam guardados no envelope persistido (`provider_call_log_ids[]`).
- Cache hits **não voltam a tocar** em `provider_call_logs` → distinção implícita entre cache e chamada paga.
- Visível no painel admin de custos (`cost-breakdown-panel.tsx`, `report-cost-summary.server.ts`).

**Renderização web (companion):**
- `ReportMarketSignals` em `/analyze/$username` (linha 207) com gráfico Google Trends, keywords mais fortes / dropped, copy pt-PT em `market-signals-copy.ts`.

**Diagnóstico admin:**
- `/api/admin/dataforseo-diagnostics` para verificar conta, quotas e estado.

---

## 3. O que está em falta

### 3.1 Snapshot não inclui sinais durante a geração
- `analyze-public-v1` produz snapshot **sem** chamar `buildMarketSignals`.
- A persistência só acontece se um cliente real bater no `/api/market-signals` depois — ou seja, depende do browser do utilizador.
- Resultado: snapshot servido a PDF/OpenAI **nunca** contém `market_signals_free` na primeira passagem.

### 3.2 OpenAI insights cegos ao mercado
- `prompt.ts` e `openai-insights.server.ts` já têm os campos `market_signals.has_free` / `has_paid` no `InsightsContext`, mas só recebem booleans.
- Em `analyze-public-v1.ts:649` ambos são forçados a `false`.
- Mesmo se fossem `true`, o prompt **não recebe keywords, trends, nem termos**, apenas a flag.
- Logo, os insights de IA não conseguem cruzar IG com procura.

### 3.3 PDF sem página de mercado
- Procura por `market_signals` em `src/lib/pdf/` → zero ocorrências.
- `render.ts` não lê `normalized_payload.market_signals_free`; `report-document.tsx` não tem `MarketSignalsPage`.

### 3.4 UX silenciosa em falhas
- O componente faz `setState({ status: "hidden" })` em todos os erros / `no_keywords` / `timeout`.
- Para o utilizador isto é indistinguível de "esta funcionalidade não existe". Nada explica que houve tentativa, nem que keywords foram experimentadas.

### 3.5 Acoplamento client-only
- A renderização depende do browser executar `useEffect`. SSR, scrapers, partilhas em LinkedIn e screenshots iniciais nunca veem os sinais.

---

## 4. A DataForSEO faz parte da promessa central do relatório hoje?

**Não.** É uma camada lateral, opcional e silenciosa:
- Não atravessa o snapshot.
- Não atravessa o PDF.
- Não atravessa a IA.
- Não aparece na partilha social inicial nem na primeira renderização SSR.
- Pode estar 100% indisponível sem que o utilizador saiba.

---

## 5. Arquitetura recomendada (a aprovar antes de implementar)

Princípio: **DataForSEO passa a ser inline na geração do snapshot**, com fallback gracioso. O cache existente continua a proteger custo.

### Fase 1 — Snapshot-first (essencial)
1. Em `analyze-public-v1`, **após** o snapshot Apify estar normalizado e **antes** de chamar `generateInsights`:
   - Verificar `readCachedSummary(normalized_payload, "free")`. Se válido → usar.
   - Caso contrário, chamar `buildMarketSignals(...)` server-side com kill-switch + allowlist + quota já existentes.
   - Persistir o resultado dentro de `normalized_payload.market_signals_free` antes de gravar o snapshot.
2. Atualizar o `InsightsContext` que vai para a OpenAI:
   - `market_signals.has_free` reflete a realidade.
   - Adicionar campos efetivos: top keywords, trend direction (rising/stable/falling) por keyword, índice médio. **Sem** dump bruto — payload reduzido e auditável.
3. Atualizar `prompt.ts` para instruir a IA a cruzar performance IG com procura de mercado quando `has_free === true`.

### Fase 2 — PDF
4. Em `src/lib/pdf/render.ts` ler `normalized_payload.market_signals_free` (sem chamar DataForSEO).
5. Adicionar `MarketSignalsPage` em `report-document.tsx`, montada entre `AiInsightsPage` e `RecommendationsPage` quando houver dados `ready`/`partial`.
6. Quando ausente: omitir página silenciosamente (já existe precedente com `hasAiInsights`).

### Fase 3 — UX web
7. `ReportMarketSignals` deixa de fazer fetch quando o snapshot já traz `market_signals_free`. Lê direto via prop.
8. Estados `no_keywords` / `timeout` / `error` deixam de ser `hidden` → passam a ser **micro-estados explicados em pt-PT** ("Não foi possível derivar keywords a partir desta bio. Próxima análise tentará novamente.").
9. Estado `disabled` / `blocked` continua oculto (decisão operacional, não falha do utilizador).

### Fase 4 — Cache, versioning e custo
10. Manter chave `market_signals_free` dentro do snapshot (zero migrations).
11. Adicionar `market_signals_version: 1` ao envelope persistido para futura invalidação controlada.
12. Cache hit continua sem tocar `provider_call_logs` → admin já distingue. Adicionar contador "cache hits / fresh calls" no painel de custos (já existe a base em `cost-breakdown-panel.tsx`).

### Ficheiros que serão tocados (Fase 1 + 2, mínimo viável)
- `src/routes/api/analyze-public-v1.ts` — chamar `buildMarketSignals`, persistir, popular `InsightsContext`.
- `src/lib/insights/types.ts` + `src/lib/insights/prompt.ts` + `src/lib/insights/openai-insights.server.ts` — receber sinais reais, não só booleans.
- `src/lib/pdf/render.ts` — ler `market_signals_free` do snapshot.
- `src/lib/pdf/report-document.tsx` — nova `MarketSignalsPage`.
- `src/components/report-market-signals/report-market-signals.tsx` — passar a aceitar dados via prop, parar de esconder erros úteis.
- `src/routes/analyze.$username.tsx` — passar `marketSignals` como prop em vez de só `snapshotId`.

### Ficheiros que **não** serão tocados
- `LOCKED_FILES.md` (todos os locked).
- `/report.example`.
- `src/integrations/supabase/*`.
- Schema da base de dados (zero migrations).
- `src/lib/dataforseo/*` interno (cliente, endpoints, derive-keywords) — já está sólido.

---

## 6. Próximo prompt de implementação recomendado

> **"Implementar Fase 1 — DataForSEO inline no snapshot e nos insights de IA."**
>
> Goal: tornar `market_signals_free` obrigatoriamente persistido em `analysis_snapshots.normalized_payload` durante o `/api/analyze-public-v1`, e fazer com que a OpenAI receba sinais reais (não booleans).
>
> Scope:
> 1. Em `analyze-public-v1`, após normalização do snapshot Apify, tentar `readCachedSummary` → se ausente e DataForSEO ativo + na allowlist + dentro da quota, chamar `buildMarketSignals` e persistir `market_signals_free` dentro de `normalized_payload`.
> 2. Manter cache TTL existente (24h ready/partial, 10min soft errors).
> 3. Estender `InsightsContext.market_signals` com `top_keywords[]`, `trend_summary`, e flags reais.
> 4. Atualizar `prompt.ts` para cruzar performance IG com procura quando `has_free === true`.
> 5. Falhas de DataForSEO **nunca** podem partir o snapshot — soft-fail com log.
>
> Out of scope (próximas fases): PDF, UX do componente, painel admin.
>
> Constraints:
> - Sem nova migration.
> - Sem tocar em locked files nem em `/report.example`.
> - `bunx tsc --noEmit` + `bun run build` verdes.
> - Cache hits não devem aumentar `provider_call_logs`.
>
> Checkpoint:
> - ☐ snapshot novo contém `market_signals_free` quando DataForSEO está ativo
> - ☐ snapshot continua a ser gerado mesmo se DataForSEO falhar
> - ☐ `InsightsContext` recebe keywords/trends reais
> - ☐ prompt instrui IA a cruzar IG × mercado
> - ☐ cache de 24h respeitada (segunda análise não chama DataForSEO)
> - ☐ `provider_call_logs` regista 1 entrada por chamada fresca, 0 em cache
> - ☐ build + typecheck verdes
> - ☐ `/report.example` intacto
> - ☐ locked files intactos
