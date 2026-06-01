CREATE TABLE public.apify_lab_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  admin_email text,
  profile_handle text NOT NULL,
  profile_segment text,
  window_kind text NOT NULL,
  input_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  guardrails jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL,
  semantic_code text,
  apify_run_id text,
  posts_returned integer,
  newest_post_at timestamptz,
  oldest_post_at timestamptz,
  observed_days integer,
  duration_ms integer,
  estimated_cost_usd numeric(12,5),
  actual_cost_usd numeric(12,5),
  normalize_ok boolean,
  notes text,
  error_excerpt text
);

CREATE INDEX idx_apify_lab_runs_created_at ON public.apify_lab_runs (created_at DESC);
CREATE INDEX idx_apify_lab_runs_handle ON public.apify_lab_runs (profile_handle, created_at DESC);

GRANT ALL ON public.apify_lab_runs TO service_role;

ALTER TABLE public.apify_lab_runs ENABLE ROW LEVEL SECURITY;
