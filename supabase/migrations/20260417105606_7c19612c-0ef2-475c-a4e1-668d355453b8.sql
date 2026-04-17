CREATE INDEX IF NOT EXISTS report_requests_request_status_idx
  ON public.report_requests (request_status, created_at DESC);