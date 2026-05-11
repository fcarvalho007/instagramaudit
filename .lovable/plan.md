# Auditoria — cache, snapshots e retenção de relatórios (read-only)

## TL;DR

A regra de **15 dias** ainda não existe. O que está em produção é uma
combinação inconsistente:

- Cache "fresh" reusa snapshot durante **24 h**.
- Tolerância "stale" para fallback em erro: **7 dias**.
- Endpoint admin de cleanup: apaga `analysis_snapshots` com
  `updated_at < now() - 5 dias` — **não está agendado**, só corre quando o
  admin clica.
- "Abrir relatório" em `/app/reports` **não abre o snapshot histórico** —
  vai para `/analyze/$username`, que carrega o último snapshot da chave de
  cache (ou regenera, se expirado e modo de execução o permitir).

Resultado: dois utilizadores que pediram o mesmo perfil podem ver versões
diferentes ao reabrir, e qualquer "pedido" perde o conteúdo original assim
que o snapshot é refeito.

## 1. Cache TTL actual — onde está definido

| Camada | Constante | Valor | Ficheiro |
|---|---|---|---|
| Snapshot principal (Apify/Instagram) | `CACHE_TTL_MS` | **24 h** | `src/lib/analysis/cache.ts:16` |
| Tolerância stale (fallback em erro) | `STALE_TOLERANCE_MS` | **7 dias** | `src/lib/analysis/cache.ts:19` |
| Cache key version | `CACHE_KEY_VERSION` | `v1` | `src/lib/analysis/cache.ts:22` |
| Market signals (DataForSEO) | `free_ready_seconds`, etc. | **24 h** | `src/lib/market-signals/cache.ts:22-26` |
| DataForSEO (por endpoint) | `CACHE_TTL_SECONDS` | varia | `src/lib/dataforseo/types.ts:72` |
| Benchmarks (in-memory) | `CACHE_TTL_MS` | 10 min | `src/lib/benchmark/reference-data.server.ts:23` |
| Execution mode (in-memory) | `TTL_MS` | 30 s | `src/lib/admin/execution-mode.server.ts:14` |
| Cleanup admin | `RETENTION_DAYS` | **5 dias** | `src/routes/api/admin/reports.cleanup-expired.ts:23` |
| Signed URL do PDF (email) | `SIGNED_URL_TTL_SECONDS` | 7 dias | `src/routes/api/send-report-email.ts:32` |
| Signed URL público do PDF | `SIGNED_URL_TTL_SECONDS` | 600 s | `src/routes/api/public/public-report-pdf.ts:35` |

Não há TTL diferenciado por módulo do relatório dentro do mesmo snapshot —
todo o `normalized_payload` partilha o `expires_at` da linha.

Verificação na BD (4 snapshots existentes):
- TTL real (`expires_at - created_at`): mín 1d, mediana ~2d, máx 10.8d.
- O desvio acima de 24h vem de **refrescos manuais via admin**: cada novo
  scrape faz `upsert ON CONFLICT (cache_key)` e reseta `expires_at` para
  `now() + 24h`, sem criar nova linha.

## 2. Tabelas envolvidas

| Tabela | Papel | Campos relevantes | Tamanho actual |
|---|---|---|---|
| `analysis_snapshots` | dados normalizados do scrape (single-row por `cache_key`) | `cache_key`, `instagram_username`, `competitor_usernames`, `normalized_payload` (jsonb), `created_at`, `updated_at`, `expires_at`, `analysis_status` | **8.5 MB** (4 linhas, ~2 MB/linha c/ TOAST — ver §5) |
| `report_requests` | "pedido" do utilizador (1 por unlock/email) | `analysis_snapshot_id` (FK lógica), `lead_id`, `user_id`, `pdf_storage_path`, `request_status`, `pdf_status`, `delivery_status`, `created_at`, `updated_at` | 264 kB (9 linhas) |
| `social_profiles` | agregado por handle (contadores totais) | `last_snapshot_id`, `analyses_*`, `estimated_cost_usd_total`, `last_analyzed_at` | 112 kB |
| `analysis_events` | append-only de cada análise (cache hit/fresh/stale) | `cache_key`, `data_source`, `outcome`, `analysis_snapshot_id`, `provider_call_log_id` | 984 kB |
| `provider_call_logs` | log de chamadas Apify/OpenAI/DFS | `actual_cost_usd`, `posts_returned` | 176 kB |
| `product_events` | telemetria UI (unlocks, views, etc.) | `event_type`, `metadata`, `lead_id`, `snapshot_id` | 544 kB |
| `report-pdfs` (storage) | PDF gerado (privado) | `pdf_storage_path` em `report_requests` | 65 kB total (2 ficheiros) |

