ALTER TABLE public.apify_lab_runs
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS results_type text,
  ADD COLUMN IF NOT EXISTS results_limit integer,
  ADD COLUMN IF NOT EXISTS only_posts_newer_than text,
  ADD COLUMN IF NOT EXISTS raw_items_returned integer,
  ADD COLUMN IF NOT EXISTS posts_extracted integer,
  ADD COLUMN IF NOT EXISTS profile_metadata_present boolean;