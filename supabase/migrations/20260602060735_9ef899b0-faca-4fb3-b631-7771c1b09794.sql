ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS gdpr_consent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS gdpr_consent_version text NULL;