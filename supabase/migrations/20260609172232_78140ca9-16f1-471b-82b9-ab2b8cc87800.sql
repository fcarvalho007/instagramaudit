DO $$
DECLARE
  v_emails text[] := ARRAY['fredericodigital@gmail.com','frederico.carvalho@digitalfc.pt'];
  v_lead_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_lead_ids
  FROM public.leads
  WHERE email_normalized = ANY(v_emails);

  IF v_lead_ids IS NOT NULL THEN
    UPDATE public.profiles SET lead_id = NULL WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.beta_feedback        WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.report_snapshots     WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.report_requests      WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.product_events       WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.lead_payments        WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.credit_ledger        WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.lead_entitlements    WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.lead_report_unlocks  WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.coupon_redemptions   WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.lead_reports         WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.leads                WHERE id      = ANY(v_lead_ids);
  END IF;

  DELETE FROM auth.users WHERE lower(email) = ANY(v_emails);
END $$;