
# Auditoria do pipeline + plano de integração DataForSEO

## 1. Estado atual do pipeline (read-only audit)

### Fluxo Apify confirmado
- **Endpoint único**: `POST /api/analyze-public-v1` (`src/routes/api/analyze-public-v1.ts`).
- **Actor**: `apify/instagram-scraper` em modo `details` com `latestPosts[]` embutido. 1 chamada por handle (primário + até 2 concorrentes), em paralelo via `allSettled`. Limite `POSTS_LIMIT=12`, `maxItems=1`, `maxTotalChargeUsd=0.10`.
- **Camadas de proteção** (`src/lib/security/apify-allowlist.ts`): `APIFY_ENABLED` (kill-switch), `APIFY_TESTING_MODE` + `APIFY_ALLOWLIST`, `?refresh=1` protegido por `INTERNAL_API_TOKEN`.
- **Cache** (`src/lib/analysis/cache.ts`): TTL 24h, fallback stale 7d, chave determinística `v1:primary|c1,c2`.
- **Persistência**: `analysis_snapshots.normalized_payload` (jsonb) com 5 chaves: `profile`, `content_summary`, `format_stats`, `posts`, `competitors`.
- **Logging**: `analysis_events` + `provider_call_logs` + `social_profiles` agregadas via `record_analysis_event` RPC. `usage_alerts` para deteção inline.
- **Custo Apify observado**: ~$0.011 por perfil IG com 12 posts (estimativa heurística em `src/lib/analysis/cost.ts`).

### Adapter e relatório
- `src/lib/report/snapshot-to-report-data.ts` converte snapshot → `ReportData` (contrato dos componentes locked em `/src/components/report/*`).
- Pré-visualização admin: `admin.report-preview.snapshot.$snapshotId.tsx`.
- `/report/example` é mockup editorial **locked** — nunca tocar.

### Confirmação: nenhum código DataForSEO existe ainda
`rg -i dataforseo src/` retorna vazio. Integração 100% greenfield.

---

## 2. Recomendação de arquitetura

DataForSEO entra como **camada paralela e independente** ("market context"), nunca como substituto do Apify. Princípios:

1. **Isolamento total**: novo módulo `src/lib/market-context/`, novo endpoint `/api/market-context-v1`, nova tabela `market_context_snapshots`. O fluxo Apify continua intocado e o relatório degrada graciosamente quando market context falha.
2. **Camada opcional por tier**: free dispara DataForSEO apenas se `DATAFORSEO_ENABLED=true` e o tier o autoriza. Se desligado, o relatório renderiza sem secção de mercado (sem erro visível).
3. **Mesmas garantias do Apify**: kill-switch `DATAFORSEO_ENABLED`, allowlist temporária `DATAFORSEO_ALLOWLIST`, cache dedicado (TTL longo: SERP é mais estável que IG), logging em `provider_call_logs` (provider='dataforseo'), eventos em `analysis_events` com novo `data_source` ou via metadata.
4. **Standard Queue por defeito**: 3.3× mais barato que Live, latência aceitável (≤ minutos) porque o pipeline já é assíncrono via `runReportPipeline`. Live mode reservado para casos onde o utilizador espera em ecrã (raro).
5. **Tabela separada**, não jsonb dentro de `analysis_snapshots`: SERP tem ciclo de vida diferente (TTL maior, refresca por keyword, não por handle), e queremos poder evoluir o schema sem invalidar snapshots Apify.

---

## 3. Tabela de custo por tier

Custos por relatório, assumindo Standard Queue por defeito.

| Tier | Apify (1 perfil) | Apify (concorrentes) | DataForSEO SERP | Total estimado | Margem-alvo |
|---|---|---|---|---|---|
| **Free** | $0.011 | 0 | 1 query × $0.0006 = **$0.0006** | **~$0.012** | (sem receita) |
| **Paid one-off** | $0.011 | 2 × $0.011 = $0.022 | 5 queries × $0.0006 = **$0.003** | **~$0.036** | preço sugerido 9–19€ |
| **Pro subscription** | $0.011 | até 3 × $0.011 = $0.033 | 10 queries × $0.0006 = **$0.006** | **~$0.050** | inclui refresh semanal |
| **Agency subscription** | igual a Pro mas N perfis × M analyses | — | 20 queries × $0.0006 = **$0.012** (ou Live $0.040) | **variável, base ~$0.062** | white-label, alertas |