`expires_at` só existe em `analysis_snapshots`.

## 3. Comportamento da rota pública `/analyze/:username`

`src/routes/analyze.$username.tsx` → cliente chama
`fetchPublicAnalysis` → `POST /api/analyze-public-v1`:

1. Computa `cacheKey = v1:<username>|<sorted competitors>`.
2. `lookupSnapshot(cacheKey)` na tabela `analysis_snapshots`.
3. Se existir e `expires_at > now()` → devolve **esse** snapshot
   (`data_source: "cache"`).
4. Caso contrário, conforme `execution_mode`:
   - `cache_only`: serve stale se `created_at` < 7d, senão erro.
   - `live`/`fresh`: chama Apify, faz `upsert` no mesmo `cache_key`
     (substitui a linha) e devolve `data_source: "fresh"`.
5. Existe rota `GET /api/public/analysis-snapshot/by-id/$snapshotId` que
   carrega snapshot exacto, **mas a UI pública não a usa** — só admin
   (`/admin/report-preview/snapshot/$snapshotId`).

**Conclusão**: `/analyze/:username` carrega sempre o snapshot **mais recente
para aquela chave de cache**, nunca um snapshot histórico específico.

## 4. Comportamento do dashboard `/app/reports`

`src/server/reports.functions.ts` (`getOwnedReports`,
`getOwnedReport`):

- Lista lê `report_requests` filtrado por `user_id`, ordenado
  `created_at DESC`. Cada item traz `analysis_snapshot_id`.
- "Abrir relatório" (`src/routes/app.reports.tsx:197` e
  `src/routes/app.reports.$id.tsx:332`) renderiza:
  ```
  <Link to="/analyze/$username" params={{ username: report.instagram_username }}>
  ```
  → **ignora `analysis_snapshot_id`**. O utilizador é levado para o último
  snapshot da chave de cache. Se entretanto houve refresh, o relatório
  visto na app pode ser diferente do que originou o pedido.
- O detalhe de relatório tem botão "Regenerar PDF — em breve" desactivado
  e link para download do PDF (signed URL 600 s) **só se** existir
  `pdf_storage_path`.

**Conclusão**: "Abrir relatório" abre o snapshot **mais recente do
username**, não o histórico vinculado ao pedido.

## 5. Comportamento admin / perfis de teste

- `/admin/sistema` → `force-refresh`
  (`src/routes/api/admin/force-refresh.ts:31`): faz
  `UPDATE analysis_snapshots SET expires_at = now() - 60s WHERE
  instagram_username = ?`. O próximo `/analyze/<handle>` cai em
  `expires_at <= now()`, dispara fresh, e **upsert no mesmo `cache_key`
  reescreve a linha** (perde-se o snapshot anterior).
- "Cache expired" no admin = `expires_at <= now()` (regra `isFresh`).
- Não há allowlist de retenção: `frederico.m.carvalho` e `martimsilvai`
  obedecem ao mesmo TTL de 24h. Hoje sobrevivem só porque o admin clicou
  refresh recentemente — não há garantia.

## 6. Cleanup actual

- Endpoint manual `POST /api/admin/reports/cleanup-expired`
  (`src/routes/api/admin/reports.cleanup-expired.ts`): apaga
  `analysis_snapshots` com `updated_at < now() - 5 dias`. Só `DELETE`
  nessa tabela; nada toca em `report_requests`, `analysis_events`,
  `provider_call_logs`, `usage_alerts`, `social_profiles`, `leads`.
