-- 1. Renomear authority_diagnosis_49 → _97 em lead_payments + lead_entitlements
UPDATE public.lead_payments
   SET product = 'authority_diagnosis_97'
 WHERE product = 'authority_diagnosis_49';

UPDATE public.lead_entitlements
   SET product_code = 'authority_diagnosis_97'
 WHERE product_code = 'authority_diagnosis_49';

-- Atualizar a CHECK constraint do product (drop + recreate sem o _49)
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.lead_payments'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%authority_diagnosis_49%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.lead_payments DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE public.lead_payments
  ADD CONSTRAINT lead_payments_product_check
  CHECK (product IN ('report_single','pack_5','authority_diagnosis_97','report_full_9'));

-- 2. payment_coupons
CREATE TABLE public.payment_coupons (
  code             text PRIMARY KEY,
  discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  applies_to       text[]  NOT NULL DEFAULT ARRAY[]::text[],
  max_uses         integer,
  uses             integer NOT NULL DEFAULT 0,
  expires_at       timestamptz,
  active           boolean NOT NULL DEFAULT true,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.payment_coupons TO service_role;

ALTER TABLE public.payment_coupons ENABLE ROW LEVEL SECURITY;

-- Sem políticas para anon/authenticated: só service_role acede via supabaseAdmin

CREATE TRIGGER trg_payment_coupons_updated_at
BEFORE UPDATE ON public.payment_coupons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. coupon_redemptions
CREATE TABLE public.coupon_redemptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code  text NOT NULL REFERENCES public.payment_coupons(code) ON DELETE CASCADE,
  lead_id      uuid,
  payment_id   uuid REFERENCES public.lead_payments(id) ON DELETE SET NULL,
  product_code text NOT NULL,
  redeemed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_coupon_redemptions_payment
  ON public.coupon_redemptions(payment_id)
  WHERE payment_id IS NOT NULL;

CREATE INDEX idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_code);

GRANT ALL ON public.coupon_redemptions TO service_role;

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- 4. service_inquiries
CREATE TABLE public.service_inquiries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  company     text,
  topic       text NOT NULL CHECK (topic IN ('auditoria','formacao','agencia','outro')),
  message     text NOT NULL,
  ip_hash     text,
  user_agent  text,
  referrer    text,
  status      text NOT NULL DEFAULT 'novo',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_inquiries_created_at ON public.service_inquiries(created_at DESC);
CREATE INDEX idx_service_inquiries_topic ON public.service_inquiries(topic);

GRANT ALL ON public.service_inquiries TO service_role;

ALTER TABLE public.service_inquiries ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_service_inquiries_updated_at
BEFORE UPDATE ON public.service_inquiries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();