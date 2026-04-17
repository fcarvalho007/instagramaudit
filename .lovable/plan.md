

## Entendimento

**1. Fluxo landing → analyze → gate**: hero (`/`) → `/analyze/$username[?vs=h1,h2]` → `<PublicAnalysisDashboard>` (header + métricas + benchmark cloud + concorrentes + premium gate) → `<ReportGateModal>` (form: nome/email/empresa) → `POST /api/request-full-report` (quota 100% server-side: upsert lead, conta `report_requests` do mês, decide `first_free | last_free | limit_reached`, insere row).

**2. Análise pública + snapshots persistidos**: `POST /api/analyze-public-v1` calcula `cache_key = v1:primary|sorted-competitors`, faz `lookupSnapshot()`. Se fresh (< 24h) → devolve do snapshot. Caso contrário → scrape Apify, normaliza, faz `storeSnapshot()` (upsert por `cache_key`), devolve. Stale-on-error 7d. Cada snapshot tem `id uuid` único, mas **esse id nunca é exposto na response** — `PublicAnalysisSuccess` traz `profile + content_summary + competitors + status + benchmark_positioning`, sem `snapshot_id`.

**3. Fluxo de report request actual**: `<PremiumLockedSection>` mostra CTA → abre `<ReportGateModal>` → submit envia `{ email, name, company?, instagram_username, competitor_usernames[], request_source }` → backend persiste em `report_requests` com `metadata: { quota_mode, flow_version, route }`. **Não há referência ao snapshot que estava no ecrã.** Quem ver o `report_requests` no futuro tem o username mas não sabe quais foram exactamente os números/posts/concorrentes mostrados ao utilizador.

**4. Porquê linkar agora cada request ao snapshot exacto**: hoje há *drift* potencial entre o que o utilizador viu e o que o sistema tem em cache. Cenário: utilizador analisa @nike às 14h00 (snapshot A com 12.3M followers), TTL expira às 14h+24h, scrape novo às 14h05 do dia seguinte gera snapshot B com 12.4M e métricas diferentes; se o request do utilizador foi gravado no dia 1 sem `snapshot_id` e o PDF for gerado mais tarde, o PDF vai conter dados do snapshot B, não os que motivaram a conversão. Linkar `report_requests.analysis_snapshot_id` → `analysis_snapshots.id` torna o snapshot **imutável e reproducible** para esse pedido específico, mesmo que a cache rode entretanto.

**5. Porquê antes do PDF**: o gerador de PDF terá de ser puro: `(snapshot_id) → PDF binary`. Sem o link, o gerador teria de re-procurar por `cache_key` (não estável no tempo) ou re-fazer scrape (custo + drift). Com o link, o PDF é determinístico, auditável e reproducível anos depois. Email/admin tooling assentam na mesma cadeia (`request → snapshot`). Implementar isto antes evita refactorizar o `request_full_report` outra vez quando o PDF chegar.

---

## Discrepâncias e decisões

**Fonte canónica do `snapshot_id` no frontend**: o backend devolve no payload da análise (`PublicAnalysisSuccess.analysis_snapshot_id: string`). Frontend mantém em `Route` state (já existe `state.data` no `analyze.$username.tsx`); modal recebe via prop como já recebe `instagram_username` + `competitor_usernames`. Sem context global novo.

**Validação no backend**: pragmática — verificar que o snapshot existe e que o `instagram_username` da row bate certo (case-insensitive) com o submetido. Não validar concorrentes contra o snapshot porque o utilizador pode ter chegado ao gate vindo de uma análise sem `?vs=` mas o request inclui mesmo assim os mesmos handles — não é blocking. Suficiente para garantir auditoria.

**FK `ON DELETE SET NULL`** em vez de `CASCADE`: se um snapshot for limpo (futura cron de garbage collection), preferimos manter o `report_requests` com `snapshot_id = null` em vez de apagar evidência da conversão. O lead/email mantêm-se válidos para outras finalidades.

**`analysis_snapshot_id` nullable**: rows antigos não têm o link. Rows novos terão, mas backend tolera ausência (devolve erro estruturado, não 500). Modal mostra mensagem calma se faltar.

**Legacy modal sem snapshot_id**: zero rows hoje têm o campo (acabou de ser introduzido). Não há legacy real — o nullable é só por defesa de FK + futura limpeza de snapshots.

**Status do report_requests via `metadata`?** Não. Adicionar coluna dedicada é mais limpo e indexável; `metadata` permanece para flags futuras menores.

---

## Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `supabase/migrations/{ts}_link_request_to_snapshot.sql` | **Criar** — `ALTER TABLE report_requests ADD COLUMN analysis_snapshot_id uuid REFERENCES analysis_snapshots(id) ON DELETE SET NULL` + index parcial | Não |
| `src/lib/analysis/types.ts` | Editar — `PublicAnalysisSuccess.analysis_snapshot_id: string` (obrigatório nas novas responses) | Não |
| `src/lib/analysis/cache.ts` | Editar — `lookupSnapshot()` e `storeSnapshot()` devolvem `id` (já podem, é só garantir que está no select/insert returning) | Não |
| `src/routes/api/analyze-public-v1.ts` | Editar — embeber `analysis_snapshot_id` no `PublicAnalysisSuccess` (cache hit, fresh, stale) | Não |
| `src/routes/api/request-full-report.ts` | Editar — Zod aceita `analysis_snapshot_id?: string().uuid()`; valida existência + match de username; persiste no insert | Não |
| `src/components/product/public-analysis-dashboard.tsx` | Editar — passa `data.analysis_snapshot_id` para `<PremiumLockedSection>` ou directamente para o modal | Não |
| `src/components/product/premium-locked-section.tsx` | Editar — recebe `analysisSnapshotId` via prop, passa ao modal | Não |
| `src/components/product/report-gate-modal.tsx` | Editar — recebe `analysisSnapshotId` via prop, inclui no payload do submit; mostra erro calmo se backend rejeitar por snapshot inválido | Não |

**Nenhum ficheiro locked tocado.** A confirmar contra `mem://constraints/locked-files` antes de editar.

---

## Schema da migração

```sql
ALTER TABLE public.report_requests
  ADD COLUMN analysis_snapshot_id uuid
  REFERENCES public.analysis_snapshots(id) ON DELETE SET NULL;

-- Partial index — only meaningful for rows that have the link
CREATE INDEX idx_report_requests_snapshot
  ON public.report_requests (analysis_snapshot_id)
  WHERE analysis_snapshot_id IS NOT NULL;
```

Idempotente via `IF NOT EXISTS` nos comandos.

---

## Backend — fluxo do request

```
1. validate Zod payload (now includes optional analysis_snapshot_id uuid)
2. if analysis_snapshot_id present:
     SELECT id, instagram_username FROM analysis_snapshots WHERE id = $1
     if not found → return { error_code: "SNAPSHOT_NOT_FOUND", message: "Não foi possível associar o pedido à análise atual." }
     if lower(snapshot.instagram_username) !== lower(payload.instagram_username):
       return { error_code: "SNAPSHOT_MISMATCH", message: "A análise não corresponde ao perfil indicado." }
3. existing lead upsert + quota count + gate (unchanged)
4. INSERT report_requests with analysis_snapshot_id (or null)
5. existing success/last/quota response (unchanged)
```

Mensagens pt-PT calmas, sem jargão técnico, sem alerts.

---

## Frontend — passagem do id

```
analyze.$username.tsx
  └─ data.analysis_snapshot_id (string)
     └─ <PublicAnalysisDashboard data={data} />
        └─ <PremiumLockedSection analysisSnapshotId={data.analysis_snapshot_id} ... />
           └─ <ReportGateModal analysisSnapshotId={...} ... />
              └─ submit body inclui analysis_snapshot_id
```

Se `analysis_snapshot_id` faltar (cenário não esperado pós-deploy), o modal envia `undefined` → backend grava com `null`. Sem hard fail, mas log no servidor para visibilidade.

---

## Erros — copy pt-PT

| Caso | Mensagem |
|---|---|
| Snapshot não encontrado | "Não foi possível associar o pedido à análise atual. Atualizar a análise e tentar novamente." |
| Snapshot não bate com username | "A análise não corresponde ao perfil indicado." |
| Erro genérico de validação (já existe) | "Dados inválidos. Verificar os campos e tentar novamente." |

Apresentadas no modal através do estado `paywall`/erro existente — sem novo estado UI.

---

## Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem PDF / email / pagamentos / auth / IA / admin | ✅ |
| Sem novas dependências | ✅ |
| Provider só server-side | ✅ |
| Sem reanálise / re-fetch | ✅ |
| Sem secrets na UI | ✅ |
| Locked files intactos | ✅ |
| pt-PT impessoal | ✅ |
| Comentários em inglês | ✅ |
| Schema mínimo (1 coluna + 1 FK + 1 index) | ✅ |
| Future-ready (PDF/email lêem `report_requests.analysis_snapshot_id`) | ✅ |

---

## Checkpoints

- ☐ Migração adiciona `analysis_snapshot_id` + FK `ON DELETE SET NULL` + index parcial
- ☐ `PublicAnalysisSuccess.analysis_snapshot_id` exposto em todas as paths (cache/fresh/stale)
- ☐ `cache.ts` devolve `id` no lookup e no store
- ☐ Frontend propaga `snapshot_id` até ao submit do modal
- ☐ `/api/request-full-report` valida existência + match de username
- ☐ Insert em `report_requests` grava `analysis_snapshot_id`
- ☐ Erros de snapshot inválido com copy pt-PT calma no modal
- ☐ Sem PDF/email/pagamentos/auth/IA/reanálise introduzidos

