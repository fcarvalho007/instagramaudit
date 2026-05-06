
UPDATE app_config SET value = 'cache_only', updated_at = now() WHERE key = 'analysis_execution_mode';
