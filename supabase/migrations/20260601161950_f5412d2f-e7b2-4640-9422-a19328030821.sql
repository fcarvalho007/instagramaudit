CREATE TABLE public.lead_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  handle text NOT NULL,
  cache_key text NOT NULL,
  analysis_snapshot_id uuid,
  source text NOT NULL DEFAULT 'analyze_public_v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, cache_key)
);

CREATE INDEX idx_lead_reports_lead ON public.lead_reports(lead_id);
CREATE INDEX idx_lead_reports_cache_key ON public.lead_reports(cache_key);

GRANT ALL ON public.lead_reports TO service_role;

ALTER TABLE public.lead_reports ENABLE ROW LEVEL SECURITY;
-- Sem políticas para anon/authenticated: leitura e escrita só via service role
-- (mesmo modelo de credit_ledger e leads).