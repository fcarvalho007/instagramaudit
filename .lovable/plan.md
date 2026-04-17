

## Entendimento

**1. Landing → analyze → gate**: hero (`/`) → `/analyze/$username[?vs=h1,h2]` → `<PublicAnalysisDashboard>` (header + métricas + benchmark cloud + concorrentes + premium gate) → `<ReportGateModal>` → `POST /api/request-full-report` (quota server-side + insert em `report_requests` ligado ao snapshot exacto via `analysis_snapshot_id`).

**2. Análise pública + snapshots**: `/api/analyze-public-v1` calcula `cache_key`, faz `lookupSnapshot()` (TTL 24h, stale 7d), persiste `analysis_snapshots` com `id` único e `normalized_payload` jsonb (`{ profile, content_summary, competitors }`). Frontend recebe `analysis_snapshot_id` no payload.

**3. Report request**: `report_requests` tem hoje `lead_id`, `instagram_username`, `competitor_usernames`, `request_source`, `request_status`, `delivery_status`, `is_free_request`, `request_month`, `metadata`, e crucialmente `analysis_snapshot_id` (FK `ON DELETE SET NULL`). Sem campos de PDF ainda.

**4. Linkagem snapshot**: cada request **já está ligado** ao snapshot exacto que motivou a conversão. O backend valida existência + match de username antes do insert. Snapshot é imutável e reproducible.

**5. Porquê PDF a partir de `report_request_id` → `analysis_snapshot_id`**: a cadeia já está montada. PDF v1 deve ser puro `(report_request_id) → snapshot → render → storage`. Sem Apify, sem reanálise, sem dependência de estado do browser. Determinístico, auditável, regenerável anos depois com o mesmo resultado.

---

## Discrepâncias e decisões

**Server route vs Edge Function**: o prompt pede "Edge Function" mas o projecto usa **TanStack Server Routes** (não Supabase Edge Functions — knowledge confirma "Do NOT use Supabase Edge Functions"). Implementar como `/api/generate-report-pdf` (server route POST).

**`@react-pdf/renderer` no Cloudflare Worker**: ⚠️ **risco crítico**. A lib usa `fontkit` + assume APIs Node (Buffer/streams). Já tem reports de funcionar em Workers com `nodejs_compat`, mas com pegadinhas: fontes têm de ser embutidas como ArrayBuffer, sem `fs.readFileSync` em runtime. **Plano**: usar fonts default da lib (Helvetica/Times — não precisam de embed) para v1; Fraunces/Inter ficam para v2 quando estabilizarmos o pipeline. Aceito como trade-off premium-vs-shippable.

**Bucket público vs privado**: privado. PDFs contêm dados curados para o lead específico — nunca expostos por URL adivinhável. Acesso futuro via signed URL gerado por server route autenticada (não neste prompt). RLS storage policies fechadas, leitura só por service role.

**Idempotência**: se `pdf_status = 'ready'` e `pdf_storage_path` existe → devolver referência existente sem regenerar (poupa CPU + storage churn). Se `?force=1` na query → regenera e sobrescreve no mesmo path (upsert no bucket). Decisão clara, documentada na response.

**Path naming**: `reports/{YYYY}/{MM}/{report_request_id}.pdf`. Determinístico, ordenável por mês, sem colisões (UUID único por request). `YYYY/MM` derivados de `request_month` da row (não de `now()`) para manter consistência mesmo em regeneração tardia.

**Status lifecycle**: `not_generated` → `generating` → `ready` | `failed`. Marca `generating` antes do render para detectar processos em curso (caso futuro de retries paralelos).

**Conteúdo v1**: o snapshot tem `profile + content_summary + competitors`. Render fiel a isto:
- Capa com username, avatar (se URL https acessível) ou placeholder, data de análise
- Identidade do perfil (nome, bio, followers/following/posts, verified)
- Métricas-chave (engagement rate, avg likes/comments, posts analisados, dominant format, posts/semana)
- Benchmark positioning (recomputado server-side a partir do dataset cloud actual + dados do snapshot — mesma lógica que o dashboard faz)
- Concorrentes (tabela: handle, followers, engagement, avg likes/comments) + linhas de falha graceful
- Footer com timestamp + branding pt-PT

