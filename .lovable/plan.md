
## Auditoria — pontos de entrada de análise

| Entrada | Fresh providers? | Estado actual de gating |
|---|---|---|
| `POST /api/analyze-public-v1` | Sim (Apify+OpenAI) | Já tem reserva 1-crédito por pedido (Opção A) — precisa de refactor para a nova política |
| `POST /api/analyze/refresh` (utilizador) | Sim (delega em `?refresh=1` com `INTERNAL_API_TOKEN`) | Exige sessão Supabase autenticada; não consome créditos hoje |
| `POST /api/admin/refresh-profile` (admin) | Sim (delega em `?refresh=1` com `INTERNAL_API_TOKEN`) | Admin token; bypass de leads |
| `POST /api/admin/refresh-profile-preflight` | Não | Só leitura |
| `POST /api/onboarding/start` | Não | Cria lead + cookie + 2 créditos iniciais |
| `GET /api/public/analysis-snapshot/$username` | Não | Só lê snapshot persistido |

Decisão cache vs fresh vive toda em `analyze-public-v1.ts` (linhas ~559–600 e 740+). O `lead_session` é lido por `readLeadIdFromRequest()` (`src/lib/leads/lead-cookie.server.ts`).

Hoje não existe associação persistida entre `lead` e `analysis_snapshot`/handle. `credit_ledger.lead_id+cache_key` é histórico de débitos, não fonte de verdade para "este lead já tem este report" (a primeira reserva escreve a linha mesmo quando depois é refundida, e a reutilização posterior teria de filtrar por `reason='confirm'` — frágil). É necessária estrutura aditiva mínima.

## Nova tabela: `public.lead_reports`

Migração nova (não tocar nas existentes). Justificação: única forma robusta de saber "este lead já recebeu este report" sem inferir a partir do ledger.

```sql
CREATE TABLE public.lead_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  handle text NOT NULL,
  cache_key text NOT NULL,
  analysis_snapshot_id uuid,
  source text NOT NULL DEFAULT 'analyze_public_v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, cache_key)
);
CREATE INDEX idx_lead_reports_lead ON public.lead_reports(lead_id);
GRANT ALL ON public.lead_reports TO service_role;
ALTER TABLE public.lead_reports ENABLE ROW LEVEL SECURITY;
-- Sem policies para anon/authenticated: escrita/leitura só via service role.
```

Sem `FK` para `leads`/`analysis_snapshots` para evitar acoplamento de migrações; `service_role`-only mantém-se na linha do `credit_ledger`.

## Fluxo backend final em `analyze-public-v1`

```
parse → cacheKey
if isInternalBypass:                 # admin / smoke / refresh autenticado
    skip credit gate (mantém comportamento actual)
else:
    leadId = readLeadIdFromRequest()
    if !leadId: return ONBOARDING_REQUIRED   # (rename do actual NO_CREDITS_LEAD_REQUIRED)

    existing = lookupSnapshot(cacheKey)
    alreadyAssociated = await leadOwnsReport(leadId, cacheKey)

    if existing && isFresh(existing) && alreadyAssociated:
        # cache <24h já atribuído a este lead → 0 créditos
        serve cached; no reservation
    else:
        reservation = reserveCredit(leadId, handle, cacheKey)  # pode lançar INSUFFICIENT_CREDITS
        creditOutcome = "release" (default)
        # depois: confirm + upsertLeadReport(leadId, cacheKey, snapshotId)
        # em qualquer falha (provider_error, PROFILE_NOT_ALLOWED, PROFILE_PRIVATE,
        #  PROFILE_PERSONAL_NO_FEED, PROVIDER_DISABLED, CACHE_ONLY_NO_DATA,
        #  RATE_LIMITED, BUDGET_EXCEEDED, validation, throw): mantém release
```

`alreadyAssociated` é a única leitura nova; é barata (índice `(lead_id, cache_key)` único).

`upsertLeadReport` corre dentro do `finalizeCredit` no ramo `confirm`, ON CONFLICT DO NOTHING — garante idempotência se o mesmo lead voltar a cair no path "confirm" por race.

## Consumo final

