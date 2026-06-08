
# Auditoria — Ciclo de vida da análise Pro 30d/90d

Investigação read-only completa. Cada conclusão tem citação `file:line` no relatório do subagente (deep audit já anexado ao histórico desta sessão).

---

## 1. Tabela PASS / PARTIAL / FAIL

| # | Área | Verificação | Verdict | Evidência |
|---|---|---|---|---|
| 1.1 | UI/UX | Selector ativo de 30d/90d para utilizador Pro | **FAIL** | `analysis-period-selector.tsx:37` — componente é "puramente apresentacional, MUST NOT mutate", botões só abrem upsell |
| 1.2 | UI/UX | Modal de confirmação explícito "1 crédito vai ser consumido" para período | **FAIL** | `consume-credit-dialog.tsx:254` — para `kind:"period"` o botão Confirm é suprimido (`isPeriod ? null : Button`), copy usa keys `period_coming_soon_*` |
| 1.3 | UI/UX | Modal diferencia cache-hit (0 cr) vs cache-miss (1 cr) | **FAIL** | Sem qualquer pré-cheque de cache no cliente; backend só decide após receber o pedido |
| 1.4 | UI/UX | Aviso "novos dados podem ser obtidos" | **FAIL** | Não existe em lado nenhum da UI |
| 1.5 | UI/UX | Fluxo competitor (controlo) | **PASS** | `consume-credit-dialog.tsx:209-224` — "Usar 1 crédito" + saldo + badge beta |
| 2.1 | Créditos | 30d 1ª execução debita 1 crédito | **PASS** | `analyze-public-v1.ts:604` `reserveCredit()` → `credits.server.ts:232-238` delta=-1 |
| 2.2 | Créditos | 30d repetição (cache hit) = 0 créditos | **PASS** | `analyze-public-v1.ts:601` `cacheFreshHit && alreadyAssociated → skipReserve=true` |
| 2.3 | Créditos | 90d 1ª execução debita 1 crédito | **PASS** | `isWideWindow()` cobre 30d e 90d (`window-configs.ts:81-83`); mesmo caminho |
| 2.4 | Créditos | Cache separada por janela | **PASS** | `cache.ts:49-59` `windowCacheSuffix` → `:w=30d` / `:w=90d` |
| 2.5 | Créditos | Gate Pro antes do reserve | **PASS** | `analyze-public-v1.ts:585-598` `WINDOW_REQUIRES_PRO` retorna 403 antes de qualquer débito |
| 3.1 | Providers | Apify só em cache miss | **PASS** | `analyze-public-v1.ts:685-714` cache hit retorna antes de `fetchProfileWithPostsLogged` (linha 998) |
| 3.2 | Providers | Competidores ficam em baseline mesmo em pedido 30d/90d | **PASS** | `analyze-public-v1.ts:995-1006` comentário "Competitors stay on baseline by design" |
| 3.3 | Providers | OpenAI não re-disparada por mudança de janela | **PASS** | Enrichment é assíncrono via `enrichment_jobs`/`run-enrichment.server.ts`; endpoint público não chama OpenAI |
| 3.4 | Providers | DataForSEO não re-disparada | **PASS** | `analyze-public-v1.ts:1197-1203` "Reuse cached summary…Fresh DFS now async" |
| 4.1 | Admin | Tabela de análises com handle + janela + timestamp | **FAIL** | `admin.relatorios.tsx` não expõe `analysis_window` em coluna alguma |
| 4.2 | Admin | Saldo + consumo + restante por lead | **PARTIAL** | Lead detail sheet (`beta-leads/lead-detail-sheet.tsx:754-758`) mostra `credits_remaining/granted` agregado, sem drill-down do `credit_ledger` |
| 4.3 | Admin | Tipo de análise distinguível (baseline/30d/90d/competitor) | **FAIL** | Nenhuma superfície admin mostra `analysis_window` |
| 4.4 | Admin | Drill-down por evento: cache vs fresh, provider, custo | **PARTIAL** | `/admin/sistema` mostra últimos 20 `provider_call_logs` agregados, sem ligação ao evento nem à janela |
| 4.5 | Admin | `analysis_events.cache_key` / `data_source` / `competitor_handles` visíveis | **FAIL** | Nenhum admin UI lê esses campos |
| 5.1 | Modelo | `analysis_events.analysis_window` existe e é populado | **PASS** | Coluna confirmada via `information_schema`; `events.ts:82` escreve `p_analysis_window` |
| 5.2 | Modelo | `analysis_events ↔ provider_call_logs` (FK) | **PASS** | `provider_call_logs.analysis_event_id` FK confirmado |
| 5.3 | Modelo | `analysis_events ↔ analysis_snapshots` (FK) | **PASS** | `analysis_events.analysis_snapshot_id` confirmado |
| 5.4 | Modelo | `credit_ledger ↔ analysis_events` link directo | **FAIL** | `credit_ledger` tem `analysis_snapshot_id`, `cache_key`, `handle`, `reservation_id`, mas **não tem `analysis_event_id`**. Link é inferencial via `(lead_id, cache_key, snapshot_id)` |
| 5.5 | Modelo | Janela legível no snapshot | **PARTIAL** | `analysis_snapshots` não tem coluna `analysis_window`; tem de se inferir pelo sufixo `:w=30d` do `cache_key` |
| 6.1 | Flags | Feature flag separada para 90d | **NONE** | Sem `WINDOW_90D_ENABLED`, sem chave `app_config`; 90d e 30d controlados pela mesma `isWideWindow()` + entitlement `report_full_9` |