**Sem AI insights neste prompt** — o snapshot v1 não tem narrativa LLM. Render só o que existe. Secção "Recomendações estratégicas" omitida (não inventar).

**Avatares**: tentar embed da `avatar_url` via fetch + ArrayBuffer no momento do render. Se falhar, placeholder geométrico (iniciais sobre fundo de cor derivada). Não bloquear PDF por causa de imagem.

---

## Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `supabase/migrations/{ts}_pdf_tracking.sql` | **Criar** — colunas pdf no `report_requests` + bucket privado `report-pdfs` + storage RLS server-only | Não |
| `src/lib/pdf/report-document.tsx` | **Criar** — componente React-PDF (`<Document>`/`<Page>`) com layout v1 | Não |
| `src/lib/pdf/styles.ts` | **Criar** — StyleSheet do react-pdf (cores, spacing, tipografia adaptada para print) | Não |
| `src/lib/pdf/render.ts` | **Criar** — `renderReportPdf(snapshot, requestMeta)` → `Uint8Array` | Não |
| `src/lib/pdf/storage.ts` | **Criar** — `uploadReportPdf(path, bytes)` + `buildReportPath(request)` via `supabaseAdmin` | Não |
| `src/routes/api/generate-report-pdf.ts` | **Criar** — server route POST, valida payload, orquestra fetch → render → upload → update | Não |
| `package.json` | Editar — adicionar `@react-pdf/renderer` (única lib nova, alinhada com stack decidido) | Não |

**Zero ficheiros locked tocados.** Confirmado contra `mem://constraints/locked-files`.

---

## Schema da migração

```sql
ALTER TABLE public.report_requests
  ADD COLUMN IF NOT EXISTS pdf_status text NOT NULL DEFAULT 'not_generated',
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS pdf_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_error_message text;

-- Private bucket: PDFs are personalized for each lead, never publicly addressable.
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-pdfs', 'report-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: server-only access via service role (no policies = closed by default
-- for non-service contexts; service role bypasses RLS).
```

Status enum implícito: `'not_generated' | 'generating' | 'ready' | 'failed'`.

---

## Fluxo do server route

```
POST /api/generate-report-pdf
  body: { report_request_id: uuid, force?: boolean }

1. Zod validate payload
2. SELECT report_requests WHERE id = $1
   → if not found: { error_code: "REQUEST_NOT_FOUND" }
3. If pdf_status = 'ready' && !force:
   → return existing { pdf_storage_path, pdf_generated_at, pdf_status: 'ready' }
4. Validate analysis_snapshot_id present
   → if null: mark failed + { error_code: "SNAPSHOT_LINK_MISSING" }
5. SELECT analysis_snapshots WHERE id = $1
   → if not found: mark failed + { error_code: "SNAPSHOT_NOT_FOUND" }
6. UPDATE report_requests SET pdf_status = 'generating'
7. Try:
     a. Render PDF (renderReportPdf with snapshot.normalized_payload + benchmark recompute)
     b. Build path: reports/{YYYY}/{MM}/{request.id}.pdf (from request_month)
     c. Upload to storage (upsert: true)
     d. UPDATE report_requests SET pdf_status='ready', pdf_storage_path, pdf_generated_at=now(), pdf_error_message=null
     e. return { success: true, ... }
   Catch:
     UPDATE pdf_status='failed', pdf_error_message=<sanitized>
     return { error_code: "RENDER_FAILED" | "UPLOAD_FAILED" }
```

Mensagens de erro internas (admin-friendly), nunca stack traces.

---

## Conteúdo PDF v1 — secções

```
Page 1 (Cover):
  - InstaBench wordmark (header)
  - "Relatório de Análise"
  - @username + display name
  - Avatar (embedded ou placeholder)
  - "Análise realizada em DD MMM YYYY"

Page 2 (Perfil + Métricas):
  - Identidade: nome, bio, verified badge, contadores (seguidores/seguir/publicações)
  - Métricas-chave (grid): taxa de engagement, média de gostos, média de comentários,
    publicações analisadas, formato dominante, publicações/semana

Page 3 (Benchmark):
  - Posicionamento: tier do perfil (label do dataset cloud)
  - Engagement do perfil vs benchmark do tier × formato dominante
  - Diferença em pontos percentuais + interpretação textual neutra
    ("acima da média", "em linha", "abaixo da média") — sem AI

Page 4 (Concorrentes) — só se array competitors não vazio:
  - Tabela: @handle, seguidores, engagement, média gostos, média comentários
  - Linhas de falha mostradas como "Dados indisponíveis" sem detalhe técnico

Footer (todas as páginas):
  - "InstaBench · {data} · Página X de Y"
```

