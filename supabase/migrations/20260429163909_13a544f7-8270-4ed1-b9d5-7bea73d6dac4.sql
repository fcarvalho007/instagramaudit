CREATE OR REPLACE FUNCTION public.set_admin_email_session(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_admin_email', COALESCE(p_email, ''), false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_admin_email_session(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_admin_email_session(text) FROM anon, authenticated;