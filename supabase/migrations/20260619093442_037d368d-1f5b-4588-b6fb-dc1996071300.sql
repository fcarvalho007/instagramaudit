
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS instagram_handle text;
CREATE INDEX IF NOT EXISTS leads_instagram_handle_idx ON public.leads (lower(instagram_handle));
