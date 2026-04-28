ALTER TABLE public.provider_call_logs
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS prompt_tokens integer,
  ADD COLUMN IF NOT EXISTS completion_tokens integer,
  ADD COLUMN IF NOT EXISTS total_tokens integer;

CREATE INDEX IF NOT EXISTS idx_provider_call_logs_openai
  ON public.provider_call_logs (created_at DESC)
  WHERE provider = 'openai';