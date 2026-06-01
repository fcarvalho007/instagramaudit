CREATE TABLE public.thumbnail_persistence_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  cache_key text NOT NULL,
  handle text NOT NULL,
  attempted integer NOT NULL DEFAULT 0,
  stored integer NOT NULL DEFAULT 0,
  failed_403 integer NOT NULL DEFAULT 0,
  failed_timeout integer NOT NULL DEFAULT 0,
  failed_invalid_content_type integer NOT NULL DEFAULT 0,
  failed_upload integer NOT NULL DEFAULT 0,
  failed_other integer NOT NULL DEFAULT 0,
  avatar text NOT NULL DEFAULT 'none',
  duration_ms integer
);

GRANT ALL ON public.thumbnail_persistence_runs TO service_role;

ALTER TABLE public.thumbnail_persistence_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_thumbnail_persistence_runs_created_at
  ON public.thumbnail_persistence_runs (created_at DESC);