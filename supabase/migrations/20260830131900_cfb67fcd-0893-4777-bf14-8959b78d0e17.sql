ALTER TABLE public.lead_reports
  ADD COLUMN IF NOT EXISTS profile_relationship text,
  ADD COLUMN IF NOT EXISTS relationship_source text;

ALTER TABLE public.lead_reports
  DROP CONSTRAINT IF EXISTS lead_reports_profile_relationship_check;

ALTER TABLE public.lead_reports
  ADD CONSTRAINT lead_reports_profile_relationship_check
  CHECK (profile_relationship IS NULL OR profile_relationship IN ('owner','manages','client','competitor','research'));

ALTER TABLE public.lead_reports
  DROP CONSTRAINT IF EXISTS lead_reports_relationship_source_check;

ALTER TABLE public.lead_reports
  ADD CONSTRAINT lead_reports_relationship_source_check
  CHECK (relationship_source IS NULL OR relationship_source IN ('user_declared','derived'));