---

## 2. Veredicto consolidado

### O que está sólido (backend PR1)
- Gate Pro, separação de cache, débito/devolução de crédito por janela, gating de providers — todos validados.
- O modelo permite reconstruir o caminho técnico (event → snapshot → provider log) excepto o salto event → credit.

### O que está em falta para lançar 30d/90d ao utilizador
1. **UI não dispara janelas Pro**. O backend está pronto mas `AnalysisPeriodSelector` é só upsell e `ConsumeCreditDialog` suprime o botão Confirm para `kind:"period"` (copy `coming_soon`). Sem desbloquear isso, nem 30d nem 90d são acessíveis pela UI.
2. **Confirmação explícita do crédito ausente**. Não há mensagem "vai consumir 1 crédito" nem pré-cheque de cache para mostrar "0 créditos (em cache)".
3. **Admin cego à janela**. Não há nenhuma coluna `analysis_window` em qualquer tabela admin. Impossível responder "quantos 30d foram pedidos hoje?" sem SQL ad-hoc.
4. **Sem drill-down de créditos por evento**. Só se vê saldo agregado, não o histórico ledger por lead nem o evento que originou cada débito.
5. **Falta FK `credit_ledger.analysis_event_id`**. Reconstrução fica frágil (depende de `cache_key + timestamp`).

---

## 3. Itens em falta na visibilidade admin

| Falta | Onde devia aparecer | Esforço |
|---|---|---|
| Coluna `Janela` em `/admin/relatorios` (Baseline / 30d / 90d / Competitor) | `reports-table-section.tsx` + query | S |
| Filtro por janela em `/admin/relatorios` | mesmo | S |
| Coluna `data_source` (fresh / cache / stale) e `cache_key` em `/admin/relatorios` | mesmo | S |
| Drill-down ledger por lead em `lead-detail-sheet.tsx` (lista de `credit_ledger` rows com data, delta, razão, snapshot, handle) | beta-leads sheet | M |
| Tab "Análises" no lead detail: `analysis_events` filtrados por lead (handle, janela, source, custo, snapshot) | beta-leads sheet | M |
| KPI por janela em `/admin/sistema` (30d hoje / 90d hoje / baseline hoje) | sistema cockpit | S |
| Coluna `analysis_window` no último-20 `provider_call_logs` (já há FK `analysis_event_id`) | `costs-detail-section.tsx` + query JOIN | S |
| Vista "Customer journey" por lead (timeline: lead → entitlement → events com janela → ledger rows → snapshots) | nova rota `admin.lead.$id.journey` | L |

---

## 4. Prompts recomendados (executar pela ordem)

### Prompt A — Tornar `analysis_window` visível em todo o admin (sem schema)
> Em Plan Mode primeiro. Tornar a janela de análise visível em todas as superfícies admin existentes, sem schema novo.
> Tocar apenas:
> - `src/lib/admin/system-queries.server.ts` (JOIN `provider_call_logs.analysis_event_id → analysis_events.analysis_window`)
> - `src/components/admin/v2/sistema/costs-detail-section.tsx` (nova coluna "Janela")
> - `src/components/admin/v2/relatorios/reports-table-section.tsx` (nova coluna "Janela" + filtro)
> Sem providers, sem créditos, sem schema, sem alterar Free/Public.

