REVOKE EXECUTE ON FUNCTION public.acquire_apify_run_lease(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_apify_run_lease(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_apify_run_lease(text, integer, integer) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.release_apify_run_lease(text) TO service_role, postgres;