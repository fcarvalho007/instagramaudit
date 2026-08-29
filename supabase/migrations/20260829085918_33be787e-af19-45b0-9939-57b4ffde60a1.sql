CREATE TABLE IF NOT EXISTS public.apify_run_leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_key text NOT NULL UNIQUE,
  context text,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

GRANT ALL ON public.apify_run_leases TO service_role;

ALTER TABLE public.apify_run_leases ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS apify_run_leases_expires_at_idx
  ON public.apify_run_leases (expires_at);

CREATE OR REPLACE FUNCTION public.acquire_apify_run_lease(
  p_lease_key text,
  p_max integer DEFAULT 4,
  p_ttl_seconds integer DEFAULT 180
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer;
BEGIN
  DELETE FROM public.apify_run_leases WHERE expires_at < now();

  INSERT INTO public.apify_run_leases (lease_key, expires_at)
  SELECT p_lease_key, now() + make_interval(secs => GREATEST(p_ttl_seconds, 10))
  WHERE (SELECT count(*) FROM public.apify_run_leases) < GREATEST(p_max, 1)
  ON CONFLICT (lease_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_apify_run_lease(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_apify_run_lease(text, integer, integer) TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.release_apify_run_lease(p_lease_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.apify_run_leases WHERE lease_key = p_lease_key;
$$;

REVOKE ALL ON FUNCTION public.release_apify_run_lease(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_apify_run_lease(text) TO service_role, postgres;

CREATE UNIQUE INDEX IF NOT EXISTS comment_enrichment_jobs_active_snapshot_uidx
  ON public.comment_enrichment_jobs (snapshot_id)
  WHERE status IN ('pending', 'processing');