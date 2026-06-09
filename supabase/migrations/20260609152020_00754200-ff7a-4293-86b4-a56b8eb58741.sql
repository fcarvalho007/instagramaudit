-- Wallet append-only para "unlocks" de relatório Pro adquiridos via packs
-- (report_pack_5 / report_pack_10). Separado do credit_ledger (créditos de
-- análise) e do lead_entitlements (entitlement booleano global).
--
-- Modelo: balance = SUM(delta).
--   pack_grant  : +N (1 linha por payment_id, idempotente)
--   unlock      : -1 (consumido ao abrir relatório Pro de um cache_key)
--   admin_adjust: +/- N (correções manuais)

CREATE TABLE public.lead_report_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('pack_grant', 'unlock', 'admin_adjust')),
  payment_id uuid REFERENCES public.lead_payments(id) ON DELETE SET NULL,
  report_cache_key text,
  instagram_username text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotência do grant: 1 pack_grant por payment.
CREATE UNIQUE INDEX uniq_report_unlocks_pack_grant
  ON public.lead_report_unlocks (payment_id)
  WHERE reason = 'pack_grant' AND payment_id IS NOT NULL;

-- Idempotência do consumo: 1 unlock por (lead, cache_key).
CREATE UNIQUE INDEX uniq_report_unlocks_per_cache_key
  ON public.lead_report_unlocks (lead_id, report_cache_key)
  WHERE reason = 'unlock' AND report_cache_key IS NOT NULL;

CREATE INDEX idx_report_unlocks_lead_created
  ON public.lead_report_unlocks (lead_id, created_at DESC);

-- Sem acesso anon/authenticated: tudo passa por service_role (webhook +
-- server functions). RLS habilitado defensivamente.
GRANT ALL ON public.lead_report_unlocks TO service_role;

ALTER TABLE public.lead_report_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access" ON public.lead_report_unlocks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RPC para ler o balance num único round-trip.
CREATE OR REPLACE FUNCTION public.report_unlocks_balance(p_lead_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(delta), 0)::integer
  FROM public.lead_report_unlocks
  WHERE lead_id = p_lead_id;
$$;

REVOKE ALL ON FUNCTION public.report_unlocks_balance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_unlocks_balance(uuid) TO service_role;