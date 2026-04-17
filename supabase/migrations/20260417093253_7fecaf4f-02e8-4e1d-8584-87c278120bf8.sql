-- 1. Drop legacy report_requests (will be recreated with new schema)
DROP TABLE IF EXISTS public.report_requests CASCADE;

-- 2. Shared trigger function for updated_at maintenance
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. leads table
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_normalized text NOT NULL UNIQUE,
  name text NOT NULL,
  company text,
  source text NOT NULL DEFAULT 'public_report_gate',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. report_requests table (new normalized schema)
CREATE TABLE public.report_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  instagram_username text NOT NULL,
  competitor_usernames jsonb NOT NULL DEFAULT '[]'::jsonb,
  request_source text NOT NULL DEFAULT 'public_dashboard',
  request_status text NOT NULL DEFAULT 'pending',
  delivery_status text NOT NULL DEFAULT 'not_sent',
  is_free_request boolean NOT NULL DEFAULT true,
  request_month date NOT NULL DEFAULT date_trunc('month', now())::date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_report_requests_updated_at
  BEFORE UPDATE ON public.report_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. Indexes
CREATE INDEX idx_report_requests_lead_id ON public.report_requests(lead_id);
CREATE INDEX idx_report_requests_instagram_username ON public.report_requests(instagram_username);
CREATE INDEX idx_report_requests_request_month ON public.report_requests(request_month);
CREATE INDEX idx_report_requests_lead_month ON public.report_requests(lead_id, request_month);

-- 6. RLS — closed baseline (no policies; access policies will be added later)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_requests ENABLE ROW LEVEL SECURITY;