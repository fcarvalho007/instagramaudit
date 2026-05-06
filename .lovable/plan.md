## Overview

Add a billing reconciliation layer that compares **externally reported costs** (from provider dashboards/CSVs) against **internally logged costs** (from `provider_call_logs`). This creates a new table, a server query, a chart, a breakdown table, and a compact entry form — all inside the existing `/admin/receita` page.

---

## 1. Database Migration

**New table: `provider_billing_imports`**

```sql
CREATE TABLE public.provider_billing_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,            -- openai | apify | dataforseo
  source text NOT NULL,              -- dashboard | csv | xlsx | manual
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  service text,                      -- Actors, Completions, SERP, Functions
  actor_or_model text,               -- apify/instagram-scraper, gpt-5.4-mini
  metric_name text,                  -- events, tokens, requests, tasks
  quantity numeric,
  unit_price_usd numeric,
  estimated_cost_usd numeric,
  actual_cost_usd numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  source_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_billing_imports ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_billing_imports_provider_period ON public.provider_billing_imports (provider, period_start);
CREATE INDEX idx_billing_imports_actor ON public.provider_billing_imports (actor_or_model);
CREATE INDEX idx_billing_imports_created ON public.provider_billing_imports (created_at);

CREATE TRIGGER set_updated_at_billing_imports
  BEFORE UPDATE ON public.provider_billing_imports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

No RLS policies (admin-only table, accessed via `supabaseAdmin`).

---

## 2. Server Function (read + insert)

**File: `src/lib/admin/billing-reconciliation.server.ts`**

Queries:
- External total: `SUM(actual_cost_usd)` from `provider_billing_imports` for the period
- Internal total: `SUM(estimated_cost_usd)` from `provider_call_logs` for the period
- Variance = external − internal
- Variance % = variance / external × 100
- Daily aggregation (both sources grouped by day)
- Provider breakdown
- Actor/model breakdown

**File: `src/server/admin/billing-reconciliation.functions.ts`**

Two server functions:
- `getBillingReconciliation({ periodDays })` — returns all reconciliation data
- `insertBillingImport({ ...fields })` — inserts one row

Both protected by existing admin auth middleware.

---

## 3. Admin UI Components

**Location: `src/components/admin/v2/receita/reconciliation-section.tsx`**

Contains:
- 4 KPI cards: Custo real externo | Custo interno registado | Diferença | Estado
- Line/dot chart (Recharts): daily internal vs external vs variance
- Provider breakdown table
- Actor/model breakdown table

**Location: `src/components/admin/v2/receita/billing-import-form.tsx`**

Compact form with fields: provider, period_start, period_end, service, actor_or_model, metric_name, quantity, unit_price_usd, actual_cost_usd, notes. Submits via `insertBillingImport`.

---

## 4. Integration into `/admin/receita`

Add `<ReconciliationSection period={period} />` after the existing `<ExpenseSection />` in `src/routes/admin.receita.tsx`.

---

## 5. Labels (pt-PT)

All UI labels in European Portuguese as specified.

---

## 6. What does NOT happen

- No provider API calls
- No backfilling from external data
- No modification to `provider_call_logs` or `analysis_events`
- No changes to report UI
- No changes to `analysis_execution_mode`

---

## How to insert your first billing rows

After implementation, navigate to `/admin/receita`, scroll to "Reconciliação de custos", and use the form. Example first entry:

- Provider: `apify`
- Período: 2026-05-01 → 2026-05-06
- Service: `Actors`
- Actor/modelo: `apify/instagram-scraper`
- Quantidade: 4
- Custo real: 0.18
- Notes: "Dashboard Apify maio 2026"
