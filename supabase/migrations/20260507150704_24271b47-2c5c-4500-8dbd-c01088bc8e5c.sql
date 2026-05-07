-- Product event tracking for beta analytics
CREATE TABLE public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  lead_id uuid,
  snapshot_id uuid,
  handle text,
  actor_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS (no public policies — admin-only via supabaseAdmin)
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

-- Index for admin queries
CREATE INDEX idx_product_events_type_created ON public.product_events (event_type, created_at DESC);