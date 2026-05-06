-- One-time cleanup: strip _thumbnail_base64 from snapshots where visual_cover succeeded
UPDATE analysis_snapshots
SET normalized_payload = normalized_payload - '_thumbnail_base64',
    updated_at = now()
WHERE normalized_payload ? '_thumbnail_base64'
  AND normalized_payload -> 'enrichment_status' ->> 'visual_cover' = 'success';