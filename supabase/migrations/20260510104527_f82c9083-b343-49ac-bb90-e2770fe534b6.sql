-- Drop 7 índices duplicados (mesma coluna, naming antigo). Mantemos os `idx_*`.
DROP INDEX IF EXISTS public.analysis_events_created_at_idx;
DROP INDEX IF EXISTS public.analysis_events_data_source_idx;
DROP INDEX IF EXISTS public.analysis_events_handle_idx;
DROP INDEX IF EXISTS public.analysis_events_outcome_idx;
DROP INDEX IF EXISTS public.social_profiles_cost_idx;
DROP INDEX IF EXISTS public.social_profiles_last_analyzed_idx;
DROP INDEX IF EXISTS public.social_profiles_total_idx;