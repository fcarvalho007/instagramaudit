-- Link each report request to the exact analysis snapshot that motivated it.
-- Nullable + ON DELETE SET NULL: future snapshot GC must not erase lead conversion evidence.
ALTER TABLE public.report_requests
  ADD COLUMN IF NOT EXISTS analysis_snapshot_id uuid
  REFERENCES public.analysis_snapshots(id) ON DELETE SET NULL;

-- Partial index: only meaningful for rows with an actual link.
CREATE INDEX IF NOT EXISTS idx_report_requests_snapshot
  ON public.report_requests (analysis_snapshot_id)
  WHERE analysis_snapshot_id IS NOT NULL;