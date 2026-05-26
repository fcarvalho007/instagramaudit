CREATE TABLE public.lead_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  product text NOT NULL CHECK (product IN ('report_single','pack_5')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','expired')),
  provider text,
  provider_reference text,
  checkout_started_at timestamptz,
  paid_at timestamptz,
  expired_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_payments_lead_status ON public.lead_payments(lead_id, status);
CREATE INDEX idx_lead_payments_status_created ON public.lead_payments(status, created_at DESC);
CREATE INDEX idx_lead_payments_paid_at ON public.lead_payments(paid_at DESC) WHERE status = 'paid';

ALTER TABLE public.lead_payments ENABLE ROW LEVEL SECURITY;

-- Sem policies públicas: acesso só via service role / admin auth-middleware.

CREATE TRIGGER trg_lead_payments_updated_at
  BEFORE UPDATE ON public.lead_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();