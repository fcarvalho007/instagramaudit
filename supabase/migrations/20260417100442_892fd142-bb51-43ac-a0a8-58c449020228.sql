-- Add FK report_requests.lead_id -> leads.id (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_requests_lead_id_fkey'
  ) THEN
    ALTER TABLE public.report_requests
      ADD CONSTRAINT report_requests_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Partial index supporting the monthly free-quota count hot path
CREATE INDEX IF NOT EXISTS idx_report_requests_free_quota
  ON public.report_requests (lead_id, request_month)
  WHERE is_free_request = true;