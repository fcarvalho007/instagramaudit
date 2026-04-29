## Phase 2.1 — Close-out plan (5 pending items)

The previous session built the foundation (mock banners, schema `cost_daily`/`app_config`, sync server logic, 13 admin/public API routes, system tab refactor). What remains:

### 1. Wire `expense-section.tsx` to real data + DataForSEO column
File: `src/components/admin/v2/visao-geral/expense-section.tsx`

- Drop `MOCK_EXPENSE` and `MOCK_DAILY_COSTS` imports (keep `DAILY_COST_LIMIT`).
- Add two `useQuery` calls:
  - `/api/admin/sistema/expense-30d` → daily series with `apify`, `openai`, `dataforseo` per day.
  - `/api/admin/sistema/caps` → caps for the 3 providers.
- Convert grid from `md:grid-cols-3` to `md:grid-cols-4`: Apify · OpenAI · **DataForSEO (new)** · Total.
  - DataForSEO column uses purple `#534AB7` (token: add `--admin-dataforseo-500/700` if missing, otherwise inline literal in `ADMIN_LITERAL`).
  - Sub line for DataForSEO: `chamadas + saldo restante` from `details.balance_at_snapshot` of the latest cost_daily row.
- Stacked chart gets a 3rd `<Bar dataKey="dataforseo">` using the same purple. Tooltip formatter handles all 3.
- Total column sums all 3 providers.
- Add loading skeleton + error banner via `<SectionState>`. Empty array → friendly message ("Sem dados ainda — sincroniza para ver custos reais.").

The endpoint `/api/admin/sistema/expense-30d` already exists; verify its response shape matches `{day, apify, openai, dataforseo}[]` and adjust if needed.

### 2. "Sincronizar agora" button in `admin.sistema.tsx`
File: `src/routes/admin.sistema.tsx`

- Add a small button to the right of the page title, label "Sincronizar agora".
- On click: `POST /api/admin/sistema/sync-now` (already exists), show toast on success/failure, then `queryClient.invalidateQueries({ queryKey: ["admin", "sistema"] })`.
- Disable button while in flight; spinner + "A sincronizar…" label.

### 3. "Editar caps" modal in `SecretsConfigSection`
File: `src/components/admin/v2/sistema/secrets-config-section.tsx` + new `cost-caps-modal.tsx`.

- Replace the static "Caps são configuráveis em app_config" footnote with a "Editar caps" button (right-aligned) inside the "Configuração de custos" card.
- Modal (shadcn `Dialog`): three numeric inputs (Apify / OpenAI / DataForSEO), validates positive numbers, USD step 1.
- Submit → `PUT /api/admin/sistema/caps` with `{ apify, openai, dataforseo }`. The route currently supports `GET`; extend it with a `PUT` handler that upserts `app_config` rows `cost_cap_<provider>_usd`.
- On success: toast + invalidate `["admin", "sistema", "caps"]`.

### 4. Schedule pg_cron daily syncs
Three jobs at 01:00 UTC (after Apify reset), each `POST`s the corresponding hook with empty body.

```
sync-apify-costs-daily      → /api/public/hooks/sync-apify-costs
sync-dataforseo-costs-daily → /api/public/hooks/sync-dataforseo-costs
sync-openai-costs-daily     → /api/public/hooks/sync-openai-costs
```

Use `supabase--insert` (not migration) since it contains URLs + anon key. Stable URL: `https://project--b554ee82-2f67-4f5a-895d-cd69f2867df7.lovable.app/api/public/hooks/...`. Headers include `apikey: <anon>`. Body: `{}`.

Pre-flight: `CREATE EXTENSION IF NOT EXISTS pg_cron; CREATE EXTENSION IF NOT EXISTS pg_net;` via a tiny migration if not enabled.

### 5. Validation
After edits: rely on auto-running build. Confirm no new TypeScript errors. Smoke-test `/admin/sistema` and `/admin` overview.

### Out of scope (per directive)
- No changes to `/report/example`, locked files, legacy cockpit, Receita/Clientes mocks.
- No invented data — empty arrays render the empty state message.

### Risks
- `expense-30d` endpoint shape may not yet emit `dataforseo` key. If absent, I'll patch the endpoint to emit zero for missing providers so the chart renders correctly with "Sem dados ainda" coverage.
- `caps` endpoint currently `GET`-only — need `PUT` handler addition.
