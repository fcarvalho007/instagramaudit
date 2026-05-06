
-- Create enrichment_jobs table for async enrichment pipeline
CREATE TABLE public.enrichment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  analysis_event_id uuid,
  handle text NOT NULL,
  enrichment_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  priority integer NOT NULL DEFAULT 50,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  input_hash text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient job processing
CREATE INDEX idx_enrichment_jobs_pending ON public.enrichment_jobs (status, priority) WHERE status = 'pending';
CREATE INDEX idx_enrichment_jobs_snapshot ON public.enrichment_jobs (snapshot_id);

-- Auto-update updated_at
CREATE TRIGGER set_enrichment_jobs_updated_at
  BEFORE UPDATE ON public.enrichment_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
