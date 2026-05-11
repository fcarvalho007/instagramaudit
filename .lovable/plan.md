## Abrir relatório histórico pelo snapshot exacto

### Estratégia de URL

**Escolhida: nova rota pública dedicada `/reports/$snapshotId`.**

Razões:
- `analyze.$username.tsx` está em `LOCKED_FILES.md` (pre-beta lock). Não tocar.
- Há já um endpoint pronto (`/api/public/analysis-snapshot/by-id/$snapshotId`) que devolve o payload imutável por UUID e que `/report/print/$snapshotId` já consome.
- URL semântica e partilhável; não polui search params do `/analyze`.
- Fluxo isolado: zero chamada a `fetchPublicAnalysis` → garante que **nenhum provider** é invocado ao abrir histórico.

Alternativa rejeitada: `/analyze/$username?snapshot=<id>` — exigia editar ficheiro locked + branch condicional no pipeline público.

### Auditoria do estado actual

| Sítio | Comportamento hoje | Problema |
|---|---|---|
| `app.reports.tsx` "Abrir relatório" | `<Link to="/analyze/$username" params={{ username }}>` | Carrega snapshot mais recente; dispara pipeline público |
| `app.reports.$id.tsx` "Abrir relatório" | mesmo `<Link to="/analyze/$username">` | Idem |
| `app.reports.tsx` UI | Sem expiry, sem dias restantes, sem badge "Expirado" | Falta sinal de retenção 15d |

---

## Plano

### Passo 1 — Nova rota pública `src/routes/reports.$snapshotId.tsx`

- `createFileRoute("/reports/$snapshotId")`, SSR off, `noindex` (privado-ish; não queremos indexar).
- `useEffect` único: `fetch("/api/public/analysis-snapshot/by-id/" + snapshotId)`.
- Estados:
  - `loading` → `<AnalysisSkeleton />`.
  - `404 / SNAPSHOT_NOT_FOUND` ou `INVALID_SNAPSHOT_ID` → empty state com CTA "Analisar novo perfil" → `/`.
  - `expired` (calculado via `isReportExpired(snapshot.expires_at)`; fallback `getReportExpiresAt(snapshot.created_at)` se a coluna estiver nula) → empty state "Relatório expirado" + `formatRetentionMessage()` + CTA "Gerar novo relatório" → `/`.
  - `ready` → `<ReportShellV2 result snapshotId payload analyzedAtIso expiresAtIso variant="public_mvp" />` (mesmo render que o admin preview por snapshot).
- `head()`: `noindex, nofollow`. Título "Relatório · @{handle} · InstaBench".
- **Não** chama `fetchPublicAnalysis`. **Não** escreve na BD.

### Passo 2 — Atualizar `app.reports.tsx`

- Estender `UserReport` consumido (já tem `analysisSnapshotId` + `createdAt`).
- Helper local `deriveRetention(createdAt)`:
  - `expiresAt = getReportExpiresAt(createdAt)`
  - `expired = isReportExpired(expiresAt)`
  - `daysLeft = Math.max(0, ceil((expires - now)/dia))`
  - `state: "available" | "expiring" | "expired"` (expiring = `daysLeft <= 3 && !expired`)
- Novo `RetentionBadge`:
  - "Disponível" (verde) | "Expira em X dias" (âmbar, se `daysLeft <= 3`) | "Expirado" (cinza).
- No `ReportCard`:
  - Adicionar linha de metadata: `Gerado a {data} · Expira a {data} · {RetentionBadge}`.
  - Substituir `<Link to="/analyze/$username">` por **`<Link to="/reports/$snapshotId">`** quando `hasSnapshot && !expired`.
  - Quando `expired`: substituir por botão `disabled` com label "Expirado — gerar novo" e tooltip via `formatRetentionMessage()`.
  - Quando `!hasSnapshot`: estado actual (esconder CTA).

### Passo 3 — Atualizar `app.reports.$id.tsx`

- Idem helper `deriveRetention`.
- No bloco "Relatório web":
  - Substituir `<Link to="/analyze/$username">` por `<Link to="/reports/$snapshotId">` quando `hasSnapshot && !expired`.
  - Se `expired`: secção mostra `RetentionBadge` "Expirado" + `formatRetentionMessage()` + CTA "Analisar novo perfil" → `/`.
- Adicionar pequeno bloco de retenção no header card (data geração + expiry + dias restantes + badge).

### Passo 4 — Constrangimentos respeitados

- `analyze.$username.tsx` (locked) **não** tocado.
- Sem migrações de schema.
- Sem chamadas a Apify / OpenAI / DataForSEO (a rota nova só `SELECT` na BD via endpoint existente).
- Sem mexer em Brevo/Resend.
- Sem refactor de routing — uma rota nova, dois ficheiros editados.
- Sem alterar cálculos do relatório (reusa `snapshotToReportData`).

### Passo 5 — Caveat técnica documentada (no docstring do novo route)

`analysis_snapshots` faz upsert por `cache_key`. Carregar por UUID é a melhor garantia disponível dentro das restrições actuais e é estável dentro da janela de 15d (nova retenção alinhada). Cloning per-report-request fica fora de scope desta fase — pode ser feito num passo futuro se exigirem imutabilidade absoluta.

### Passo 6 — Testes

- `bunx tsc --noEmit`.
- `bunx vitest run` — sanity, nenhum dos novos componentes muda a lógica testada.
- Smoke manual:
  1. Criar relatório A → abrir via `/app/reports` → carrega `/reports/$snapshotId` → ver `expires_at` em ~15d.
  2. Criar relatório B (handle diferente) → confirmar que abrir A continua a mostrar dados de A.
  3. Forçar `expired` no DevTools (mock `Date.now()` ou edit `created_at` via DB) → confirmar empty state "Expirado".
  4. Network tab: zero requests para `/api/analyze/*`.

---

## Ficheiros tocados

- **Novo:** `src/routes/reports.$snapshotId.tsx` (~150 linhas)
- **Editado:** `src/routes/app.reports.tsx` — `RetentionBadge`, link target, metadata expiry
- **Editado:** `src/routes/app.reports.$id.tsx` — link target, bloco retenção
- (Implícito) `src/routeTree.gen.ts` regenerado pelo plugin

## Checkpoints

- ☐ Rota nova `/reports/$snapshotId` carrega snapshot por UUID, sem providers
- ☐ Estado `expired` mostra empty state + CTA, **não** carrega o relatório
- ☐ `/app/reports` aponta para `/reports/$snapshotId` em vez de `/analyze/$username`
- ☐ `/app/reports/$id` aponta para `/reports/$snapshotId`
- ☐ `RetentionBadge` (Disponível / Expira em X dias / Expirado) presente em `/app/reports` e detalhe
- ☐ `analyze.$username.tsx` intocado (locked)
- ☐ `tsc --noEmit` + `vitest run` verdes
