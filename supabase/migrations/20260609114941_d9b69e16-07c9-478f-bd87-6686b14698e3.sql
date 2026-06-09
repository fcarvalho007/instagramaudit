ALTER TABLE public.lead_payments DROP CONSTRAINT IF EXISTS lead_payments_product_check;
ALTER TABLE public.lead_payments ADD CONSTRAINT lead_payments_product_check
  CHECK (product = ANY (ARRAY[
    'report_single'::text,
    'pack_5'::text,
    'authority_diagnosis_97'::text,
    'report_full_9'::text,
    'credit_pack_1'::text,
    'credits_3'::text,
    'credits_10'::text,
    'credits_25'::text
  ]));