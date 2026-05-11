## Adicionar `error_message` seguro a `report_snapshot_persist_failed`

### Objectivo

Enriquecer a metadata do evento de falha com uma mensagem técnica curta e sanitizada, mantendo `reason` como campo principal.

### Alterações em `src/lib/report-snapshots/persist-report-snapshot.server.ts`

**1. Novo helper privado `sanitizeErrorMessage(err): string`**
- Extrai apenas `err.message` (string) — ignora `err.stack`, `err.cause`, `err.toJSON`, payloads brutos.
- Remove emails: `/\S+@\S+\.\S+/g` → `[email]`
- Remove tokens longos (JWT, chaves, base64): `/[A-Za-z0-9_\-]{32,}/g` → `[token]`
- Remove caracteres de controlo / quebras de linha: substitui por espaço, colapsa whitespace.
- Strip se a string começar por `{` ou `[` (JSON bruto): devolve `"non_text_error"`.
- Trunca a **300 caracteres** com sufixo `…` quando excedido.
- Devolve `"unknown_error"` quando vazio.

**2. Estender `PersistResult`**
```ts
errorMessage?: string;
```

**3. Popular `errorMessage` nos 3 sítios de falha**
- `build_error` (catch do `buildReportSnapshotPayload`)
- `insert_error` no path 23505-sem-linha
- `insert_error` no path de erro genérico do insert

**4. Wrapper `ensureReportSnapshotForRequest`**
- Passa `error_message: result.errorMessage` à metadata do evento `report_snapshot_persist_failed` (a seguir a `reason`).
- Outer `catch` no wrapper também sanitiza `err` e devolve `errorMessage`, e emite o evento com `error_message` antes de retornar (consistência — hoje o catch não emitia evento, mas a metadata ficaria útil; **manter o comportamento actual de não emitir** do outer catch para não duplicar e manter scope mínimo). → Decisão: **só popular no `result`, não emitir extra**, para não alterar semântica de quando o evento dispara.

### Garantias

- `reason` continua a ser o campo principal e único discriminador semântico.
- Sem payloads, sem emails, sem secrets, sem JSON bruto, ≤300 chars.
- Comportamento do unlock/request inalterado (continua não-bloqueante, fail-soft).
- Sem chamadas a providers.
- `missing_analysis_snapshot` continua sem emitir evento (caso esperado).

### Testes (`__tests__/persist-report-snapshot.test.ts`)

Adicionar 2 casos novos (não tocar nos existentes):

1. **`emite report_snapshot_persist_failed com error_message sanitizado e truncado`**
   - Forçar `insertResult.error = { message: "X".repeat(500) + " user@example.com token=abc...32+" }`.
   - Assertir que o evento contém `metadata.error_message`, comprimento ≤ 300, sem `@`, sem `[A-Za-z0-9_\-]{32,}`.

2. **`error_message é "unknown_error" quando err é vazio/non-text`**
   - Forçar `insertResult.error = { message: "" }` ou `{ message: "{secret:'a'}" }` → `"non_text_error"` ou `"unknown_error"`.

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run src/lib/report-snapshots`
- `bunx vitest run`

### Out of scope

- Não tocar em call sites (`unlock.server.ts`, `request-full-report.ts`, `generate-beta-report.ts`).
- Não emitir eventos novos.
- Não mudar schema, providers, emails, retention, cleanup.
