CREATE UNIQUE INDEX IF NOT EXISTS report_requests_lead_snapshot_unique
  ON public.report_requests (lead_id, analysis_snapshot_id)
  WHERE analysis_snapshot_id IS NOT NULL;