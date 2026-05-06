
-- Add missing columns to provider_billing_imports
ALTER TABLE public.provider_billing_imports
  ADD COLUMN IF NOT EXISTS service_group text,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS raw_calculated_cost_usd numeric,
  ADD COLUMN IF NOT EXISTS displayed_cost_usd numeric,
  ADD COLUMN IF NOT EXISTS reconciliation_note text,
  ADD COLUMN IF NOT EXISTS batch_id uuid;

-- Create batches table
CREATE TABLE public.provider_billing_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  dashboard_total_actual_cost_usd numeric NOT NULL DEFAULT 0,
  imported_total_raw_cost_usd numeric,
  imported_total_displayed_cost_usd numeric,
  rounding_delta_usd numeric,
  raw_delta_usd numeric,
  reconciliation_status text NOT NULL DEFAULT 'pending',
  source_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_billing_import_batches ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_billing_batches_provider ON public.provider_billing_import_batches (provider, period_start);

-- FK from imports to batches
ALTER TABLE public.provider_billing_imports
  ADD CONSTRAINT fk_billing_imports_batch
  FOREIGN KEY (batch_id) REFERENCES public.provider_billing_import_batches(id)
  ON DELETE SET NULL;

-- Trigger for updated_at on batches
CREATE TRIGGER set_updated_at_billing_batches
  BEFORE UPDATE ON public.provider_billing_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
