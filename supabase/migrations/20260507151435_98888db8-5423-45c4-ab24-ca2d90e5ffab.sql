ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS commercial_status text NOT NULL DEFAULT 'novo_pedido',
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_commercial_status ON public.leads (commercial_status);