Notas:
- Se algum dia for necessário Live mode (ex: previews em tempo real no ecrã), o delta é 5–10× para a parte SERP.
- **Não incluir** keyword volume API nesta v1 — o pricing precisa de confirmação explícita do utilizador antes de qualquer integração.
- Cache hit em DataForSEO custa $0 (igual a Apify).

---

## 4. Modelo de dados proposto

### Decisão: nova tabela `market_context_snapshots`

```text
market_context_snapshots
├─ id              uuid PK
├─ cache_key       text  ("v1:dfs:<sha256(query+location+lang)>")
├─ query           text  (ex: "frederico carvalho coach")
├─ query_type      text  enum: brand | category | keyword
├─ location_code   int   (ex: 2620 = Portugal)
├─ language_code   text  (ex: "pt")
├─ device          text  enum: desktop | mobile
├─ se_domain       text  ("google.pt")
├─ raw_payload     jsonb  (resposta DataForSEO crua, redacted de credenciais)
├─ normalized      jsonb  (top 10 results: position, title, url, domain, snippet, type)
├─ result_count    int
├─ provider        text default 'dataforseo'
├─ created_at      timestamptz
├─ expires_at      timestamptz  (TTL 7d para SERP, 30d para brand)
```

### Nova tabela de associação

```text
report_market_context (junção)
├─ id                       uuid PK
├─ analysis_snapshot_id     uuid FK → analysis_snapshots(id)
├─ market_context_snapshot  uuid FK → market_context_snapshots(id)
├─ tier                     text  (free | paid | pro | agency)
├─ created_at               timestamptz
```

Razão: 1 análise IG pode estar associada a N queries SERP (5 no paid, 10 no pro). Permite deduplicação cruzada (várias análises da mesma marca reusam a mesma query brand).

### O que **não** vai para `analysis_snapshots.normalized_payload`
- Resultados SERP em bruto (volume e ciclo de vida diferentes).
- Listagem completa de domínios competidores SEO.

### O que **pode opcionalmente** ir como pequeno sumário em `analysis_snapshots`
Para evitar JOINs no render do relatório, persistir um resumo leve em `normalized_payload.market_context_summary`:
```ts
{
  brand_serp_position: number | null,   // posição da marca para o seu próprio nome
  brand_query_count: number,            // quantas queries foram feitas
  category_share_of_voice: number,      // % de SERPs onde a marca aparece
  generated_at: string                  // ISO
}
```

### Estender `provider_call_logs`
Coluna `provider` já é `text default 'apify'`. Aceita 'dataforseo' sem migração. Adicionar `query_type` opcional via metadata jsonb se quiser granularidade — não bloqueante para v1.

---

## 5. Endpoints a criar

### Novo: `POST /api/market-context-v1`
- Input: `{ brand: string, category?: string, keywords?: string[], tier: 'free'|'paid'|'pro'|'agency', analysis_snapshot_id?: string }`.
- Aplica gates: `DATAFORSEO_ENABLED`, allowlist (fase de smoke-test), tier → nº de queries (1/5/10/20).
- Cache lookup por query antes de chamar DataForSEO.
- Chama Standard Queue (POST tasks → poll/webhook em `tasks_ready`).
- Persiste em `market_context_snapshots` + cria linhas em `report_market_context`.
- Atualiza summary leve em `analysis_snapshots`.
- Logging em `provider_call_logs` (provider='dataforseo') e `analysis_events` (com `data_source` enriquecido — ex: novo valor `'fresh+market'` ou metadata jsonb).

### Novo: `POST /api/public/dataforseo-callback` (futuro, se usar webhook do DataForSEO)
- Em `/api/public/*` para bypass de auth. Validar HMAC do DataForSEO. Lê `tag` para correlacionar com `cache_key`.

