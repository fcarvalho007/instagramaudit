
# Auditoria Pro 30d/90d — pós-PR1 + PR2

## 1. PASS / FAIL

| # | Critério | Verdict | Evidência |
|---|---|---|---|
| 1a | 30d/90d clicáveis para Pro | **FAIL** | `analysis-period-selector.tsx:107` — chip premium tem `aria-disabled="true"` hardcoded; abre Popover de lock independentemente do `entitlement`. Não existe ramo Pro. |
| 1b | 30d/90d ainda locked para Free | **PASS** (por acidente) | Mesmo caminho que (1a) — locked para todos, logo Free vê locked. |
| 2a | Aviso "1 crédito será consumido" no clique Pro | **FAIL** | `consume-credit-dialog.tsx:88-94` — para `intent.kind === "period"` mostra título `period_coming_soon_title` ("Janela personalizada em preparação") e body `period_coming_soon_body` ("ainda não está disponível nesta versão beta… sem custo de crédito"). |
| 2b | Modal explica nova análise | **FAIL** | Mesmo motivo — copy é "em preparação", não "nova análise". |
| 2c | Saldo de créditos mostrado | **PARTIAL** | Bloco de saldo existe (`consume-credit-dialog.tsx:228-237`) mas só renderiza no caso `period` informativo; sem CTA não é actionable. |
| 2d | Saldo 0 bloqueia antes da chamada | **N/A** | Não há chamada para bloquear — não existe path Pro. |
| 3a | Frontend envia `window: "30d"\|"90d"` | **FAIL** | Nenhum call site no codebase. `rg "window:\s*[\"']30d"` em `src/` retorna 0 ocorrências fora de testes/i18n. `ConsumeCreditDialog` para `period` renderiza `null` no slot do Confirm (`consume-credit-dialog.tsx:254` `isPeriod ? null`). |
| 3b | Backend usa cache key correta | **PASS** (validado em PR1) | `src/lib/analysis/cache.ts:57` — sufixo `:w=30d`/`:w=90d` aplicado. Bloqueado: ninguém invoca. |
| 3c | Primeira geração consome 1 crédito | **PASS backend / inalcançável UI** | Validado em `analyze-public-v1-credit-gate.test.ts`. Sem path UI. |
| 3d | Repetição usa cache, 0 créditos | **PASS backend / inalcançável UI** | Idem. |
| 4a | Título/sample muda para "Últimos 30/90 dias" | **PASS (snapshot-side)** | `snapshot-to-report-data.ts:1517-1546` — override completo de `windowLabel`/`kpiSubtitle`/`sampleCaption`/`temporalLabel`/`topPostsSubtitle` quando `analysis_window !== "baseline"`. Coberto por `snapshot-window.test.ts`. |
| 4b | Captions não implicam baseline em janela seleccionada | **PASS** | Mesmo bloco acima — overrides byte-a-byte; baseline preservado em fallback. |
| 5a | Janela visível/derivável em admin | **FAIL** | `rg "analysis_window"` em `src/components/admin/v2/` e `src/routes/admin.*` retorna 0 ocorrências. O campo é gravado em `analysis_events.analysis_window` (RPC `record_analysis_event` aceita `p_analysis_window`, `lib/analysis/events.ts:82`) mas nenhuma tabela/coluna admin o mostra. Toda a copy "janela" em `admin.relatorios` refere-se ao filtro temporal de período, não ao window da análise. |
| 5b | Créditos por análise visíveis/trace | **PARTIAL** | `credit_ledger` existe (tabela com 10 colunas) mas não tem FK para `analysis_events`. Reconstrução requer join por `lead_id` + `created_at` window — inferencial, não determinístico. Ledger não está exposto em admin lead detail (confirmado em auditoria anterior). |
| 5c | analysis_events + credit_ledger + provider_call_logs reconstroem jornada | **PARTIAL** | Possível por handle+timestamp em SQL ad-hoc. Sem timeline admin nem `analysis_event_id` no ledger, não há UI que o faça. |

**Resultado:** 3 PASS · 2 PARTIAL · 8 FAIL · 1 N/A. Os FAIL concentram-se todos na camada de UI Pro — backend está sólido.

---

## 2. Blockers exactos

1. **`AnalysisPeriodSelector` é presentational-only** — `src/components/report-redesign/v2/analysis-period-selector.tsx:104-156`. Não recebe `entitlement`/`isPro`, não tem branch `if (isPro)`, não chama `onSelectPeriod`. Todo o clique vai para `PremiumInterestDialog` via `handlePremiumAccessClick`.
2. **`ConsumeCreditDialog` para `period` está em modo "coming soon"** — `consume-credit-dialog.tsx:88-94, 228-237, 254`. Footer omite o Confirm; copy nega o consumo de crédito.
3. **Não existe handler `onConfirm({ kind: "period", days })` em lado nenhum** — `rg "kind:\s*\"period\""` mostra apenas as definições de tipo e a renderização do modal informativo; não há call site real.
4. **Sem cliente HTTP para `/api/analyze-public-v1` com `window`** — qualquer uso actual omite `window`, defaultando a baseline.
5. **Admin sem coluna/badge `analysis_window`** — `reports-table-section`, `lead-detail-sheet`, `system cost queries` ignoram o campo. Operação não consegue distinguir snapshots baseline de 30d/90d sem entrar em `analysis_snapshots.normalized_payload`.
6. **`credit_ledger` sem `analysis_event_id`** — schema não liga ledger a evento; auditoria de "este crédito pagou esta análise" é inferencial.

