-- 1. FORCE RLS em tabelas com PII / sensíveis (defense-in-depth; service role continua a bypassar)
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.report_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.product_events FORCE ROW LEVEL SECURITY;

-- 2. REVOKE acesso a anon + authenticated em tabelas service-role-only
-- (NÃO incluir profiles e report_requests — têm policies para authenticated)
REVOKE ALL ON TABLE
  public.leads,
  public.product_events,
  public.analysis_events,
  public.analysis_snapshots,
  public.social_profiles,
  public.provider_call_logs,
  public.app_config,
  public.cost_daily,
  public.provider_billing_imports,
  public.provider_billing_import_batches,
  public.usage_alerts,
  public.knowledge_benchmarks,
  public.knowledge_history,
  public.knowledge_notes,
  public.knowledge_sources,
  public.knowledge_suggestions,
  public.enrichment_jobs,
  public.comment_enrichment_jobs,
  public.report_variant_overrides,
  public.beta_feedback,
  public.benchmark_references
FROM anon, authenticated;

-- 3. Documentar intenção
COMMENT ON TABLE public.leads IS 'PII (emails). Service-role only via server functions. RLS forced.';
COMMENT ON TABLE public.product_events IS 'Analytics interno. Service-role only. RLS forced.';
COMMENT ON TABLE public.analysis_events IS 'Service-role only via server functions.';
COMMENT ON TABLE public.analysis_snapshots IS 'Service-role only via server functions.';
COMMENT ON TABLE public.social_profiles IS 'Service-role only via server functions.';
COMMENT ON TABLE public.provider_call_logs IS 'Service-role only. Custos e diagnósticos de providers.';
COMMENT ON TABLE public.app_config IS 'Service-role only. Configuração admin.';
COMMENT ON TABLE public.cost_daily IS 'Service-role only. Reconciliação de custos.';
COMMENT ON TABLE public.provider_billing_imports IS 'Service-role only. Imports de billing.';
COMMENT ON TABLE public.provider_billing_import_batches IS 'Service-role only.';
COMMENT ON TABLE public.usage_alerts IS 'Service-role only. Alertas de abuso.';
COMMENT ON TABLE public.knowledge_benchmarks IS 'Service-role only. Knowledge base admin.';
COMMENT ON TABLE public.knowledge_history IS 'Service-role only. Auditoria knowledge base.';
COMMENT ON TABLE public.knowledge_notes IS 'Service-role only. Knowledge base admin.';
COMMENT ON TABLE public.knowledge_sources IS 'Service-role only. Knowledge base admin.';
COMMENT ON TABLE public.knowledge_suggestions IS 'Service-role only. Sugestões IA pendentes de revisão.';
COMMENT ON TABLE public.enrichment_jobs IS 'Service-role only. Workers internos.';
COMMENT ON TABLE public.comment_enrichment_jobs IS 'Service-role only. Workers internos.';
COMMENT ON TABLE public.report_variant_overrides IS 'Service-role only. Admin overrides.';
COMMENT ON TABLE public.beta_feedback IS 'PII. Service-role only. Acedido via server fn autenticado.';
COMMENT ON TABLE public.benchmark_references IS 'Service-role only. Referências de benchmark.';
COMMENT ON TABLE public.profiles IS 'Perfil público do utilizador. RLS: utilizador vê/edita o seu próprio. RLS forced.';
COMMENT ON TABLE public.report_requests IS 'Relatórios pedidos. RLS: utilizador vê os seus. RLS forced.';