ALTER TABLE public.knowledge_benchmarks
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'instagram',
  ADD COLUMN IF NOT EXISTS posts_per_month numeric;

ALTER TABLE public.knowledge_benchmarks
  ALTER COLUMN engagement_pct DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_benchmarks_platform_chk'
  ) THEN
    ALTER TABLE public.knowledge_benchmarks
      ADD CONSTRAINT knowledge_benchmarks_platform_chk
      CHECK (platform IN ('instagram','facebook','linkedin','tiktok','youtube'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS knowledge_benchmarks_platform_format_tier_idx
  ON public.knowledge_benchmarks (platform, format, tier, valid_to);