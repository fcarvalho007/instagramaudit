## Diagnóstico

Os fixes anteriores estão no sítio certo (`/api/onboarding/start` persiste o `instagram_handle`, chama `tryEnqueueReportForHandle`, RLS por `lead_id` está aplicada, `enqueueReportForHandle` existe para o fluxo `/signup`/OAuth, normalização de estados em DB). O problema é de **runtime no Cloudflare Workers**, não de lógica.

### Causa raiz

Em `src/routes/api/onboarding/start.ts` (linhas ~625-647):

```ts
const credits = await grantSessionAndCredits(upserted.leadId);
void tryEnqueueReportForHandle({ ... });   // fire-and-forget
if (upserted.isNew) {
  void sendReportAccessEmail({ ... });     // fire-and-forget
}
return json({ ok: true, ... }, 200);
```

E em `src/lib/orchestration/run-report-pipeline.ts` (linha 199):

```ts
export function runInBackground(promise, ctx?) {
  if (ctx?.waitUntil) { ctx.waitUntil(safe); return; }
  void safe;   // sem waitUntil → promessa abandonada
}
```

Nenhum caller passa um `ctx.waitUntil`. No Cloudflare Workers, depois do `return Response`, qualquer promessa pendente é terminada (a runtime fecha o I/O do request). Logo:

1. O `INSERT` em `report_requests` dentro de `tryEnqueueReportForHandle` não chega a fazer commit.
2. Mesmo que chegasse, o `runInBackground(runReportPipeline(...))` dentro de `enqueueReportForSnapshot` perde-se (sem `waitUntil`), e os relatórios ficavam para sempre em `pending`.
3. O `sendReportAccessEmail` desaparece pelo mesmo motivo (sem email de boas-vindas).

Dados confirmam: 3 leads em 7 dias, 0 `report_requests`, 0 emails enviados, 0 eventos `onboarding_auth_create_failed`.

### Inconsistências secundárias (corrigir no mesmo passo)

- **Fluxo `/signup` + Google OAuth não passa por `/api/onboarding/start`.** A única forma de gerar relatório nesses casos é o utilizador ter visitado `/analyze/$username` antes (deixa `ib:intent_handle` em `localStorage`) e depois aterrar em `/app/reports`. Se entrar diretamente, nada acontece.
- **`/app/reports`** consome `intent_handle` mas só uma vez no `useEffect` inicial. Funciona, mas só serve se o handle estiver lá.
- **`report_snapshot_id` fica sempre `null`** nas 8 linhas existentes — `ensureReportSnapshotForRequest` também é chamada fire-and-forget no caminho atual. Sintoma menor (a coluna deve ficar preenchida para imutabilidade do PDF).

## Plano de correção (P0 — fiabilidade do enqueue)

### 1. Tornar o enqueue do `report_request` síncrono em `/api/onboarding/start`

Em `handleOnboardingStart` (ramo `mode === "password"`), substituir os `void` por `await` para a parte que **cria** a linha. A pipeline (PDF + email) continua em background, mas a linha em `report_requests` passa a ficar garantidamente criada antes do `return`.

```ts
// antes do return json(...)
const enq = await tryEnqueueReportForHandle({...});  // agora awaited
if (upserted.isNew) {
  // email também awaited (rápido, ~300ms) para garantia de entrega
  await sendReportAccessEmail({...}).catch(err => console.warn(...));
}
return json({ ok: true, ... }, 200);
```

Custo: +200–500 ms no handler. Aceitável para o fluxo de signup.

### 2. Garantir que `enqueueReportForSnapshot` faz await do `INSERT` antes de devolver

Já faz (`inserted` é awaited). A única peça fire-and-forget lá dentro é `runInBackground(runReportPipeline(...))` e `ensureReportSnapshotForRequest(...)` — ver passo 3.

### 3. Disparar a pipeline de forma persistente, não via promessa solta

Duas opções, escolher uma:

**Opção A (recomendada, mais simples)** — usar `fetch` keepalive contra um endpoint interno:

- Substituir `runInBackground(runReportPipeline(reportRequestId, origin))` por:
  ```ts
  void fetch(`${origin}/api/internal/run-report-pipeline`, {
    method: "POST",
    headers: { "x-internal-token": process.env.INTERNAL_API_TOKEN!, "content-type": "application/json" },
    body: JSON.stringify({ reportRequestId, origin }),
    // keepalive: true,  // ajuda em runtimes que suportam
  });
  ```
- Criar `src/routes/api/internal/run-report-pipeline.ts` (protegido por `x-internal-token`) que apenas chama `await runReportPipeline(...)` e responde. Cloudflare honra fetches outbound iniciados antes do response (`subrequest`), porque o `subrequest` corre no isolate do worker invocado, prolongando o lifecycle.

**Opção B (mais limpa mas requer mais código)** — adicionar um worker dedicado (cron `pg_cron` a cada minuto) que apanha `report_requests` em `pending` há >30 s e processa.

Para v1 (volume baixo), proponho **Opção A**.

### 4. Backfill no `/app/reports` (rede de segurança)

Em `getUserReports` (server fn), se detectar rows em `pending` há mais de 60 s, reinvocar a pipeline (via mesmo endpoint do passo 3). Garante recuperação para qualquer linha órfã.

### 5. (P1) `ensureReportSnapshotForRequest` também awaited

Mover para dentro do `enqueueReportForSnapshot` antes do `runInBackground`, com `await`. Garante que `report_snapshot_id` fica preenchido.

## Ficheiros a tocar

- `src/routes/api/onboarding/start.ts` — trocar `void` por `await` no enqueue + email (passo 1).
- `src/lib/orchestration/enqueue-report-for-snapshot.server.ts` — substituir `runInBackground(runReportPipeline(...))` por `fetch` para `/api/internal/run-report-pipeline` + `await ensureReportSnapshotForRequest(...)` (passos 3 e 5).
- `src/routes/api/internal/run-report-pipeline.ts` — **novo**, protegido por `INTERNAL_API_TOKEN`, corre `runReportPipeline` em await (passo 3).
- `src/lib/rpc/reports.functions.ts` (`getUserReports`) — backfill defensivo (passo 4).

Nenhuma migração nova é necessária. Não toca em `LOCKED_FILES.md` (verificar antes de editar).

## Checkpoint

☐ Passo 1 aplicado (enqueue awaited em `/api/onboarding/start`)  
☐ Passo 3 aplicado (endpoint interno + `fetch` outbound substitui `runInBackground` solto)  
☐ Passo 4 aplicado (backfill em `getUserReports`)  
☐ Passo 5 aplicado (`ensureReportSnapshotForRequest` awaited)  
☐ Verificação manual: criar conta de teste → confirmar linha em `report_requests` + PDF gerado em <60 s + email entregue
