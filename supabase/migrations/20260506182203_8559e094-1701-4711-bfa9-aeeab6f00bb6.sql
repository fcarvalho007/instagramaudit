CREATE TABLE public.provider_billing_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  source text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  service text,
  actor_or_model text,
  metric_name text,
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