| Cenário | Créditos |
|---|---|
| Sem cookie | 0, devolve `ONBOARDING_REQUIRED` |
| Lead com saldo 0 | 0, devolve `INSUFFICIENT_CREDITS` |
| Cache <24h, já associado ao lead | 0 |
| Cache <24h, novo para o lead | 1 (confirm + associa) |
| Stale servido em `cache_only` (associado) | 0 |
| Stale servido em `cache_only` (novo) | 1 (confirm + associa) |
| Stale servido por `APIFY_ENABLED=false` (novo) | 1 |
| Fresh OK | 1 (confirm + associa) |
| Fresh com `provider_error`/throw | 0 (release) |
| `PROFILE_NOT_ALLOWED` / `PROFILE_PRIVATE` / `PROFILE_PERSONAL_NO_FEED` / negative-cache | 0 (release) |
| `PROVIDER_DISABLED` / `BUDGET_EXCEEDED` / `RATE_LIMITED` sem stale | 0 (release) |
| `CACHE_ONLY_NO_DATA` | 0 (release) |
| `?refresh=1` com `INTERNAL_API_TOKEN` válido | 0 (bypass admin) |

## Ficheiros tocados

1. **Migração nova** `supabase/migrations/<ts>_lead_reports.sql` — tabela acima.
2. **`src/lib/credits/lead-reports.server.ts`** (novo) — `leadOwnsReport(leadId, cacheKey)` e `upsertLeadReport({leadId, handle, cacheKey, snapshotId})`. Service role.
3. **`src/routes/api/analyze-public-v1.ts`** — refactor do bloco "Credit gate (Fase 2, Opção A)" (~L479–549):
   - rename `NO_CREDITS_LEAD_REQUIRED` → `ONBOARDING_REQUIRED`;
   - pré-cálculo de `alreadyAssociated` antes da reserva;
   - skip de reserva quando cache fresh + associado;
   - chamada a `upsertLeadReport` no `finalizeCredit` ramo `confirm`;
   - garantir que negative-cache e o stale `APIFY_ENABLED=false` cabem na matriz acima.
4. **Sem alterações** em `analyze/refresh.ts`, `admin/refresh-profile.ts`, modal, `HeroActionBar`, report, pricing, emails, Apify actor, OpenAI, thumbnails.

## Códigos de erro

- `ONBOARDING_REQUIRED` (novo nome — substitui `NO_CREDITS_LEAD_REQUIRED`)
- `INSUFFICIENT_CREDITS` (mantém)

Mensagens PT preparadas em comentário JSDoc no ficheiro do endpoint para uso futuro pela UI:

- "Para gerar a análise, começa por criar a tua conta gratuita."
- "Sem créditos disponíveis."
- "Este pedido usa 1 crédito. Já não tens créditos gratuitos disponíveis."

## Testes (`src/routes/api/__tests__/analyze-public-v1-credits.test.ts` novo + unit tests para o helper)

- pedido anónimo (sem cookie) → 402 `ONBOARDING_REQUIRED`, sem chamadas a Apify/OpenAI nem a `lookupSnapshot` necessariamente, sem reserva
- lead válido, saldo 0 → 402 `INSUFFICIENT_CREDITS`, sem providers
- cache <24h já associado → 200, 0 créditos consumidos, sem reserve
- cache <24h novo para o lead → 200, 1 crédito consumido, `lead_reports` ganha linha
- fresh success → 1 crédito consumido + associação criada
- provider_error → reserva libertada, sem associação
- `PROFILE_PERSONAL_NO_FEED` / `PROFILE_PRIVATE` (negative-cache + first-time) → reserva libertada
- `PROFILE_NOT_ALLOWED` em testing mode → reserva libertada
- `INTERNAL_API_TOKEN` Bearer → ignora cookie/credito (admin/refresh continuam OK)

Helpers existentes (mocks de `supabaseAdmin`, `reserveCredit`, etc.) reaproveitados dos testes da Fase 1.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`

## Riscos antes da Fase 3 UI

- **Race entre dois pedidos simultâneos do mesmo lead/handle**: o segundo pode reservar antes do primeiro confirmar; ambos acabam por escrever `lead_reports` (ON CONFLICT DO NOTHING garante 1 linha, mas o segundo crédito é gasto). Aceitável; mitigação real exige lock por (lead, cache_key) — fora do âmbito desta fase.
- **Snapshots criados antes da Fase 2** não têm associação a leads; o primeiro lead que abrir o handle paga 1 crédito mesmo com cache existente. Comportamento intencional (associa-se na primeira vez).
- **`/api/analyze/refresh` do utilizador** continua a chamar internamente com `INTERNAL_API_TOKEN`, logo não consome crédito do lead. Pode ser revisto na Fase 3 quando a UI de refresh existir.
- Endpoint actual já assinala `outcome='blocked_credits'` em `analysis_events`; o rename do error_code requer atenção a dashboards admin que filtrem pelo string antigo (`NO_CREDITS_LEAD_REQUIRED`). Verificar no Build Mode.