### Endpoint debug admin: `GET /api/admin/market-context/diagnostics`
- Retorna estado: kill-switch, allowlist, contagem de snapshots, custo total estimado nos últimos 30d. Para a tab `/admin/sistema` ou nova tab `/admin/mercado` (decisão futura).

### Modificações no existente `/api/analyze-public-v1`
**Nenhuma na v1**. O fluxo continua puro Apify. A integração market context é orquestrada **a jusante** pelo `runReportPipeline` — só quando o utilizador converte um relatório completo (free, paid, pro), e não em cada chamada pública.

---

## 6. Fluxo de orquestração proposto

```text
Utilizador pede análise
  └→ POST /api/analyze-public-v1   (Apify, intocado)
       └→ analysis_snapshots gravado

Utilizador pede relatório completo
  └→ POST /api/request-full-report
       └→ runReportPipeline (background)
            ├→ POST /api/market-context-v1  ← NOVO PASSO 0 (opcional, soft-fail)
            ├→ POST /api/generate-report-pdf
            └→ POST /api/send-report-email
```

Se `/api/market-context-v1` falhar ou estiver desligado: log warning, segue para PDF sem secção de mercado. Nunca bloqueia o relatório.

---

## 7. Ficheiros prováveis a editar / criar

### A criar (sem tocar em locked)
- `src/lib/market-context/dataforseo-client.ts` — cliente HTTP, error classes, retry, redacting de credenciais.
- `src/lib/market-context/cache.ts` — espelho do `analysis/cache.ts` mas com TTL 7d/30d.
- `src/lib/market-context/cost.ts` — `estimateDataForSeoCost({ queries, mode })`.
- `src/lib/market-context/normalize.ts` — raw SERP → top-10 normalizado.
- `src/lib/market-context/types.ts` — contratos `MarketContextResponse`.
- `src/lib/security/dataforseo-allowlist.ts` — `DATAFORSEO_ENABLED`, `DATAFORSEO_TESTING_MODE`, `DATAFORSEO_ALLOWLIST` (lista de domínios/marcas em smoke-test).
- `src/routes/api/market-context-v1.ts` — endpoint principal.
- Migração SQL: tabelas `market_context_snapshots`, `report_market_context`.

### A editar (não-locked)
- `src/lib/orchestration/run-report-pipeline.ts` — adicionar passo 0 soft-fail.
- `src/lib/report/snapshot-to-report-data.ts` — ler `market_context_summary` e expor como bloco opcional em `ReportData` (extensão não-breaking do contrato).
- `src/components/report/report-mock-data.ts` é **locked** — extensão do tipo `ReportData` deve ser feita via interseção/extension type num ficheiro novo (`src/lib/report/market-context-extension.ts`) ou pedir desbloqueio explícito.
- Render no relatório: criar **componente novo** `src/components/report/report-market-context.tsx` (não-locked). Os componentes existentes ficam intocados.
- `src/routes/admin.sistema.tsx` — card de diagnóstico DataForSEO (kill-switch, custo 30d, allowlist).

### Locked — confirmar que não tocamos
Toda a lista de `/LOCKED_FILES.md`, em particular `/src/components/report/*` e `/src/routes/report.example.tsx`. Se em algum momento for necessário alterar `report-mock-data.ts` ou outro componente locked, **STOP e pedir permissão** antes.

---

## 8. Riscos e fallback