---

## 3. Precisamos de PR3 para a UX do Pro period selector?

**Sim — bloqueante para lançamento.** Sem PR3, a entitlement Pro não tem efeito visível no relatório: o utilizador paga, vê os mesmos chips locked, e a única acção possível é o popover de "Custom window in preparation". O backend (PR1 + PR2) está disponível mas inalcançável.

PR3 deve cobrir, em ordem:

### PR3.A — Pro UI activation (frontend-only, sem schema)
**Ficheiros:**
- `src/components/report-redesign/v2/analysis-period-selector.tsx`
- `src/components/report-redesign/v2/consume-credit-dialog.tsx`
- (consumer wrapper) — provavelmente `report-block-nav.tsx` ou parent que monta o selector + dialog

**Mudanças mínimas:**
1. `AnalysisPeriodSelector` aceita props novas: `{ isPro: boolean; currentWindow: "baseline"|"30d"|"90d"; onSelectPeriod: (days: 30|90) => void }`. Quando `isPro && PREMIUM_WINDOWS.includes(days)`, renderiza chip clicável activo (mesmo visual do `active_sample` quando `currentWindow === ${days}d`), não Popover de lock.
2. Restringir `PREMIUM_WINDOWS` ao set realmente suportado pelo backend: `[30, 90]`. `60` e `365` continuam locked-only (não suportados em `analyze-public-v1`).
3. `ConsumeCreditDialog` para `intent.kind === "period"` passa a usar copy real:
   - `title`: "Gerar análise dos últimos {{days}} dias"
   - `body`: "Vai consumir 1 crédito Pro e gerar uma nova análise com a janela selecionada. Análises repetidas com a mesma janela usam cache e não consomem créditos."
   - mostrar saldo (já existe), badge "1 crédito" e CTA Confirm
   - `hasCredit === false` → empty state já existente (`empty_title`/`empty_body`/`empty_cta`)
4. Wrapper monta handler `onConfirm({ kind: "period", days })` que chama `/api/analyze-public-v1` com `{ handle, window: "${days}d" }`, mostra toast/loading e re-fetcha o snapshot.

**Validação:** unit tests em `analysis-period-selector` (Pro vs Free), e2e manual em `?variant=pro_preview` com 30d → 1 crédito → re-clique 30d → 0 créditos.

### PR3.B — Admin visibility (`analysis_window`)
**Ficheiros:**
- `src/components/admin/v2/relatorios/reports-table-section.tsx`
- `src/components/admin/v2/visao-geral/*` (KPI tiles)
- `src/routes/admin.relatorios.tsx` (server fns que querem `analysis_events`)

**Mudanças:**
1. Adicionar coluna "Janela" na reports table com badge `baseline`/`30d`/`90d` (cores neutras, accent para non-baseline).
2. KPI tile em `/admin/sistema` ou `/admin/visao-geral`: "Análises por janela (baseline / 30d / 90d)" agregado a partir de `analysis_events.analysis_window`.
3. Server fn admin que devolve eventos passa a expôr `analysis_window` no select.

### PR3.C — Lead journey (`analysis_event_id` no ledger)
**Migration:**
```sql
ALTER TABLE public.credit_ledger
  ADD COLUMN analysis_event_id uuid REFERENCES public.analysis_events(id);
CREATE INDEX idx_credit_ledger_analysis_event_id ON public.credit_ledger(analysis_event_id);
```
**Backfill:** opcional — heurística por `lead_id + created_at ±5s` para histórico beta.
**App code:** no caller que insere `credit_ledger` no `analyze-public-v1`, passar `analysis_event_id` na mesma transacção (o evento já é criado antes do debit).
**Admin:** lead detail sheet ganha tab "Créditos" + "Análises" cross-linked por este FK.

PR3.A é a única **bloqueante de lançamento Pro**. PR3.B e PR3.C podem ir num release seguinte mas devem entrar antes de abrir Pro a utilizadores externos.

---

## 4. Validação 90d antes de PR3.A?

**Sim, runtime smoke test do 90d antes de PR3.A.** Recomendado porque:
- PR1 só validou 30d em runtime real.
- 90d usa `resultsLimit: 300` (vs 150 em 30d) → maior tempo de execução Apify e custo por run.
- Risco de timeout ou cap (`APIFY_DAILY_CAP_USD`, `APIFY_HARD_CAP_USD`) atingido se múltiplas análises Pro 90d arrancarem em sequência.

Smoke test mínimo (sem UI, via curl direto):
```
POST /api/analyze-public-v1
{ "handle": "<test_handle>", "window": "90d" }
```
Confirmar: duração < timeout, custo registado, cache key `:w=90d`, snapshot persiste com `analysis_window: "90d"`. Repetir para validar cache hit.

---

## 5. Plano de implementação consolidado

Se aprovado, executar em build mode na seguinte ordem:

1. **Smoke test 90d** (não-código; apenas validar runtime) — gate antes de tocar UI.
2. **PR3.A** — Pro UI activation (selector + dialog + handler). Sem schema. Publishable atrás de feature flag se quiser canary.
3. **PR3.B** — Admin window visibility (badge + KPI tile). Sem schema.
4. **PR3.C** — Migration `credit_ledger.analysis_event_id` + backfill + lead journey UI.

Sem PR3.A não há "Pro 30d/90d" para o utilizador final, mesmo que entitlements e backend estejam prontos.
