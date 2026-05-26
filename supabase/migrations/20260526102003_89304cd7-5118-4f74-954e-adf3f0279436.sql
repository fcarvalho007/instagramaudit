CREATE TABLE public.pricing_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_option text NOT NULL CHECK (pricing_option IN ('single_report','pack_5_reports')),
  would_pay text NOT NULL CHECK (would_pay IN ('sim','talvez','nao')),
  price_fairness text CHECK (price_fairness IN ('barato','justo','caro')),
  email text,
  email_normalized text GENERATED ALWAYS AS (lower(trim(email))) STORED,
  comment text,
  user_agent text,
  referrer text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_interest ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pricing_interest_created_at ON public.pricing_interest (created_at DESC);
CREATE INDEX idx_pricing_interest_option ON public.pricing_interest (pricing_option);
CREATE INDEX idx_pricing_interest_would_pay ON public.pricing_interest (would_pay);