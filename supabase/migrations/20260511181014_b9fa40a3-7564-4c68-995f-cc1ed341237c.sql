ALTER TABLE public.report_snapshots
  DROP CONSTRAINT IF EXISTS report_snapshots_report_request_id_key;

DROP INDEX IF EXISTS public.report_snapshots_report_request_id_idx;

CREATE UNIQUE INDEX IF NOT EXISTS report_snapshots_report_request_id_unique
  ON public.report_snapshots(report_request_id)
  WHERE report_request_id IS NOT NULL;