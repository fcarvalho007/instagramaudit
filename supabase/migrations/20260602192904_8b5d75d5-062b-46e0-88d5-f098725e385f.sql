-- 1) Lock down SECURITY DEFINER functions: revoke implicit PUBLIC EXECUTE,
--    grant only to service_role. All RPC callers use the admin client.

REVOKE EXECUTE ON FUNCTION public.credit_balance(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.credit_balance(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_knowledge_context(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_knowledge_context(text, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.knowledge_log_change() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.knowledge_log_change() TO service_role;

REVOKE EXECUTE ON FUNCTION public.link_user_to_existing_reports(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.link_user_to_existing_reports(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.log_email_template_history() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.log_email_template_history() TO service_role;

REVOKE EXECUTE ON FUNCTION public.mirror_apify_lab_to_provider_call_logs() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.mirror_apify_lab_to_provider_call_logs() TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_analysis_event(
  text, text, jsonb, text, text, text, text, uuid, uuid, integer, integer, numeric, integer, text, text, text, bigint
) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.record_analysis_event(
  text, text, jsonb, text, text, text, text, uuid, uuid, integer, integer, numeric, integer, text, text, text, bigint
) TO service_role;

REVOKE EXECUTE ON FUNCTION public.set_admin_email_session(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.set_admin_email_session(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.set_enrichment_status(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.set_enrichment_status(uuid, text, text) TO service_role;

-- 2) Storage: restrict the private `report-pdfs` bucket. Add explicit
--    deny-to-non-service policies so the bucket is unreachable via the
--    anon/authenticated keys even if someone adds a permissive grant later.

DROP POLICY IF EXISTS "report-pdfs service role only select" ON storage.objects;
DROP POLICY IF EXISTS "report-pdfs service role only insert" ON storage.objects;
DROP POLICY IF EXISTS "report-pdfs service role only update" ON storage.objects;
DROP POLICY IF EXISTS "report-pdfs service role only delete" ON storage.objects;

CREATE POLICY "report-pdfs service role only select"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'report-pdfs');

CREATE POLICY "report-pdfs service role only insert"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'report-pdfs');

CREATE POLICY "report-pdfs service role only update"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'report-pdfs')
WITH CHECK (bucket_id = 'report-pdfs');

CREATE POLICY "report-pdfs service role only delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'report-pdfs');