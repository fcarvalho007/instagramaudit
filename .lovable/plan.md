## Resumo
Card admin-only para `/admin/sistema` com agregados 7d + últimas 20 onboarding events. Read-only, sem alterações ao fluxo de onboarding ou providers.

## Onde os eventos estão armazenados
Tabela `product_events`:
- `created_at` timestamptz
- `event_type` text (`onboarding_step_view` | `onboarding_step_complete` | `onboarding_abandon` | `onboarding_success` | `onboarding_error`)
- `handle` text · `actor_hash` text · `lead_id` uuid (atualmente sempre NULL — o endpoint público não conhece o lead_id no momento do envio)
- `metadata` jsonb: `{ step: 0|1|2|3, marketing_consent, error_code }`

Inseridos por `POST /api/public/onboarding-event` (já em produção).

## Ficheiros a criar
1. **`src/routes/api/admin/onboarding-funnel.ts`** — GET protegido por `requireAdminSession`. Devolve `{ window_days: 7, aggregate: {...}, recent: [...] }`.
2. **`src/components/admin/v2/sistema/onboarding-funnel-card.tsx`** — `AdminCard` com agregados (KPIs em grid) + tabela das últimas 20 events. Segue padrão de `thumbnail-persistence-card.tsx` (mesmo `AdminCard`, `SectionSkeleton`, `SectionError`, `useQuery` via `adminFetch`).

## Ficheiro a alterar
3. **`src/routes/admin.sistema.tsx`** — importar e renderizar `<OnboardingFunnelCard />` depois de `<ThumbnailPersistenceCard />`.

## Query SQL (executada via `supabaseAdmin`)
Dois reads em paralelo, ambos filtrados por `event_type LIKE 'onboarding_%'`:

**Agregado 7d** (group em código JS depois de buscar `event_type` + `metadata` dos últimos 7d):
```sql
SELECT event_type, metadata
FROM product_events
WHERE event_type LIKE 'onboarding_%'
  AND created_at >= now() - interval '7 days';
```
Reduzido em JS para counts por `event_type` e por `metadata.step`:
- `modal_started` = events `onboarding_step_view` com `step=0`
- `step1_viewed/step2_viewed/step3_viewed` = `onboarding_step_view` com `step=1|2|3`
- `successful` = `onboarding_success`
- `abandon` = `onboarding_abandon`
- `errors` = `onboarding_error`
- `completion_rate_pct` = `successful / modal_started * 100` (null se started=0)

**Últimas 20** (display):
```sql
SELECT id, created_at, event_type, handle, lead_id, metadata
FROM product_events
WHERE event_type LIKE 'onboarding_%'
ORDER BY created_at DESC
LIMIT 20;
```
A UI extrai `step` e `error_code` de `metadata`.

## UI do card (visual existente)
- `<AdminCard title="Funil de onboarding" subtitle="Últimos 7 dias">` 
- Grid 4-col KPIs: Modal iniciado · Step 1 / 2 / 3 visualizados · Sucesso · Abandono · Erros · Taxa de conclusão
- Tabela: `Quando · Evento · Step · @handle · lead_id · error_code` (mono p/ ids/timestamps no admin é permitido pela memória core)
- `relativeTime()` helper local (copiar do thumbnail card)
- `SectionSkeleton` / `SectionError` para loading/error

## Notas
- `lead_id` na tabela vai aparecer sempre vazio enquanto o endpoint público não correlacionar (fora de scope). Mostrar `—` quando NULL.
- Endpoint `/api/admin/onboarding-funnel` segue o padrão de `requireAdminSession` + `supabaseAdmin` (não toca RLS).
- Sem migrations, sem alterações ao modal, sem alterações a providers/relatório.

## Validação
- `bunx tsc --noEmit` (harness faz build)
- Verificação visual em `/admin/sistema`

## Output após execução
Listo: ficheiros, SQL exacto, localização do card, resultado tsc, e nota sobre `lead_id` sempre NULL no estado actual.