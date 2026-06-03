-- Extend lead_payments for EuPago + new products
ALTER TABLE public.lead_payments
  DROP CONSTRAINT IF EXISTS lead_payments_product_check;

ALTER TABLE public.lead_payments
  ADD CONSTRAINT lead_payments_product_check
  CHECK (product = ANY (ARRAY[
    'report_single',
    'pack_5',
    'authority_diagnosis_49',
    'report_full_9'
  ]));

ALTER TABLE public.lead_payments
  ADD COLUMN IF NOT EXISTS provider_payment_id text,
  ADD COLUMN IF NOT EXISTS provider_checkout_url text,
  ADD COLUMN IF NOT EXISTS report_cache_key text,
  ADD COLUMN IF NOT EXISTS instagram_username text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_payments_provider_payment_id
  ON public.lead_payments (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_payments_report_cache_key
  ON public.lead_payments (report_cache_key)
  WHERE report_cache_key IS NOT NULL;

-- Entitlements (minimal). Server-only access via supabaseAdmin.
CREATE TABLE IF NOT EXISTS public.lead_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  product_code text NOT NULL,
  payment_id uuid REFERENCES public.lead_payments(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_lead_entitlements_lead_product UNIQUE (lead_id, product_code)
);

CREATE INDEX IF NOT EXISTS idx_lead_entitlements_lead ON public.lead_entitlements (lead_id);

-- Grants: server-only table accessed via supabaseAdmin (service_role).
-- No authenticated/anon grants — all reads/writes go through server fns.
GRANT ALL ON public.lead_entitlements TO service_role;

ALTER TABLE public.lead_entitlements ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated/anon: deny by default. service_role bypasses RLS.
