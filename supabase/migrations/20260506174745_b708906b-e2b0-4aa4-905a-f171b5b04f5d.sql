CREATE OR REPLACE FUNCTION public.set_enrichment_status(
  p_snapshot_id uuid,
  p_key text,
  p_value text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE analysis_snapshots
  SET normalized_payload = jsonb_set(
        jsonb_set(
          normalized_payload,
          '{enrichment_status}',
          COALESCE(normalized_payload->'enrichment_status', '{}'::jsonb)
        ),
        ARRAY['enrichment_status', p_key],
        to_jsonb(p_value)
      ),
      updated_at = now()
  WHERE id = p_snapshot_id;
$$;