- **Não está agendado** (`rg cron.schedule supabase/ src/` → 0 hits).
- PDFs em storage **nunca são apagados** automaticamente.
- Após cleanup, qualquer `report_requests.analysis_snapshot_id` existente
  fica órfão (sem FK formal — é só um id).

## 7. Estimativa de tamanho por relatório

Medições reais sobre os 4 snapshots existentes:

| Componente | Bytes típicos | Observação |
|---|---|---|
| `normalized_payload` (jsonb) | **5–20 KB** | tabela acima: 4942 a 19580 bytes (`pg_column_size`) |
| Tabela `analysis_snapshots` (heap+TOAST) | ~2 MB / linha | TOAST inclui thumbnails base64 cacheadas (`thumbnail-cache.server.ts`) |
| `analysis_events` (1–3 linhas / pedido) | ~1 KB | metadados leves |
| `provider_call_logs` (0–1 linha) | ~0.5 KB | só em fresh |
| `report_requests` (1 linha) | ~1 KB | |
| `product_events` (3–10 linhas) | ~50 B cada | unlocks, views |
| PDF (storage) | ~30 KB | média 33 KB nos 2 ficheiros existentes |

**Estimativa por relatório completo** (1 perfil sem competitors, com PDF):
- payload "puro" (JSON + logs): **~25–40 KB**
- com base64 das thumbnails embebidas no payload: **~1–2 MB**
- + PDF: **+30–50 KB**

Para 1 000 relatórios activos com a arquitectura actual: ~1.5–2 GB.
A maior fatia é o cache de thumbnails dentro do `normalized_payload`.

## 8. Riscos e inconsistências

1. **TTL fragmentado**: 24h (snapshot), 7d (stale), 5d (cleanup), 7d
   (signed URL email), 600s (signed URL público), 24h (DFS), 10min
   (benchmarks). Nenhuma destas constantes diz "15 dias".
2. **Upsert por `cache_key`** apaga o snapshot anterior. Não há
   versionamento, logo não existe "snapshot histórico" guardado, mesmo
   que o `report_requests` aponte para um id — esse id é simplesmente
   reescrito por dentro.
3. **"Abrir relatório" navega por username**, não por `snapshot_id`.
   Mesmo que existisse versionamento, o link actual não o respeita.
4. **Cleanup não agendado**: snapshots crescem indefinidamente até alguém
   carregar manualmente. Em contrapartida, quando carrega, apaga tudo
   `updated_at < 5d` — incompatível com a regra de 15 dias pedida.
5. **PDFs órfãos**: cleanup não toca em storage; ficheiros ficam para
   sempre depois de o snapshot e o request serem removidos.
6. **Perfis de teste sem protecção formal**: `APIFY_ALLOWLIST` evita
   chamar Apify, mas **não evita expiração** dos snapshots de teste.
7. **Dashboard não comunica retenção**: nenhuma string em
   `app.reports*` menciona "15 dias" ou data de expiração.
8. **Refresh admin substitui sem confirmação**: `force-refresh` reseta
   `expires_at` no passado mas o utilizador final perde o relatório
   anterior assim que alguém abrir `/analyze`.

## 9. Arquitectura recomendada (15 dias)

> *Recomendação de design — não inclui código nem migrações. Implementação
> em sprints separados depois desta auditoria.*

### 9.1 Modelo: separar "cache de scrape" de "snapshot de relatório"

- **`analysis_snapshots`** (manter): cache de scrape, único por
  `cache_key`. TTL fresh: 24h (mantém-se — é o que dispara novo scrape).
- **`report_snapshots`** (novo): snapshot **imutável** copiado no momento
  do unlock/geração. Campos:
  - `id` (uuid, surrogate)
  - `report_request_id` (FK)
  - `instagram_username`, `competitor_usernames`
  - `payload_jsonb` (cópia do `normalized_payload` no momento)
  - `pdf_storage_path` (opcional)
  - `created_at`, `expires_at` (created_at + 15d)
