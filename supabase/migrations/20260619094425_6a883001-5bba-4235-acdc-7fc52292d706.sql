-- Backfill
UPDATE public.report_requests SET pdf_status = 'generated' WHERE pdf_status = 'ready';
UPDATE public.report_requests SET request_status = 'completed' WHERE request_status = 'unlocked';

-- Trigger normalizador defensivo
CREATE OR REPLACE FUNCTION public.normalize_report_request_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.pdf_status = 'ready' THEN
    NEW.pdf_status := 'generated';
  END IF;
  IF NEW.request_status = 'unlocked' THEN
    NEW.request_status := 'completed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS report_requests_normalize_status ON public.report_requests;
CREATE TRIGGER report_requests_normalize_status
  BEFORE INSERT OR UPDATE ON public.report_requests
  FOR EACH ROW EXECUTE FUNCTION public.normalize_report_request_status();
