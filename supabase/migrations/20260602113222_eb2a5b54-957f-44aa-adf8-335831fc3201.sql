-- Apify cost accounting: source_context taxonomy + Lab→pcl mirror

-- 1. Add source_context column with safe default
ALTER TABLE public.provider_call_logs
  ADD COLUMN IF NOT EXISTS source_context text NOT NULL DEFAULT 'unknown';

-- 2. Index for filtered aggregations
CREATE INDEX IF NOT EXISTS provider_call_logs_source_context_idx
  ON public.provider_call_logs (source_context, created_at DESC);

-- 3. Partial unique index for Lab mirror idempotency
CREATE UNIQUE INDEX IF NOT EXISTS provider_call_logs_lab_run_unique
  ON public.provider_call_logs (apify_run_id)
  WHERE source_context = 'admin_lab' AND apify_run_id IS NOT NULL;

-- 4. Backfill existing rows
-- 4a. Comment scraper runs (actor contains "comment")
UPDATE public.provider_call_logs
  SET source_context = 'enrich_comments'
  WHERE source_context = 'unknown'
    AND provider = 'apify'
    AND actor ILIKE '%comment%';

-- 4b. Apify rows linked to an analysis event → public analysis
UPDATE public.provider_call_logs
  SET source_context = 'public_analysis'
  WHERE source_context = 'unknown'
    AND provider = 'apify'
    AND analysis_event_id IS NOT NULL;

-- 4c. OpenAI insights are only called from public analysis today
UPDATE public.provider_call_logs
  SET source_context = 'public_analysis'
  WHERE source_context = 'unknown'
    AND provider = 'openai';

-- 4d. DataForSEO market signals are only called from public analysis today
UPDATE public.provider_call_logs
  SET source_context = 'public_analysis'
  WHERE source_context = 'unknown'
    AND provider = 'dataforseo';

-- 5. Mirror function: writes/updates a provider_call_logs row for each
--    apify_lab_runs row, so Lab cost shows up in global accounting.
CREATE OR REPLACE FUNCTION public.mirror_apify_lab_to_provider_call_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  -- Map lab status onto the pcl status vocabulary (success / error / running…)
  v_status := COALESCE(NEW.status, 'unknown');

  IF NEW.apify_run_id IS NULL THEN
    -- Without a run id we cannot dedupe; insert once on INSERT, skip on UPDATE.
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.provider_call_logs (
        provider, actor, network, handle,
        status, duration_ms, posts_returned,
        estimated_cost_usd, actual_cost_usd,
        apify_run_id, error_excerpt, source_context, created_at
      ) VALUES (
        'apify',
        COALESCE(NEW.mode, 'apify-lab'),
        'instagram',
        NEW.profile_handle,
        v_status,
        NEW.duration_ms,
        COALESCE(NEW.posts_returned, 0),
        NEW.estimated_cost_usd,
        NEW.actual_cost_usd,
        NULL,
        NEW.error_excerpt,
        'admin_lab',
        NEW.created_at
      );
    END IF;
    RETURN NEW;
  END IF;

  -- With a run id we can upsert idempotently (partial unique index above).
  INSERT INTO public.provider_call_logs (
    provider, actor, network, handle,
    status, duration_ms, posts_returned,
    estimated_cost_usd, actual_cost_usd,
    apify_run_id, error_excerpt, source_context, created_at
  ) VALUES (
    'apify',
    COALESCE(NEW.mode, 'apify-lab'),
    'instagram',
    NEW.profile_handle,
    v_status,
    NEW.duration_ms,
    COALESCE(NEW.posts_returned, 0),
    NEW.estimated_cost_usd,
    NEW.actual_cost_usd,
    NEW.apify_run_id,
    NEW.error_excerpt,
    'admin_lab',
    NEW.created_at
  )
  ON CONFLICT (apify_run_id) WHERE source_context = 'admin_lab' AND apify_run_id IS NOT NULL
  DO UPDATE SET
    status              = EXCLUDED.status,
    duration_ms         = EXCLUDED.duration_ms,
    posts_returned      = EXCLUDED.posts_returned,
    estimated_cost_usd  = EXCLUDED.estimated_cost_usd,
    actual_cost_usd     = EXCLUDED.actual_cost_usd,
    error_excerpt       = EXCLUDED.error_excerpt;

  RETURN NEW;
END;
$$;

-- 6. Trigger on apify_lab_runs (insert + relevant updates)
DROP TRIGGER IF EXISTS apify_lab_runs_mirror_aiu ON public.apify_lab_runs;
CREATE TRIGGER apify_lab_runs_mirror_aiu
AFTER INSERT OR UPDATE OF status, estimated_cost_usd, actual_cost_usd,
                          posts_returned, duration_ms, apify_run_id
ON public.apify_lab_runs
FOR EACH ROW
EXECUTE FUNCTION public.mirror_apify_lab_to_provider_call_logs();

-- 7. Backfill 36 existing Lab rows by firing the trigger as a no-op update.
UPDATE public.apify_lab_runs
  SET status = status;
