CREATE TABLE public.pricing_plans (
  key text PRIMARY KEY,
  label text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  unit_label text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_email text
);

GRANT SELECT ON public.pricing_plans TO anon;
GRANT SELECT ON public.pricing_plans TO authenticated;
GRANT ALL ON public.pricing_plans TO service_role;

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pricing plans are publicly readable"
  ON public.pricing_plans
  FOR SELECT
  USING (true);

CREATE TRIGGER pricing_plans_set_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.pricing_plans (key, label, price_cents, currency, unit_label, sort_order, active)
VALUES
  ('single_report', '1 relatório', 700, 'EUR', NULL, 10, true),
  ('pack_5_reports', 'Pack 5 relatórios', 2800, 'EUR', '5,60€/relatório', 20, true);
