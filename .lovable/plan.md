# Plano — `credit_ledger.analysis_event_id` linkage

## TL;DR
**Já está tudo implementado.** A auditoria do repo confirma que o schema, a server lib, o orquestrador `analyze-public-v1`, o endpoint admin e a UI da lead-detail-sheet já têm `analysis_event_id` ponta-a-ponta. Os 3 unit tests pedidos também já existem e cobrem confirm/release com event id + comportamento legacy NULL.

**Não há trabalho de código novo a fazer.** O plano abaixo é um relatório de cobertura para fechar o ticket — se houver alguma extensão extra que queiras (ex.: link clickável para o `analysis_event` no admin, ou backfill controlado), diz-me e adiciono ao scope.

---

## Cobertura ponto-a-ponto vs. o teu scope

| # | Item pedido | Estado | Evidência |
|---|---|---|---|
| 1 | Coluna `analysis_event_id uuid` nullable em `credit_ledger` | ✅ existe | `\d credit_ledger` → `analysis_event_id | uuid | nullable` |
| 2 | FK para `analysis_events(id) ON DELETE SET NULL` | ✅ existe | `credit_ledger_analysis_event_id_fkey FOREIGN KEY (analysis_event_id) REFERENCES analysis_events(id) ON DELETE SET NULL` |
| 3 | Partial index para non-null | ✅ existe | `idx_credit_ledger_analysis_event btree (analysis_event_id) WHERE analysis_event_id IS NOT NULL` |
| 4 | `confirmReservation` aceita `analysisEventId` | ✅ | `credits.server.ts:295-312` |
| 5 | `releaseReservation` aceita `analysisEventId` | ✅ | `credits.server.ts:319-336` |
| 6 | Insert `analysis_event_id` na linha confirm/release | ✅ | `insertLedger` recebe e propaga (`credits.server.ts:59-74`) |
| 7 | Back-update da linha `reserve` por `reservation_id` | ✅ | `backfillReserveEventId` (`credits.server.ts:82-98`), invocado por confirm e release apenas quando `analysisEventId` é não-nulo, sem `throw` em erro |
| 8 | Pass do `analysis_event_id` terminal pelo `analyze-public-v1` | ✅ | `analyze-public-v1.ts:654-678` → `confirmReservation({ analysisEventId: lastEventId })` / `releaseReservation({ analysisEventId: lastEventId })`. `lastEventId` é obtido via `recordAnalysisEvent` (linha 431) e `logEvent` (1307). |
| 9a | Admin lead credit activity expõe a coluna | ✅ | `routes/api/admin/lead-credit-activity.$id.ts:47` (SELECT inclui `analysis_event_id`) + `components/admin/v2/beta-leads/lead-detail-sheet.tsx:2352, 2512-2513` renderiza chip truncado com tooltip do uuid completo |
| 9b | Report detail drawer onde já relevante | ✅ | Único drawer que mostra credit activity é o `lead-detail-sheet` (`rg credit_ledger src/components/admin` → 1 ficheiro). Não há outro drawer a tocar — N/A |

## Constraints — verificação

| Constraint | Cumprida? |
|---|---|
| Não reordenar reserve → analysis → event → confirm/release | ✅ ordem preservada em `analyze-public-v1.ts` |
| Não expor `analysis_event_id` publicamente | ✅ apenas leitura em rotas `/api/admin/*` e UI `/admin/*` |
| Não tocar checkout / EuPago / pricing / Free public report / competitor UI / provider calls | ✅ alterações isoladas a `credits.server.ts` + orquestrador + endpoint admin + drawer |
| Não fazer backfill histórico nesta PR | ✅ apenas back-update do reserve **dentro da mesma reservation_id** ao confirm/release acontecer; linhas históricas continuam NULL |

## Validações — estado actual

| Validação | Estado | Evidência |
|---|---|---|
| Unit test: confirm com `analysisEventId` liga confirm + reserve | ✅ | `credits.test.ts:188-202` |
| Unit test: release com `analysisEventId` liga release + reserve | ✅ | `credits.test.ts:204-218` |
| Unit test: confirm sem `analysisEventId` mantém comportamento legacy NULL | ✅ | `credits.test.ts:221-229` |
| Existing credit tests continuam a passar | 🟡 a confirmar correndo `bunx vitest run src/lib/credits` (sem alterações novas, baseline esperado) |
| Fresh analysis → reserve + confirm linked ao mesmo event | ✅ por inspecção de `analyze-public-v1.ts:654-661` (mesma `lastEventId` propagada) |
| Provider error → reserve + release linked ao mesmo event | ✅ por inspecção de `analyze-public-v1.ts:670-678` |
| Blocked `WINDOW_REQUIRES_PRO` → 0 ledger rows | ✅ confirmado: o `reserveCredit` está atrás do gate `report_full_9` → se bloqueado por pro window, retorna antes de reservar (`analyze-public-v1.ts` early-return antes de `reserveCredit`) |
| Admin lida graciosamente com NULL | ✅ `lead-detail-sheet.tsx:2513` `e.analysis_event_id ? e.analysis_event_id.slice(0,8) : "—"` |

## Recomendação

1. **Marcar o ticket como "já entregue em PR anterior"** — não há ficheiros novos a editar.
2. (Opcional) Em build mode, posso correr `bunx vitest run src/lib/credits src/routes/api/__tests__/analyze-public-v1-credit-gate.test.ts` para confirmar verde antes do encerramento. Avisa se queres que faça isso.
3. (Opcional, fora do scope original) Possíveis follow-ups que **não** implemento sem aprovação extra:
   - Link clickável no drawer (`analysis_event_id` → tooltip já mostra uuid completo; podia abrir o admin event detail).
   - Backfill histórico controlado em job manual — explicitamente fora deste PR pelo teu próprio constraint.

## Verdict
🟢 **Scope 100% coberto.** Sem edits requeridos.