- `report_requests.report_snapshot_id` aponta para esta nova linha; já
  não depende de `analysis_snapshots`.
- "Abrir relatório" passa a usar `/analyze/by-snapshot/$snapshotId` (rota
  já existe internamente como `/api/public/analysis-snapshot/by-id/...`),
  **sempre** que o pedido tem `report_snapshot_id`.

### 9.2 Retenção uniforme

- Constante única `REPORT_RETENTION_DAYS = 15` partilhada por:
  - `expires_at` em `report_snapshots`;
  - cleanup agendado;
  - copy do dashboard.
- Cleanup via `pg_cron` (diário, 03:00 UTC):
  1. Apagar `report_snapshots` com `expires_at < now()`.
  2. Apagar PDF do storage para cada `pdf_storage_path` removido.
  3. Marcar `report_requests` correspondentes com
     `request_status = 'expired'` (não apagar — preserva histórico
     comercial).
- `analysis_snapshots` mantém o seu cleanup actual (snapshots de cache,
  curto prazo) — independente da retenção dos relatórios.

### 9.3 Allowlist de perfis internos

- Tabela `internal_profiles` ou `app_config` chave
  `report_retention_allowlist` com handles (`frederico.m.carvalho`,
  `martimsilvai`). Cleanup salta `report_snapshots` cujo
  `instagram_username` esteja na lista.

### 9.4 UX

- Card no `/app/reports` topo: *"Os teus relatórios ficam disponíveis
  durante 15 dias após a geração."*
- Em cada cartão: badge "Disponível até DD/MM" calculado de
  `report_snapshot.expires_at`.
- Detalhe de relatório expirado: mensagem "Este relatório expirou em
  DD/MM. Podes pedir uma análise nova".

### 9.5 Migração dos dados existentes (read-only — só plano)

- Backfill: para cada `report_requests` com `analysis_snapshot_id`
  válido, criar `report_snapshots` com `expires_at = greatest(now()+15d,
  request.created_at + 15d)`.
- A partir desse ponto, o link "Abrir relatório" deixa de chamar
  `/analyze/$username`.

## 10. Prompts de implementação sugeridos (para futuras sessões)

1. **Migração `report_snapshots`** — criar tabela + RLS + índices +
   constante `REPORT_RETENTION_DAYS = 15` partilhada em
   `src/lib/retention/constants.ts`.
2. **Pipeline de geração** — alterar `request-full-report` /
   `report-unlock` para copiar o `normalized_payload` para
   `report_snapshots` antes de devolver, e gravar
   `report_requests.report_snapshot_id`.
3. **Rota pública `/analyze/by-snapshot/$id`** — UI dedicada que carrega
   `report_snapshots`, com banner "Snapshot histórico de DD/MM".
4. **Dashboard `/app/reports`** — mudar `<Link>` para a nova rota,
   adicionar banner de 15 dias e badge "Disponível até".
5. **Cron de cleanup** — `pg_cron` diário a chamar
   `/api/public/hooks/cleanup-report-snapshots`, que apaga linhas
   expiradas, PDFs em storage, e marca pedidos como `expired`.
6. **Allowlist de perfis internos** — `app_config` + leitura no cleanup.
7. **Telemetria** — emitir `report_snapshot_expired` em `product_events`
   no momento do cleanup, para dashboards futuros.

## Checkpoint da auditoria

- ☑ Cache TTL identificado (24h fresh, 7d stale, 5d cleanup manual)
- ☑ Tabelas e fluxos mapeados
- ☑ "Abrir relatório" confirmado a abrir último snapshot, não histórico
- ☑ Tamanhos medidos directamente na BD
- ☑ Riscos e inconsistências enumerados
- ☑ Arquitectura de 15 dias proposta + 7 prompts para sprints seguintes
- ☐ Implementação (depende de aprovação separada de cada prompt)
