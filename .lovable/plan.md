## Política de retenção de 15 dias — relatórios + snapshots

### Estado actual (descobertas)

- `src/lib/analysis/cache.ts`:
  - `CACHE_TTL_MS = 24h` ← snapshots expiram em 24h
  - `STALE_TOLERANCE_MS = 7d` ← fallback "stale" em caso de falha do provider
  - `storeSnapshot` escreve `expires_at = now + CACHE_TTL_MS` na tabela `analysis_snapshots`
  - `isFresh(snapshot)` baseia-se em `expires_at`
- `src/components/report-redesign/v2/cache-status-badge.tsx`:
  - `ttlHours = 24` (default)
  - Hardcode `24 * 60 * 60 * 1000` em `computeCacheStatus` para o ramo "sem expires"
- `src/lib/email/report-email-template.ts`: `SIGNED_URL_TTL_DAYS = 7` (storage do PDF — não é retenção do relatório, é TTL do signed URL; **fora de scope**)
- `report_requests`: **não tem coluna `expires_at`**. O esquema actual:
  - `created_at`, `pdf_generated_at`, `delivery_status`, `request_status`. Retenção é derivada de `created_at`.
- Sem schema migration: a expiry pode ser **calculada on-the-fly** a partir de `created_at + 15d`. Cumpre a restrição "não apagar dados".
- Consumidores de `isFresh`/`isWithinStaleWindow`: `routes/api/analyze-public-v1.ts` (4 sítios) e `routes/api/admin/diagnostics.ts`.

### O que muda

**Constante única**: 24h → 15 dias para snapshots. `STALE_TOLERANCE_MS` (7d) torna-se redundante (já < retenção); mantemos a função `isWithinStaleWindow` mas agora alinhada à mesma janela de retenção. O distinct entre "fresh enough to avoid provider call" vs "available as historical report" fica documentado mas, **por agora**, ambos são 15d (mesmo valor) — separação semântica mantida no código.

---

## Plano

### Passo 1 — Criar módulo central `src/lib/report/retention.ts`

```ts
/** Período em que um relatório gerado permanece acessível ao utilizador. */
export const REPORT_RETENTION_DAYS = 15;

/**
 * TTL do snapshot de cache: enquanto fresco, evita uma nova chamada ao
 * provider (Apify). Mantido separado de REPORT_RETENTION_DAYS para
 * permitir divergência futura (ex.: cache curta + retenção longa), mas
 * hoje partilham o mesmo valor.
 */
export const CACHE_TTL_DAYS = REPORT_RETENTION_DAYS;

export const REPORT_RETENTION_MS = REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

export function getReportExpiresAt(createdAt: string | Date): Date { ... }
export function isReportExpired(
  expiresAt: string | Date | null,
  now?: Date,
): boolean { ... }
/** Mensagem human-readable usada em UIs vazias / banners. */
export function formatRetentionMessage(): string {
  return `Os relatórios ficam disponíveis durante ${REPORT_RETENTION_DAYS} dias após a geração.`;
}
```

Pure module, sem dependências de Supabase ou React — testável directamente.

### Passo 2 — Actualizar `src/lib/analysis/cache.ts`

- Remover constantes locais `CACHE_TTL_MS = 24h` e `STALE_TOLERANCE_MS = 7d`.
- Re-exportar `CACHE_TTL_MS` a partir de `@/lib/report/retention` (mantém API publicada para consumidores existentes).
- `STALE_TOLERANCE_MS`: alinhar com `REPORT_RETENTION_MS` (15d) e adicionar comentário a explicar que com retenção alargada deixa de ser uma janela distinta. `isWithinStaleWindow` continua a existir para back-compat mas devolve sempre `true` enquanto o snapshot estiver dentro da retenção (efectivamente igual a `isFresh`).
- `storeSnapshot` → continua a escrever `expires_at = now + CACHE_TTL_MS` (que agora é 15d).

### Passo 3 — Actualizar `cache-status-badge.tsx`

