CREATE INDEX IF NOT EXISTS idx_provider_call_logs_dataforseo
  ON public.provider_call_logs (created_at DESC)
  WHERE provider = 'dataforseo';