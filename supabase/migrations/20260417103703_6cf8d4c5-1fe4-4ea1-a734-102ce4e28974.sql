-- Add minimal PDF tracking fields to report_requests
ALTER TABLE public.report_requests
  ADD COLUMN IF NOT EXISTS pdf_status text NOT NULL DEFAULT 'not_generated',
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS pdf_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_error_message text;

-- Private bucket for generated report PDFs.
-- PDFs are personalized per lead and must never be publicly addressable.
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-pdfs', 'report-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- No storage RLS policies declared on purpose: bucket is accessed exclusively
-- through the service role (supabaseAdmin), which bypasses RLS. Lack of policies
-- means no anon/authenticated client can read or write objects directly.