### Prompt B — Drill-down ledger + análises no lead sheet
> Em Plan Mode primeiro. No `lead-detail-sheet.tsx` da beta-leads, adicionar duas tabs:
> 1) "Créditos" — listar `credit_ledger` por `lead_id` com colunas: data, delta, reason, handle, cache_key (truncado), snapshot link.
> 2) "Análises" — listar `analysis_events` por handle do lead com colunas: data, handle, janela, data_source, outcome, custo, snapshot link.
> Server fns novas em `src/lib/admin/*.functions.ts` com `requireSupabaseAuth` + check admin. Sem schema novo.

### Prompt C — KPIs por janela no cockpit `/admin/sistema`
> Em Plan Mode primeiro. Adicionar 3 KPI tiles ao topo do `costs-detail-section.tsx`: "30d hoje", "90d hoje", "Baseline hoje" (count + custo estimado) com base em `analysis_events.analysis_window` + `created_at::date = today`. Sem schema.

### Prompt D — UI Pro para activar 30d/90d (sem créditos a debitar até confirmação explícita)
> Em Plan Mode primeiro. Activar selector 30d/90d para utilizadores com entitlement `report_full_9`:
> 1) `AnalysisPeriodSelector` ganha modo "active" quando `hasProEntitlement`, click chama `onSelectWindow(days)`.
> 2) `ConsumeCreditDialog` para `kind:"period"`: remover supressão do Confirm; copy explícita "Esta análise vai consumir 1 crédito. Se já existir uma análise recente desta janela em cache, o crédito não é cobrado." + saldo actual.
> 3) `onConfirm` chama o endpoint `/api/analyze-public-v1` com `window=30d|90d`. Sem novos providers, sem schema.

### Prompt E — Migração: `credit_ledger.analysis_event_id`
> Em Plan Mode primeiro. Adicionar coluna `analysis_event_id uuid REFERENCES analysis_events(id)` em `credit_ledger` (nullable, para back-compat). Atualizar `reserveCredit` e `confirmReservation` em `credits.server.ts` para gravar `analysis_event_id` quando disponível. Backfill nulo para linhas antigas. Manter inferência por cache_key como fallback.

### Prompt F — Vista "Customer journey" por lead (opcional, depois de B/E)
> Em Plan Mode primeiro. Nova rota `admin/lead.$id.journey` com timeline cronológica: entitlement granted → analysis_event (com janela) → provider_call_log → credit_ledger reserve/confirm/release → snapshot. Read-only.

---

## 5. 90d precisa de validação runtime separada antes de lançar?

**Sim — recomendado.** Backend está estruturalmente idêntico a 30d (mesma `isWideWindow`, mesmo `windowCacheSuffix`, mesma config em `window-configs.ts:62-70` com `resultsLimit:300` e `onlyPostsNewerThan:"90 days"`), mas a validação PR1 cobriu apenas 30d. Diferenças concretas que justificam um runtime check próprio:

- `resultsLimit=300` para 90d (vs 100 baseline / 150 30d) → maior duração Apify, maior risco de timeout, **custo unitário ≠ 30d**.
- Filtro `onlyPostsNewerThan:"90 days"` aplicado client-side em `analyze-public-v1.ts:1067-1068` precisa de ser confirmado em produção (em snapshot real com 90+ dias de posts).
- `APIFY_HARD_CAP_USD` e estimativas em `provider_call_logs.estimated_cost_usd` para 90d precisam de baseline empírica para alertas de custo.

Checklist mínimo de validação 90d antes de abrir ao utilizador:
1. Primeira execução 90d num handle não cacheado → confirmar 1 crédito debitado, `analysis_window='90d'` gravado, `provider_call_logs` com custo > custo médio 30d.
2. Repetição imediata → cache hit, 0 créditos.
3. Janela 30d e 90d para o mesmo handle → 2 snapshots distintos com `cache_key` diferentes, ambos válidos em paralelo.
4. Comportamento sob `APIFY_HARD_CAP_USD` atingido → degrada como 30d (mesmo erro/handling).
5. Cleanup de snapshot expirado (`expires_at`) por janela funciona igual.

---

## 6. Ordem sugerida de execução

1. **Prompt A** (janela visível em admin) — desbloqueia QA do PR1 sem mexer em UI utilizador.
2. **Validação runtime 90d** conforme checklist da secção 5 (admin pode usar bypass interno ou um lead de teste com entitlement).
3. **Prompt C** (KPIs por janela) — diagnóstico operacional.
4. **Prompt B** (drill-down lead) — base para suporte a clientes Pro.
5. **Prompt E** (migração FK) — torna a reconstrução robusta antes do volume crescer.
6. **Prompt D** (UI Pro) — só depois de A+B+C+E para abrir 30d/90d com observabilidade completa.
7. **Prompt F** (journey timeline) — quando houver volume suficiente para justificar.
