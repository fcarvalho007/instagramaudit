# Política de cache 24h + botão Actualizar — auditoria e plano

## 1. Comportamento actual da cache

| Aspecto | Onde | Valor / comportamento |
|---|---|---|
| Source of truth do TTL | `src/lib/report/retention.ts` | `REPORT_RETENTION_DAYS = 15`, com override dinâmico via `app_config.report_retention_days` (hoje = 15). |
| TTL de cache | mesmo ficheiro | `CACHE_TTL_DAYS = REPORT_RETENTION_DAYS` → **15 dias**. `expires_at = created_at + 15d` (escrito em `analysis_snapshots.expires_at` em `cache.ts:178/206`). |
| Janela "stale" | `cache.ts:34` | `STALE_TOLERANCE_MS = REPORT_RETENTION_MS` → também 15 d. Na prática hoje cache fresca e stale coincidem; stale só é distinguível em `cache_only` mode ou em fallback após falha do provider. |
| Decisão cache vs fresh | `routes/api/analyze-public-v1.ts:460` | `if (existing && !forceRefresh && isFresh(existing)) → serve cache`. `isFresh = expires_at > now` (`cache.ts:156`). |
| Fallback após falha do provider | `analyze-public-v1.ts:630, 681, 1141` | Se Apify falhar e `isWithinStaleWindow(existing)`, devolve snapshot antigo com `data_source: "stale"`. |
| Bypass forçado | `analyze-public-v1.ts:436–449` | `?refresh=1` + `Authorization: Bearer ${INTERNAL_API_TOKEN}` — exclusivo admin. Sem este header é silenciosamente ignorado. |
| Admin refresh | `routes/api/admin/refresh-profile.ts` | POST autenticado por sessão admin → chama `analyze-public-v1?refresh=1` com o token interno, com lock anti-concorrência (`refreshingHandles`). Preflight em `refresh-profile-preflight.ts`. |
| Guardas de custo (mantidas) | `apify-allowlist`, `apify-budget.server`, `execution-mode.server`, rate limits IP/handle, `cache_only` mode | já funcionam e bloqueiam fresh antes do scrape. |
| UI freshness | `cache-status-badge.tsx` | Badge com estados `fresh / expiring_soon / stale / unknown`, baseados em `REPORT_RETENTION_MS` (15 d). Não há CTA de refresh público. |

**Resumo:** uma cache reutiliza-se durante 15 dias. Não há refresh acessível ao público; só admin via token.

## 2. Comportamento actual de créditos

- **Não existe sistema de créditos.** Pesquisa em `src/` e `psql \dt` confirma ausência de tabela `user_credits`, `credits`, `wallet`, etc.
- `app_config` só tem `report_retention_days`. Sem `credit_balance` ou similar.
- Toda a contenção de custo é hoje **global** (Apify daily/hard cap, allowlist, execution mode, rate limit por IP/handle).
- Não há autenticação obrigatória para gerar relatório público (`/analyze/$username` é público; `_authenticated` só protege `/dashboard`).
- Existe `profiles.plan` (default `free`) mas não é consumido em lugar nenhum.

**Conclusão obrigatória por regra do prompt:** "if the current system has no credit table yet, do not invent one. Instead, report what is missing and propose the smallest schema/API plan." → **Não implemento débito de créditos nesta tarefa.** Implemento a política de cache + UI do botão, e proponho schema mínimo (§ 6) que tu aprovas separadamente antes do Build seguinte.

## 3. Plano de implementação (após aprovação)

### 3.1 Constantes únicas (novo bloco em `src/lib/report/retention.ts`)

```ts
// Cache "reuse" window — abaixo disto serve-se cache sem repensar.
export const CACHE_REUSE_MAX_HOURS = 24;
export const CACHE_REUSE_MAX_MS = CACHE_REUSE_MAX_HOURS * 3_600_000;

// Acima disto, mostra-se o CTA "Actualizar análise" (mas ainda serve cache).
export const REFRESH_BUTTON_AFTER_HOURS = 12;
export const REFRESH_BUTTON_AFTER_MS = REFRESH_BUTTON_AFTER_HOURS * 3_600_000;
```

