WITH src AS (
  SELECT
    (p->>'permalink') AS permalink,
    COALESCE((p->>'is_pinned')::boolean, false) AS is_pinned
  FROM public.analysis_snapshots,
       jsonb_array_elements(normalized_payload->'posts') p
  WHERE id = '3cd9340c-da04-4fc2-a79f-235ac0a1192f'
),
rebuilt AS (
  SELECT
    jsonb_agg(
      CASE
        WHEN s.is_pinned IS TRUE
          THEN tp || jsonb_build_object('is_pinned', true)
        ELSE tp
      END
      ORDER BY ord
    ) AS posts
  FROM public.report_snapshots rs,
       jsonb_array_elements(rs.report_payload_jsonb->'posts')
         WITH ORDINALITY AS t(tp, ord)
  LEFT JOIN src s ON s.permalink = tp->>'permalink'
  WHERE rs.id = 'cdec97d1-91a0-4b37-bb66-3b5c6d4b549d'
)
UPDATE public.report_snapshots
SET report_payload_jsonb = jsonb_set(
      report_payload_jsonb,
      '{posts}',
      (SELECT posts FROM rebuilt)
    )
WHERE id = 'cdec97d1-91a0-4b37-bb66-3b5c6d4b549d';