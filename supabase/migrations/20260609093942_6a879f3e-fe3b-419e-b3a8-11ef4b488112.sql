INSERT INTO public.app_config (key, value, updated_by)
VALUES
  ('pro_window_90d_enabled', 'true', 'system_migration'),
  ('apify_pro_window_profile_daily_cap_usd', '5.50', 'system_migration'),
  ('apify_90d_daily_cap_usd', '20', 'system_migration')
ON CONFLICT (key) DO NOTHING;