`REPORT_RETENTION_DAYS = 15` mantém-se (histórico revisitável e fallback). `CACHE_TTL_DAYS` deixa de ser igual a `REPORT_RETENTION_DAYS`: passa a derivar de horas. **`expires_at` nas linhas novas passa a `created_at + 24h`**, mantendo retenção via `REPORT_RETENTION_MS` para acesso histórico/fallback.

### 3.2 `src/lib/analysis/cache.ts`

- `isFresh(snapshot)` → continua a usar `expires_at`, agora 24h.
- `isWithinStaleWindow(snapshot)` → continua a usar `STALE_TOLERANCE_MS = REPORT_RETENTION_MS` (15 d) para fallback.
- Novo helper: `getFreshnessState(snapshot)` → `"fresh_under_12h" | "fresh_12_to_24h" | "expired"`. Usado pelo endpoint e exposto na resposta.

### 3.3 `routes/api/analyze-public-v1.ts`

- A condição actual `if (existing && !forceRefresh && isFresh(existing))` mantém-se (cache hit dentro das 24h).
- Adicionar ao payload de resposta um campo `freshness`:
  ```ts
  freshness: {
    state: "fresh_under_12h" | "fresh_12_to_24h" | "fallback_stale",
    snapshot_created_at: string,
    snapshot_age_hours: number,
    refresh_available: boolean,        // true quando state === "fresh_12_to_24h"
    refresh_requires_credit: boolean,  // ver §6: hoje false até existir tabela; true no futuro
    is_fallback: boolean,              // true só quando fresh falhou e servimos stale
  }
  ```
- Quando `existing && !isFresh(existing) && !forceRefresh`: continuar a chamada fresh automática (já é o comportamento, só os 24h definem o `isFresh`).
- Log: novo `data_source: "cache_recent"` em logs (mantém-se também `cache`/`fresh`/`stale`). Eventos novos (em `logEvent` notes ou em `console.info` estruturado): `cache_hit_recent`, `refresh_available`, `refresh_fallback_to_cache`.

### 3.4 Endpoint de refresh público (autenticado)

- Novo POST `src/routes/api/analyze/refresh.ts` (TanStack server route).
- **Auth obrigatória** (`requireSupabaseAuth`) — `/analyze/$username` permanece público para visualização, mas a acção de gastar Apify exige sessão. Isto é o gate prático sem precisar inventar tabela de créditos já.
- Reaproveita a lógica de `refresh-profile.ts`: lock por handle + chamada interna `analyze-public-v1?refresh=1` com `INTERNAL_API_TOKEN`.
- Preflight: rejeitar se snapshot actual tiver < 12h (state `fresh_under_12h`) — UI não mostra o botão mas backend valida na mesma.
- Respeita todos os guards existentes (Apify enabled, daily/hard cap, allowlist, rate limit, execution_mode `cache_only`).
- **Crédito**: ver § 6. Por agora, sem débito (`refresh_credit_not_consumed` log). O endpoint regista `refresh_requested` → `refresh_success` ou `refresh_failed`.

### 3.5 UI

- `src/components/report-redesign/v2/cache-status-badge.tsx` → usar `CACHE_REUSE_MAX_MS` (24h) em vez de `REPORT_RETENTION_MS` no cálculo de `fresh/expiring_soon/stale`. `warnWithinHours` passa a 12h (faz sentido "expirar em breve" = última metade da janela 24h).
- Novo componente `src/components/report-redesign/v2/refresh-cta.tsx`:
  - Visível quando `freshness.refresh_available === true`.
  - Botão Inter SemiBold sentence case "Actualizar análise" + helper text "Usa 1 crédito para recolher dados novos." (esconder o helper enquanto `refresh_requires_credit === false`; ver §6).
  - Estados: idle, loading (spinner), success (toast + reload do report data), error (toast com mensagem clara, mantém cache visível).
