## Auditoria mobile (públicas) + back-end profunda

Duas frentes paralelas, low e medium risk apenas. Schema mantém-se intacto exceto onde for puro housekeeping (drop de índices duplicados, sem alterar contrato).

---

### Frente 1 — Mobile (411px viewport, páginas públicas)

**Rotas no scope:** `/`, `/analyze/$username`, `/report.example`, `/report/print/$snapshotId` (só sanity), `/feedback/$requestId`, `/beta/request`, `/beta/submitted/$requestId`, `/login`, `/signup`, `/reset-password`, `/privacidade`, `/termos`.

**Método** (não vou screenshotar todas — alvo são problemas estruturais):
1. Abrir browser em 411×742 e percorrer as 12 rotas, screenshot de cada uma.
2. Catalogar por categoria de defeito (overflow, tap target <44px, font <12px, padding insuficiente, sticky/fixed que tapa conteúdo, scroll horizontal, modais cortados).
3. Aplicar fixes em massa por categoria — não componente a componente.

**Alvos prováveis (a confirmar com screenshots):**
- **Hero / index**: `text-7xl` no headline pode causar overflow em 360px; subtitle tem `md:whitespace-nowrap` (safe), mas confirmar. `HandwrittenNote` está `hidden sm:block` (ok).
- **HeroActionBar**: stacked OK, mas o input de 64px alto + botão a seguir podem exigir validação táctil.
- **Analyze v2**: shell tem sidebar desktop + tabs mobile (`ReportBlockTopTabs`). Confirmar que tabs não overflow horizontalmente em 360px com 6 blocos.
- **UnlockModal**: 5-step wizard dentro de `Dialog`. Em 411×742 com teclado aberto pode cortar botões. Garantir `max-h-[90dvh] overflow-y-auto` e botões num footer sticky.
- **FeedbackForm**: confirmar inputs com `inputmode` correcto e botão submit não tapado pelo teclado iOS.
- **BetaRequestForm**: idem.
- **Login/Signup/ResetPassword**: garantir que o cartão central não fica colado às bordas em 360px (`px-4` mínimo) e que o link "Esqueci-me" tem alvo táctil ≥44px.
- **Privacidade/Termos**: garantir `prose` com `text-base` (não `sm`) e `max-w-prose` para legibilidade.

**Critérios de aceitação por defeito:**
- Sem scroll horizontal em 360–414px.
- Tap targets ≥40×40px (Tailwind `min-h-10`).
- Texto corrido ≥14px, labels ≥12px (regra do projeto).
- Modais com `max-h-[90dvh] overflow-y-auto`, footer sticky se >2 botões.
- Imagens com `max-w-full h-auto`.
- Headlines com `text-balance` + clamps responsivos.

**Não toco em:** `report.example` (locked), tokens, fontes, esquema de cores.

---

### Frente 2 — Back-end profunda

#### 2.1 Limpeza de índices duplicados (migration)

Detectados pares redundantes (mesma coluna, mesma tabela, naming antigo + novo):

```
analysis_events:
  analysis_events_created_at_idx   ↔ idx_analysis_events_created
  analysis_events_data_source_idx  ↔ idx_analysis_events_data_source
  analysis_events_handle_idx       ↔ idx_analysis_events_handle
  analysis_events_outcome_idx      ↔ idx_analysis_events_outcome

social_profiles:
  social_profiles_cost_idx           ↔ idx_social_profiles_cost
  social_profiles_last_analyzed_idx  ↔ idx_social_profiles_last_analyzed
  social_profiles_total_idx          ↔ idx_social_profiles_total
```

Plano: nova migration que dropa os 7 antigos (`*_idx`), mantém os `idx_*`. Verificação: `EXPLAIN` antes/depois numa query típica para garantir que o planner não troca para seq scan.

#### 2.2 Linter Supabase

Correr `supabase--linter` e fixar tudo o que for medium ou high (RLS off, search_path mutável, funções sem `SECURITY DEFINER` onde necessário). Reportar info/low.

#### 2.3 Rate limit em `/api/public/report-unlock`

Endpoint público sem qualquer limite. Risco real: spam fills `leads` + dispara emails (futuramente). Adicionar:
- Janela em memória do worker (Map IP→timestamps, cleanup TTL). Limite sugerido: **5 unlocks / 10 min / IP**, **20 / hora / IP**.
- IP via `getRequestIP({ xForwardedFor: true })`.
- Fail-open: se o limite for atingido, devolver 429 com `Retry-After`.
- O `processReportUnlock` continua idempotente (não muda).

Não persisto em DB — em-memory chega para v1; se escalar, migra-se para Redis ou tabela dedicada.

#### 2.4 Revisão dos server functions/routes recentes

Vou inspecionar (1 ficheiro / 5 min) e aplicar fixes triviais onde detectar:

| Ficheiro | Verifico |
|---|---|
| `src/lib/unlock.server.ts` | `any` casts → tipos, error handling, indentação |
| `src/lib/tracking.functions.ts` | dedup centralizado, tipo do `metadata` |
| `src/lib/tracking.server.ts` | bulkhead em `recordProductEvent` (timeout) |
| `src/routes/api/public/report-unlock.ts` | rate limit + headers cache |
| `src/routes/api/public/feedback.$requestId.ts` | validação Zod do path param |
| `src/routes/api/send-report-email.ts` | `resolveSender` (já feito), reconfirmar |
| `src/lib/email/send-personal-area-saved.server.ts` | reconfirmar pós-refactor |
| `src/lib/admin/lead-events.server.ts` | concorrência em update de status |
| `src/server/account.functions.ts` | RLS scope da query |
| `src/server/reports.functions.ts` | RLS scope da query |

#### 2.5 RLS spot-check

Tabelas com RLS ON sem policies (dependem 100% de `service_role`): `analysis_events`, `analysis_snapshots`, `leads`, `product_events`, `report_variant_overrides`, etc. — design intencional. Vou só **validar** que nenhum endpoint público usa a publishable key para escrever nelas (deve usar `supabaseAdmin` server-side).

Se encontrar leak (publishable key escrevendo em tabela admin-only), reporto e paro para decisão — é medium-high risk.

#### 2.6 Validação final

- `bunx tsc --noEmit`
- `bunx vitest run` (esperar ≥180 verdes)
- Linter Supabase pós-migration: 0 novos warnings
- Browser smoke 411px nas 12 rotas

---

### O que NÃO faço (out of scope ou risco alto)

- Mudar tokens, fontes, cores
- Tocar em `/report.example`, em ficheiros listados em `LOCKED_FILES.md` sem confirmar
- Alterar contratos de API (response shapes)
- Refactor de `report-shell-v2` ou blocos do report
- Alterar schema de tabelas existentes (só drop de índices duplicados)
- Adicionar payments, auth, ou novas features

---

### Checkpoint

Frente Mobile
☐ Browser sweep das 12 rotas em 411×742 + screenshots
☐ Categorização de defeitos
☐ Fixes por categoria (overflow, tap targets, modais, forms)

Frente Back-end
☐ Migration: drop de 7 índices duplicados
☐ Linter Supabase + fixes medium/high
☐ Rate limit em `/api/public/report-unlock`
☐ Revisão dos 10 ficheiros server-side
☐ Spot-check RLS / publishable key
☐ `tsc` 0 erros, `vitest` ≥180 verdes
☐ Reportar em PT-PT o que foi feito + o que ficou flagged
