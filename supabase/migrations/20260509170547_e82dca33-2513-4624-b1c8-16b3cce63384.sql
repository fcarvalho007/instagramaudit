
-- B1.1 — Enable RLS on enrichment_jobs (currently exposed via PostgREST without RLS)
ALTER TABLE public.enrichment_jobs ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: only service_role (which bypasses RLS) can access.
-- All current call sites are server-side server functions / edge routes using service role.

-- B1.2 — Lock down SECURITY DEFINER functions: revoke from anon + authenticated,
-- keep service_role (default has EXECUTE) and grant supabase_auth_admin where needed.

REVOKE EXECUTE ON FUNCTION public.record_analysis_event(text, text, jsonb, text, text, text, text, uuid, uuid, integer, integer, numeric, integer, text, text, text, bigint) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.set_admin_email_session(text) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.link_user_to_existing_reports(uuid, text) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
-- handle_new_user is invoked by a trigger on auth.users; supabase_auth_admin owns that context.
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.set_enrichment_status(uuid, text, text) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.get_knowledge_context(text, text, text) FROM anon, authenticated, public;
