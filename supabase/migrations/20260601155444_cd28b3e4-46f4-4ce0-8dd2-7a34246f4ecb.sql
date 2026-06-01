-- 1) Append-only ledger of credit movements per lead.
CREATE TABLE public.credit_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL CHECK (reason IN (
    'initial_grant',
    'reserve',
    'confirm',
    'release',
    'admin_adjust'
  )),
  handle text NULL,
  cache_key text NULL,
  analysis_snapshot_id uuid NULL,
  reservation_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_ledger_lead_created
  ON public.credit_ledger (lead_id, created_at DESC);

CREATE INDEX idx_credit_ledger_reservation
  ON public.credit_ledger (reservation_id)
  WHERE reservation_id IS NOT NULL;

-- Idempotency for initial grant: at most one per lead.
CREATE UNIQUE INDEX uniq_credit_ledger_initial_grant
  ON public.credit_ledger (lead_id)
  WHERE reason = 'initial_grant';

-- 2) GRANTs. Backend-only via service role; no anon/authenticated access.
GRANT ALL ON public.credit_ledger TO service_role;

-- 3) RLS enabled with no policies => no direct access for anon/authenticated.
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- 4) Balance helper (security definer so it can be reused from triggers/server fns
-- without granting table read to other roles).
CREATE OR REPLACE FUNCTION public.credit_balance(p_lead_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(delta), 0)::integer
  FROM public.credit_ledger
  WHERE lead_id = p_lead_id;
$$;

REVOKE ALL ON FUNCTION public.credit_balance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_balance(uuid) TO service_role;