Tipografia: Helvetica (default react-pdf, sem embed) — Fraunces/Inter ficam para v2.
Paleta print-friendly: fundo branco, texto navy escuro `#0A0E1A`, accent cyan `#06B6D4` em cabeçalhos. Reverso do dark-first do produto, propositadamente — tinta em papel funciona melhor assim.

---

## Idempotência — regra v1

**Regra única e clara**: 
- Sem `force`: se `pdf_status = 'ready'`, devolve referência existente (HTTP 200, sem regenerar).
- Com `?force=true` no body: regenera, sobrescreve no mesmo path do storage (upsert), actualiza `pdf_generated_at`.
- `pdf_status = 'generating'`: aceita nova request (sem locking distribuído em v1; race rara, último wins via upsert determinístico).

Documentado na resposta via campo `regenerated: boolean`.

---

## Resposta do route

**Sucesso**:
```json
{
  "success": true,
  "report_request_id": "uuid",
  "pdf_status": "ready",
  "pdf_storage_path": "reports/2026/04/uuid.pdf",
  "pdf_generated_at": "2026-04-17T...",
  "regenerated": false
}
```

**Falha**:
```json
{
  "success": false,
  "error_code": "REQUEST_NOT_FOUND" | "SNAPSHOT_LINK_MISSING" | "SNAPSHOT_NOT_FOUND" | "RENDER_FAILED" | "UPLOAD_FAILED" | "INVALID_PAYLOAD",
  "message": "..."
}
```

Sem mensagens user-facing pt-PT no route — não é exposto a utilizadores ainda (server-to-server / futuro admin). Mensagens internas em inglês.

---

## Risco e mitigação — `@react-pdf/renderer` no Worker

| Risco | Mitigação |
|---|---|
| Lib usa `fontkit` que pode falhar a importar no Worker | Usar fonts default (PDF standard 14 — Helvetica, Times, Courier — não precisam de fontkit) |
| `Buffer`/`stream` indisponível | `nodejs_compat` flag já cobre (verificar `wrangler.jsonc`) |
| Tamanho do bundle | react-pdf é ~2MB minified; aceitável para um server route |
| Imagens externas (avatar) bloqueiam render | Fetch com timeout 3s + try/catch; fallback para placeholder |
| Erro no build | Verificar build após adicionar dependência antes de avançar com server route |

Se o build falhar após adicionar a dep, **plano B**: gerar HTML server-side e devolver instrução para o utilizador (não shippable, mas isolado). Decisão tomada na hora se acontecer.

---

## Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem email / pagamentos / auth / admin UI / download UI | ✅ |
| Sem reanálise / Apify | ✅ |
| `@react-pdf/renderer` (única lib nova, alinhada com stack) | ✅ |
| Server-side only, secrets em Supabase | ✅ |
| Locked files intactos | ✅ |
| pt-PT impessoal no PDF | ✅ |
| Comentários em inglês | ✅ |
| Snapshot como única fonte | ✅ |
| Idempotência clara (sem `force` = devolve existente) | ✅ |
| Future-ready (email/admin/signed URLs lêem `pdf_storage_path`) | ✅ |

---

## Checkpoints

- ☐ Migração adiciona `pdf_status` + `pdf_storage_path` + `pdf_generated_at` + `pdf_error_message`
- ☐ Bucket privado `report-pdfs` criado
- ☐ `@react-pdf/renderer` instalado e build verde
- ☐ `src/lib/pdf/` com componente Document, styles, render, storage helpers
- ☐ `/api/generate-report-pdf` orquestra fetch → render → upload → update
- ☐ Idempotência: sem `force` devolve existente quando `pdf_status='ready'`
- ☐ Erros estruturados, sem stack leaks, status `failed` persistido
- ☐ PDF v1 só usa dados do snapshot (sem AI, sem reanálise, sem provider call)
- ☐ Sem email/pagamentos/auth/admin/download UI introduzidos

