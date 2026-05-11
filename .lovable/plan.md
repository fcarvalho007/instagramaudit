## Auditoria — `/reports/$snapshotId` (read-only, sem alterações)

### 1. Comportamento actual

**Rota:** `src/routes/reports.$snapshotId.tsx`
- `ssr: false`, `noindex, nofollow`.
- Faz `fetch("/api/public/analysis-snapshot/by-id/:id")`.
- Renderiza `<ReportShellV2 variant="public_mvp">` com `snapshotId`, `payload`, `analyzedAtIso`, `expiresAtIso`. Sem chamadas a providers, sem regeneração.

**Endpoint:** `src/routes/api/public/analysis-snapshot.by-id.$snapshotId.ts`
- `SELECT id, instagram_username, normalized_payload, created_at, updated_at, expires_at FROM analysis_snapshots WHERE id = :snapshotId`.
- Calcula `benchmark` em runtime via `buildReportBenchmarkInput(payload)`. Não escreve.

**Resposta à pergunta 1:** `snapshotId` representa hoje **`analysis_snapshots.id`**, não `report_snapshots.id`. A `/reports/$snapshotId.tsx` nunca toca em `report_snapshots`.

### 2. Imutabilidade — risco confirmado

`src/lib/analysis/cache.ts:193`:
```ts
.upsert(row as never, { onConflict: "cache_key" })
```
- `analysis_snapshots` tem unique em `cache_key`. Quando uma nova análise produz o mesmo `cache_key` (mesmo `network|handle|conjunto-de-competitors|...`), o Postgres faz `UPDATE` da linha existente.
- O **`id` mantém-se**, mas `normalized_payload`, `updated_at` e `expires_at` mudam.
- O comentário no topo da rota já reconhece a "caveat técnica" e diz que clonar por `report_request` está fora de scope desta fase.

**Resposta à pergunta 2:** Não. Abrir `/reports/$snapshotId` **não é verdadeiramente imutável** dentro da janela de retenção. Cenários práticos onde o conteúdo muda sem o id mudar:

- Mesmo handle re-analisado por outro utilizador (público) com a mesma combinação de competitors → `cache_key` colide → `UPDATE` do payload da linha apontada por todos os `report_requests` antigos com aquele `analysis_snapshot_id`.
- Mesmo handle re-analisado pelo próprio utilizador antes do TTL expirar → idem.
- Enriquecimentos (comments, DFS, OpenAI) que escrevem em cima de `normalized_payload` via `set_enrichment_status`/jobs depois da primeira leitura → o relatório histórico vê os enrichments novos.
- `expires_at` é movido para o futuro a cada upsert → a janela de retenção "rejuvenesce" relativamente ao primeiro `report_request`.

**Resposta à pergunta 3:** Sim, confirmado. `analysis_snapshots` é uma camada de cache mutável por `cache_key`, não um arquivo histórico.

### 3. Migração desejável para `report_snapshots`

`report_snapshots` (Fase 1 já criada) foi desenhado precisamente para isto:
- `report_payload_jsonb` é congelado no momento da geração.
- `payload_schema_version`, `report_version`, `algorithm_version` permitem render determinístico.
- 1 linha por `report_request_id` (índice único parcial recém-criado).
- Sem upsert por `cache_key`; nenhum job de enriquecimento o re-escreve.

**Resposta à pergunta 4:** Sim. `/reports/$snapshotId` deve passar a ler `report_snapshots` assim que o pipeline começar a escrever (Fase 2/3). Manter `analysis_snapshots` apenas como camada de cache para o pipeline.

### 4. Recomendação de naming final

**Recomendação: manter `/reports/$snapshotId` e trocar a fonte mais tarde.** Razões:

- O parâmetro semanticamente é "o id do snapshot que estás a ver"; o utilizador final não distingue camadas técnicas. URL estável evita dead links em emails/PDFs já enviados.
- Migrar a fonte sem mudar a URL é trivial: trocar o endpoint que ela chama. O componente já recebe `snapshotId`, `payload`, `analyzedAtIso`, `expiresAtIso` — assinatura compatível.
- `/reports/history/$reportSnapshotId` adiciona ruído ("history" é redundante quando o conceito é "relatório guardado") e cria duas URLs por relatório, pior para SEO interno e tracking.

Recomendação alternativa só se houver período de coabitação real (ambos os IDs activos durante semanas): `/reports/$id` aceita os dois e detecta tipo via prefixo de tabela ou flag. Não vale a pena para um corte único.

### 5. Risco residual hoje

Enquanto a fonte for `analysis_snapshots`:
- Bloquear PDF print de relatórios "antigos" depois de o `cache_key` ter sido reutilizado é impossível sem clonar.
- Se o pipeline aceitar competitors variáveis para o mesmo handle, o `cache_key` raramente colide em prática — o risco é menor mas não nulo.
- A janela de retenção (15d) limita o estrago, mas não o anula.

Mitigação até à Fase 2 estar viva: nada a fazer agora, conforme as restrições. Documentar a caveat (já está no header do ficheiro).

### 6. Passos de migração (quando a Fase 2 ficar pronta)

1. Pipeline público (`/api/public/analyze` ou equivalente) passa a escrever `report_snapshots` no fim de cada geração bem-sucedida, com `report_request_id` preenchido e payload validado por `ReportPayloadV1Schema`.
2. Criar novo endpoint `GET /api/public/report-snapshot/by-id/:id` que lê `report_snapshots` por UUID, devolve `report_payload_jsonb` (já no shape final) + `expires_at` + `instagram_username`. RLS já permite SELECT só ao dono via `user_id`; o endpoint usa `supabaseAdmin` mas valida o id existe e está dentro do TTL.
3. Migrar `reports.$snapshotId.tsx` para chamar o novo endpoint. O `payload` vem já no shape canónico; o `snapshotToReportData` pode ser mantido como adaptador defensivo ou substituído por mapeamento directo (decidir na Fase 2).
4. Backfill opcional: para `report_requests` existentes com `analysis_snapshot_id` mas sem `report_snapshot_id`, escrever `report_snapshots` a partir do `analysis_snapshots.normalized_payload` + `buildReportBenchmarkInput`. Marcar `metadata.backfilled_at`. Sem isto, links antigos passam a 404 — decidir aceitabilidade na Fase 2.
5. Actualizar `/report/print/$snapshotId` (target do PDFShift) para usar a mesma fonte. Caso contrário PDFs e versão online divergem.
6. Manter `analysis-snapshot.by-id.$snapshotId.ts` apenas para uso admin/diagnóstico (ou apagar se ninguém mais consumir).

### Saída resumida

| Pergunta | Resposta |
|---|---|
| `snapshotId` é... | `analysis_snapshots.id` |
| `/reports/$snapshotId` é imutável? | Não. Cache mutável por `cache_key`. |
| `analysis_snapshots` é sobreposto mantendo o id? | Sim, via `upsert onConflict: cache_key`. |
| Migrar para `report_snapshots`? | Sim, na Fase 2. |
| URL final | Manter `/reports/$snapshotId`, trocar só a fonte. |
