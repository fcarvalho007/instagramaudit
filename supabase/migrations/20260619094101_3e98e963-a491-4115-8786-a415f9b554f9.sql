-- Função helper SECURITY DEFINER para evitar recursão e ler profiles sob privilégio do owner.
CREATE OR REPLACE FUNCTION public.current_user_lead_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lead_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_lead_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_lead_id() TO authenticated, service_role;

-- Política SELECT adicional: ver relatórios cujo lead corresponde ao do utilizador.
DROP POLICY IF EXISTS "Users can view reports via lead" ON public.report_requests;
CREATE POLICY "Users can view reports via lead"
  ON public.report_requests
  FOR SELECT
  TO authenticated
  USING (
    lead_id IS NOT NULL
    AND lead_id = public.current_user_lead_id()
  );
