CREATE TABLE public.analysis_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  instagram_username text NOT NULL,
  competitor_usernames jsonb NOT NULL DEFAULT '[]'::jsonb,
  normalized_payload jsonb NOT NULL,
  provider text NOT NULL DEFAULT 'apify',
  analysis_status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX idx_analysis_snapshots_expires_at ON public.analysis_snapshots (expires_at);
CREATE INDEX idx_analysis_snapshots_username ON public.analysis_snapshots (instagram_username);

CREATE TRIGGER set_updated_at_analysis_snapshots
  BEFORE UPDATE ON public.analysis_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.analysis_snapshots ENABLE ROW LEVEL SECURITY;