- Aviso de fallback (`freshness.is_fallback === true`): banner navy soft no topo do report:
  > PT: "Não foi possível actualizar agora. Mostramos a última análise disponível, recolhida em {{date}}."
  > EN: "We couldn't refresh the data right now. Showing the latest available analysis, collected on {{date}}."

### 3.6 Backend logging

Em `analyze-public-v1` e no novo endpoint:
- `cache_hit_recent` (≤24h)
- `refresh_available` (12–24h, ao servir cache)
- `refresh_requested`, `refresh_success`, `refresh_failed`
- `refresh_fallback_to_cache` (fresh falhou, servimos stale)
- `refresh_credit_consumed` / `refresh_credit_not_consumed` (sempre o segundo enquanto §6 não estiver implementado)

Sem PII além de `handle` (já é o padrão actual).

## 4. Ficheiros a alterar

| Ficheiro | Tipo |
|---|---|
| `src/lib/report/retention.ts` | adicionar constantes 24h/12h, manter retenção 15d |
| `src/lib/analysis/cache.ts` | mudar `expires_at` para +24h, novo `getFreshnessState` |
| `src/routes/api/analyze-public-v1.ts` | enriquecer payload com `freshness`, novos logs |
| `src/routes/api/analyze/refresh.ts` | NOVO endpoint autenticado |
| `src/components/report-redesign/v2/cache-status-badge.tsx` | TTL 24h, warnWithin 12h |
| `src/components/report-redesign/v2/refresh-cta.tsx` | NOVO componente |
| `src/components/report-redesign/v2/report-overview-block.tsx` (ou shell) | montar CTA + banner fallback |
| `src/i18n/locales/{pt,en}/report.json` | strings novas (ver §5) |
| `src/lib/report/__tests__/*` + novos testes | ver §8 |

## 5. UI copy

**PT** (`pt/report.json` → `cache.*` / `refresh.*`):
- `cache.updated_today` = "Actualizado hoje"
- `cache.data_collected_on` = "Dados recolhidos em {{date}}"
- `cache.analyzed_summary` = "{{count}} publicações analisadas · período observado: {{days}} dias"
- `refresh.cta` = "Actualizar análise"
- `refresh.helper_with_credit` = "Usa 1 crédito para recolher dados novos."
- `refresh.helper_no_credit` = "Recolher dados novos agora."
- `refresh.fallback_warning` = "Não foi possível actualizar agora. Mostramos a última análise disponível, recolhida em {{date}}."

**EN**:
- `cache.updated_today` = "Updated today"
- `cache.data_collected_on` = "Data collected on {{date}}"
- `cache.analyzed_summary` = "{{count}} posts analyzed · observed period: {{days}} days"
- `refresh.cta` = "Refresh analysis"
- `refresh.helper_with_credit` = "Uses 1 credit to collect fresh data."
- `refresh.helper_no_credit` = "Collect fresh data now."
- `refresh.fallback_warning` = "We couldn't refresh the data right now. Showing the latest available analysis, collected on {{date}}."

## 6. Regra de consumo de crédito + proposta mínima de schema

**Estado actual:** sem tabela. **Hoje, o refresh não debita nada** — o gate operacional é a sessão autenticada + rate limit + Apify caps.

Proposta mínima (a **aprovar separadamente antes de implementar**):

