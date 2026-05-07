-- Add beta-specific columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS user_type text,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS profile_ownership text,
  ADD COLUMN IF NOT EXISTS beta_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS beta_consent_at timestamptz;