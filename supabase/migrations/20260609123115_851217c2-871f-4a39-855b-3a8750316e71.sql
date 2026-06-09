ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS email_domain_class TEXT;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_email_domain_class_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_email_domain_class_check
  CHECK (
    email_domain_class IS NULL
    OR email_domain_class IN ('professional_domain','consumer_domain','disposable_or_suspicious')
  );

CREATE INDEX IF NOT EXISTS leads_qualification_idx
  ON public.leads (qualification)
  WHERE qualification IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_email_domain_class_idx
  ON public.leads (email_domain_class)
  WHERE email_domain_class IS NOT NULL;