| Risco | Mitigação |
|---|---|
| DataForSEO down ou lento | Standard Queue + soft-fail: relatório PDF gera sem secção mercado. Stale cache de 30d para queries brand. |
| Custo descontrolado | Kill-switch `DATAFORSEO_ENABLED=false`, allowlist em smoke-test, cap por tier hardcoded (1/5/10/20 queries), `usage_alerts` quando custo diário ultrapassar limiar. |
| Credenciais expostas | Login basic auth do DataForSEO via `process.env.DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD`, nunca para o frontend. Redactor em `error_excerpt` igual ao Apify. |
| SERP irrelevante (marca com nome genérico) | `query_type='brand'` recebe sufixo opcional (categoria) na query. `share_of_voice` calculado só sobre top-10 com domain match heurístico. |
| Dependência de novo provider em produção antes de validação | Smoke-test mode obrigatório nas primeiras 2 semanas, `DATAFORSEO_ALLOWLIST` restringe a 1–2 marcas (`frederico.m.carvalho`). |
| Schema drift do DataForSEO | `raw_payload` jsonb persistido na primeira fase para auditoria; remover quando o normalizer estiver estável (poupa storage). |
| Cache poisoning entre análises | `cache_key` inclui `query+location+lang+device+sha256`. Sem partilha entre tiers porque o que muda é o **número** de queries, não a query individual. |

---

## 9. Plano de implementação (prompts futuros, 1 feature por prompt)

1. **Prompt 1 — Schema + segurança**
   - Migração SQL: `market_context_snapshots` + `report_market_context` (sem RLS, igual a `analysis_snapshots`, server-only).
   - `src/lib/security/dataforseo-allowlist.ts` com kill-switch e allowlist.
   - Adicionar secrets `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `DATAFORSEO_ENABLED`, `DATAFORSEO_ALLOWLIST` (pedir ao utilizador via `add_secret`).
   - Checkpoint: tabelas existem, `DATAFORSEO_ENABLED=false` por defeito, allowlist vazia.

2. **Prompt 2 — Cliente DataForSEO + cost + normalize (puro, sem rede em produção)**
   - `dataforseo-client.ts` (Standard Queue: POST task → GET task_get/regular).
   - `cost.ts`, `normalize.ts`, `cache.ts`, `types.ts`.
   - Testes unitários do normalizer com fixture estática.
   - Checkpoint: `bunx tsc --noEmit` ok, sem chamada real ainda.

3. **Prompt 3 — Endpoint `/api/market-context-v1`**
   - Validação Zod, gates (kill-switch, allowlist, tier→queries), cache lookup, chamada provider, persistência, logging.
   - Smoke-test controlado com 1 query brand para `frederico.m.carvalho`.
   - Checkpoint: snapshot gravado, custo logged, idempotência confirmada.

4. **Prompt 4 — Integração no `runReportPipeline`**
   - Passo 0 soft-fail antes do PDF.
   - Atualização do summary leve em `analysis_snapshots`.
   - Checkpoint: pipeline conclui mesmo com DataForSEO desligado.

5. **Prompt 5 — Render no relatório**
   - `report-market-context.tsx` (componente novo, não-locked).
   - Extensão de tipo via ficheiro novo, sem editar `report-mock-data.ts` locked.
   - Inserção no layout do relatório (a definir: o componente container que ainda é editável).
   - Checkpoint: secção aparece quando há dados, omitida quando não há.

6. **Prompt 6 — Diagnóstico admin**
   - Card em `/admin/sistema`: estado kill-switch, queries últimos 30d, custo estimado, allowlist ativa.
   - Checkpoint: visível, sem dependência do DataForSEO estar ativo.

7. **Prompt 7 — Subir tier de testes**
   - Ativar 5 queries para tier paid em smoke-test (allowlist apenas).
   - Validar custos reais vs estimados durante 1 semana.
   - Checkpoint: variância < 10%.

---

## Pontos de decisão antes de avançar

Antes do Prompt 1, o utilizador deve confirmar:

1. **Localização e idioma SERP por defeito**: Portugal (`location_code=2620`, `language=pt`)?
2. **Quem fornece as queries category/keywords no tier paid+**: derivadas automaticamente da bio + hashtags top, ou inseridas pelo utilizador no flow de checkout?
3. **Webhook vs polling no Standard Queue**: webhook é mais limpo mas requer endpoint público estável; polling é simples mas ocupa worker time. Recomendação: **polling com timeout 90s** para v1.
4. **Conta DataForSEO**: já tem credenciais ou precisa de criar? (Não pedir secrets antes desta confirmação.)

Sem implementação executada — aguardo aprovação do plano.
