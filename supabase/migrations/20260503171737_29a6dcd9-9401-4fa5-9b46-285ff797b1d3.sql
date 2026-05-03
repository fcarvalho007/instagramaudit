CREATE TABLE public.comment_enrichment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  analysis_event_id uuid,
  handle text NOT NULL,
  post_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for polling/admin queries
CREATE INDEX idx_cej_status ON public.comment_enrichment_jobs (status);
CREATE INDEX idx_cej_snapshot ON public.comment_enrichment_jobs (snapshot_id);

-- Prevent duplicate pending/processing jobs for the same snapshot
CREATE UNIQUE INDEX idx_cej_snapshot_pending
  ON public.comment_enrichment_jobs (snapshot_id)
  WHERE status IN ('pending', 'processing');

-- Auto-update timestamp
CREATE TRIGGER set_updated_at_cej
  BEFORE UPDATE ON public.comment_enrichment_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.comment_enrichment_jobs ENABLE ROW LEVEL SECURITY;