- `ttlHours = 24` → default a `REPORT_RETENTION_DAYS * 24`.
- `warnWithinHours = 6` → manter (≈ último 1/60 da janela é razoável; opcionalmente subir para 24h dado que a janela é 15d). **Decisão:** subir para 24h (último dia) — coerente com retenção mais longa.
- Em `computeCacheStatus`, substituir literal `24 * 60 * 60 * 1000` por import de `REPORT_RETENTION_MS`.
- Pequena revisão de copy nos tooltips se necessário.

### Passo 4 — Snapshots de teste e admin previews

- `test-profiles-card.tsx` e `admin.report-preview.*` apenas leem `expires_at`. Como o snapshot passa a ter retenção de 15d por defeito, **não precisam de override**.
- Actualizar comentário no topo do `cache.ts` para reflectir novo TTL.

### Passo 5 — Marcar relatórios expirados na UI (sem apagar)

- `report_requests` não tem `expires_at` na BD. Helpers do módulo de retenção calculam a partir de `created_at`:
  - Quando o admin lista relatórios (panel `reports-panel.tsx`) ou histórico, derivar `expires_at = getReportExpiresAt(created_at)`.
  - Mostrar badge "Expirado" via `isReportExpired`.
- Para já, **não bloqueamos acesso** a snapshots/reports expirados — apenas marcamos. Isto preserva referências e permite cleanup futuro num passo dedicado.

### Passo 6 — Testes (Vitest)

Criar `src/lib/report/__tests__/retention.test.ts`:
- `getReportExpiresAt(now)` devolve `now + 15d` exactamente.
- `isReportExpired` → `false` para `now + 1ms`, `true` para `now - 1ms`, `false` para `null`.
- TTL constants: assert `CACHE_TTL_DAYS === 15` e `REPORT_RETENTION_DAYS === 15`.
- Smoke test: `CACHE_TTL_MS` exportado por `analysis/cache.ts` é igual ao do módulo central (garante a única fonte de verdade).

### Passo 7 — Validação

- `bunx tsc --noEmit` (esperado verde).
- `bunx vitest run` (todos os testes existentes + novos).
- Inspecção rápida: `cache-status-badge.test.ts` continua a passar (a janela de "stale" passou de 24h → 15d, ajustar test fixture se necessário).

---

## Restrições aplicadas (todas verificadas no plano)

- Sem chamadas a providers, regeneração, ou apagar dados.
- Sem alterações ao cálculo do relatório público (apenas TTL/retenção).
- Sem mexer em Brevo/Resend (signed URL `SIGNED_URL_TTL_DAYS = 7` fica como está — é cosmética do email, não é retenção do relatório).
- Sem migrações de schema: `expires_at` em `report_requests` é derivado por helper.
- `REPORT_RETENTION_DAYS` e `CACHE_TTL_DAYS` ambos exportados de **um único módulo** (`src/lib/report/retention.ts`).

## Ficheiros tocados (estimado)

- **Novo:** `src/lib/report/retention.ts`
- **Novo:** `src/lib/report/__tests__/retention.test.ts`
- **Editado:** `src/lib/analysis/cache.ts` (re-export, alinhar STALE_TOLERANCE)
- **Editado:** `src/components/report-redesign/v2/cache-status-badge.tsx` (defaults + literal)
- **Editado:** `src/components/admin/cockpit/panels/reports-panel.tsx` (badge "Expirado" via helper)
- (Opcional) `src/components/admin/v2/sistema/test-profiles-card.tsx`: passar a ler `getReportExpiresAt` quando `expires_at` for nulo.

## Checkpoints

- ☐ Passo 1 — `src/lib/report/retention.ts` criado com 4 constantes + 3 helpers
- ☐ Passo 2 — `analysis/cache.ts` consome do módulo central; `STALE_TOLERANCE` alinhado
- ☐ Passo 3 — `cache-status-badge.tsx` sem literais 24h
- ☐ Passo 4 — Test profiles + admin previews continuam coerentes (sem override)
- ☐ Passo 5 — `reports-panel.tsx` mostra "Expirado" via `isReportExpired`
- ☐ Passo 6 — Testes novos + ajuste do `cache-status-badge.test`
- ☐ Passo 7 — `tsc --noEmit` e `vitest run` verdes
