ALTER TABLE public.provider_call_logs
  ADD COLUMN IF NOT EXISTS credits_charged numeric,
  ADD COLUMN IF NOT EXISTS credits_remaining numeric,
  ADD COLUMN IF NOT EXISTS cached boolean,
  ADD COLUMN IF NOT EXISTS endpoint text;

CREATE INDEX IF NOT EXISTS provider_call_logs_provider_created_idx
  ON public.provider_call_logs (provider, created_at DESC);