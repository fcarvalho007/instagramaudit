ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_normalized text;

CREATE INDEX IF NOT EXISTS leads_phone_normalized_idx
  ON public.leads (phone_normalized)
  WHERE phone_normalized IS NOT NULL;