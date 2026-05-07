
CREATE TABLE public.report_variant_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant text NOT NULL,
  is_draft boolean NOT NULL DEFAULT true,
  features_json jsonb NOT NULL,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variant, is_draft)
);

ALTER TABLE public.report_variant_overrides ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_report_variant_overrides
  BEFORE UPDATE ON public.report_variant_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
