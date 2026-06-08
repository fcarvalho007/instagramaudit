ALTER TABLE public.credit_ledger
  ADD COLUMN analysis_event_id uuid NULL
  REFERENCES public.analysis_events(id) ON DELETE SET NULL;

CREATE INDEX idx_credit_ledger_analysis_event
  ON public.credit_ledger (analysis_event_id)
  WHERE analysis_event_id IS NOT NULL;