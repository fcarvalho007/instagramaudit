-- Batch P1-C: performance indexes on product_events
-- All idempotent and partial (exclude NULL prefix rows to keep size small).

CREATE INDEX IF NOT EXISTS idx_product_events_lead_created
  ON public.product_events (lead_id, created_at DESC)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_events_snapshot_type_created
  ON public.product_events (snapshot_id, event_type, created_at DESC)
  WHERE snapshot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_events_handle_type_created
  ON public.product_events (handle, event_type, created_at DESC)
  WHERE handle IS NOT NULL;