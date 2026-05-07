## Diagnóstico

- `lead-detail-sheet.tsx` já permite `failed` em `GENERATABLE_STATUSES` (linha 225).
- `beta-request-actions.tsx` NÃO permite `failed` em `canGenerate` (linha 70-71).
- `generate-beta-report.ts` NÃO permite `failed` em `ALLOWED_SOURCE_STATUSES` (linha 22) — devolve 400.

## Alterações

### 1. `src/routes/api/admin/generate-beta-report.ts`
- Linha 22: adicionar `"failed"` a `ALLOWED_SOURCE_STATUSES`.
- Linha 75-76: atualizar a mensagem de erro para incluir `failed`.

### 2. `src/components/admin/v2/beta-requests/beta-request-actions.tsx`
- Linha 70-71: adicionar `|| row.request_status === "failed"` a `canGenerate`.

### 3. Teste (novo ficheiro)
Não existem testes para este endpoint. Criar um teste simples que valida que `ALLOWED_SOURCE_STATUSES` contém os 3 estados: `approved`, `pending_review`, `failed`.

## O que NÃO muda
- Proteção admin (requireAdminSession).
- Kill switches (APIFY_ENABLED, allowlist, execution mode).
- COMMENT_SCRAPER_ENABLED=false.
- Rotas públicas.
- UI do relatório.
- Nenhuma chamada a Apify/OpenAI/DataForSEO durante implementação.

## Validação
- `bunx tsc --noEmit`
- `bunx vitest run`
- Statuses aceites finais: `approved`, `pending_review`, `failed`.
