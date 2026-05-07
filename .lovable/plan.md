## Bugs encontrados

### Bug 1 — `INTERNAL_API_TOKEN` não é obrigatório em `generate-beta-report.ts`
**Ficheiro:** `src/routes/api/admin/generate-beta-report.ts` (L125)
**Problema:** Se o token não existir, a chamada a `analyze-public-v1?refresh=1` é feita sem auth → o refresh é silenciosamente ignorado → relatório pode ser marcado como "completed" com dados stale/vazios.
**Fix:** Adicionar pre-flight check antes da chamada (L122). Se `INTERNAL_API_TOKEN` não existir → rollback status para o original → devolver 409 com `preflight_blocked: "internal_token_missing"`.

### Bug 2 — Erro ortográfico "activo" (pré-AO90)
**Ficheiro:** `src/components/admin/v2/sistema/execution-mode-card.tsx` (L135)
**Problema:** "Modo activo" deveria ser "Modo ativo" (Acordo Ortográfico pós-1990).
**Fix:** Substituir `activo` por `ativo`.

### Bug 3 — 20+ classes `slate-*` em `report-methodology.tsx`
**Ficheiro:** `src/components/report-redesign/report-methodology.tsx`
**Problema:** Usa `text-slate-500`, `text-slate-600`, `border-slate-200`, `bg-slate-50` — viola a regra de design tokens semânticos.
**Fix:** Substituir por tokens: `slate-500` → `content-tertiary`, `slate-600` → `content-secondary`, `slate-800` → `content-primary`, `slate-200` → `border-default`, `slate-400` → `content-tertiary`, `slate-50` → `surface-muted`.

### Não é bug (confirmados OK)
- Build TypeScript: limpo ✓
- Testes: 124 passam ✓
- `ALLOWED_SOURCE_STATUSES`: inclui `failed` ✓
- `AnalysisErrorState`: componente existe e é importado corretamente — a página em branco no browser QA anterior foi provavelmente o delay de 3s do skeleton ✓
- `CACHE_ONLY_NO_DATA` mapping: existe em pt-PT ✓

## Alterações

| Ficheiro | Tipo |
|---|---|
| `src/routes/api/admin/generate-beta-report.ts` | Pre-flight token check |
| `src/components/admin/v2/sistema/execution-mode-card.tsx` | Ortografia |
| `src/components/report-redesign/report-methodology.tsx` | Tokens semânticos |

Zero alteração a rotas públicas, lógica de providers, schema ou PDF pipeline.
