-- Create benchmark_references table to move editorial dataset out of code.
CREATE TABLE public.benchmark_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,
  format text NOT NULL,
  engagement_pct numeric(5,2) NOT NULL,
  tier_min_followers bigint NOT NULL,
  tier_max_followers bigint,
  tier_label text NOT NULL,
  dataset_version text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier, format, dataset_version)
);

CREATE INDEX idx_benchmark_active ON public.benchmark_references (is_active, dataset_version);

-- Reuse shared updated_at trigger.
CREATE TRIGGER set_updated_at_benchmark_references
  BEFORE UPDATE ON public.benchmark_references
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Closed RLS baseline: server-only access via service role.
ALTER TABLE public.benchmark_references ENABLE ROW LEVEL SECURITY;

-- Seed initial dataset (v1.0-2025-04). Idempotent via UNIQUE (tier, format, dataset_version).
INSERT INTO public.benchmark_references
  (tier, format, engagement_pct, tier_min_followers, tier_max_followers, tier_label, dataset_version)
VALUES
  ('nano',  'Reels',       5.60, 0,        9999,    'Nano (até 10K)',     'v1.0-2025-04'),
  ('nano',  'Carrosséis',  4.20, 0,        9999,    'Nano (até 10K)',     'v1.0-2025-04'),
  ('nano',  'Imagens',     3.10, 0,        9999,    'Nano (até 10K)',     'v1.0-2025-04'),
  ('micro', 'Reels',       3.20, 10000,    49999,   'Micro (10K–50K)',    'v1.0-2025-04'),
  ('micro', 'Carrosséis',  2.40, 10000,    49999,   'Micro (10K–50K)',    'v1.0-2025-04'),
  ('micro', 'Imagens',     1.80, 10000,    49999,   'Micro (10K–50K)',    'v1.0-2025-04'),
  ('mid',   'Reels',       1.80, 50000,    249999,  'Mid (50K–250K)',     'v1.0-2025-04'),
  ('mid',   'Carrosséis',  1.30, 50000,    249999,  'Mid (50K–250K)',     'v1.0-2025-04'),
  ('mid',   'Imagens',     0.95, 50000,    249999,  'Mid (50K–250K)',     'v1.0-2025-04'),
  ('macro', 'Reels',       1.10, 250000,   999999,  'Macro (250K–1M)',    'v1.0-2025-04'),
  ('macro', 'Carrosséis',  0.80, 250000,   999999,  'Macro (250K–1M)',    'v1.0-2025-04'),
  ('macro', 'Imagens',     0.55, 250000,   999999,  'Macro (250K–1M)',    'v1.0-2025-04'),
  ('mega',  'Reels',       0.70, 1000000,  NULL,    'Mega (1M+)',         'v1.0-2025-04'),
  ('mega',  'Carrosséis',  0.50, 1000000,  NULL,    'Mega (1M+)',         'v1.0-2025-04'),
  ('mega',  'Imagens',     0.35, 1000000,  NULL,    'Mega (1M+)',         'v1.0-2025-04')
ON CONFLICT (tier, format, dataset_version) DO NOTHING;