```sql
-- mínima: 1 linha por user, contador incremental.
CREATE TABLE public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 3,           -- 3 free credits iniciais
  lifetime_consumed integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own credits" ON public.user_credits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,                       -- -1 refresh, +N top-up
  reason text NOT NULL,                         -- 'refresh_success' | 'topup' | 'refund_provider_fail'
  snapshot_id uuid NULL REFERENCES public.analysis_snapshots(id),
  handle text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own ledger" ON public.credit_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

Regra (quando este schema existir):
- **Cache hit < 24h → 0 créditos.**
- **Refresh manual 12–24h:** verificar balance ≥ 1 antes de tocar no provider. Se OK, chamar fresh. **Debitar 1 crédito apenas depois do snapshot novo ser persistido com sucesso** (`status:"fresh_success"` em `analyze-public-v1`). Falhas de pre-flight (budget, rate limit, allowlist) → 0 débito, log `refresh_credit_not_consumed`. Falha do provider depois de iniciar → 0 débito (não consumir até sucesso é mais simples e mais defensável que refund).
- **Auto-fresh após 24h:** mesma regra. Se balance = 0, devolve cache com `is_fallback: false` mas adiciona aviso "saldo esgotado, dados a {{date}}" (depois de termos a tabela).

**Nesta tarefa não toco nestas tabelas.** Implemento só a política de cache + endpoint de refresh autenticado sem débito. O helper text PT/EN do botão hoje será "Recolher dados novos agora." e troca para "Usa 1 crédito…" no momento em que tu aprovares o schema acima.

## 7. Fallback

- Fresh falha → `data_source: "stale"` (já existe) + `freshness.is_fallback = true` + banner UI (§3.5).
- Se também não houver snapshot stale, devolve o erro actual (sem mudança).
- Stale window mantém-se 15 d para não regredir cobertura de fallback.

## 8. Testes a adicionar

Novos em `src/lib/analysis/__tests__/cache-freshness.test.ts`:
1. `isFresh` true para snapshot 23h, false para 25h.
2. `getFreshnessState`: 6h → `fresh_under_12h`; 18h → `fresh_12_to_24h`; 30h → `expired`.
3. `expires_at` calculado em `storeSnapshot` = `created_at + 24h ± 1s`.

Em `src/routes/api/__tests__/analyze-public-v1-freshness.test.ts` (novo, com mocks já usados nos restantes testes):
4. Snapshot 6h → resposta `freshness.state = "fresh_under_12h"`, `refresh_available: false`, nenhum call ao Apify.
5. Snapshot 18h → `fresh_12_to_24h`, `refresh_available: true`, nenhum call ao Apify.
6. Snapshot 30h sem `?refresh` → tenta fresh; mock Apify success → resposta `fresh`; mock Apify failure → `freshness.is_fallback = true` + `data_source: "stale"`.
7. `cache_only` mode + snapshot 30h → continua a servir stale (regressão).
8. Budget cap atingido → `refresh` endpoint devolve 429/ratelimit sem chamar Apify (testar o novo endpoint).
9. Negative cache (handle inválido) → comportamento actual mantém-se.

Validação:
- `bunx tsc --noEmit`
- `bunx vitest run`

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Reduzir TTL para 24h aumenta carga Apify se múltiplos utilizadores autenticados clicarem refresh. | Lock por handle (`refreshingHandles`) já existe; novo endpoint reaproveita-o + Apify daily/hard cap continua activo. |
| Auto-fresh após 24h em pico → custo. | Mantém-se `execution_mode` admin (`cache_only` desliga tudo). Pre-flight valida budget antes do scrape. |
| Sem tabela de créditos, qualquer user autenticado pode disparar refresh. | Aceitável no MVP (admin-only testing). O helper text revela "agora sem custo" para não enganar. Próximo passo (§6) fecha. |
| Snapshots existentes em produção têm `expires_at = +15d` antigo. | Não migrar; novos snapshots usam +24h, antigos continuam válidos como cache até `expires_at` original. Não há regressão funcional. |
| Banner fallback mostrar data muito antiga (até 15d). | `formatRetentionMessage` já existe; podemos adicionar avisar visual mais forte se age > 7d (out of scope; podes pedir depois). |

## 10. Checkpoint — aguardar aprovação antes de Build

☐ Aprovas a janela **24h cache reuse / 12h refresh CTA**?
☐ Aprovas **não debitar créditos** nesta tarefa e adiar o schema `user_credits`/`credit_ledger` para PR separado?
☐ Aprovas que o **endpoint de refresh exija sessão autenticada** (`requireSupabaseAuth`) já agora, mesmo sem tabela de créditos?
☐ Aprovas o **helper text temporário** "Recolher dados novos agora." enquanto não há débito?
☐ Aprovas que `expires_at` de snapshots **novos** passe para +24h, deixando snapshots antigos correrem o seu ciclo natural sem migração?

Após "sim" a estes 5 pontos, mudo para Build e executo §3–§8.
