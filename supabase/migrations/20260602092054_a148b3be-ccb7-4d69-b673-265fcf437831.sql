-- 1) Cleanup: para cada (lead_id, cache_key) com >1 reserve, manter o
--    mais antigo e remover os surplus + os respetivos confirm rows.
WITH surplus AS (
  SELECT id, reservation_id
  FROM (
    SELECT id, reservation_id,
           ROW_NUMBER() OVER (
             PARTITION BY lead_id, cache_key
             ORDER BY created_at ASC
           ) AS rn
    FROM public.credit_ledger
    WHERE reason = 'reserve' AND cache_key IS NOT NULL
  ) ranked
  WHERE rn > 1
)
DELETE FROM public.credit_ledger
WHERE reservation_id IN (SELECT reservation_id FROM surplus WHERE reservation_id IS NOT NULL)
  AND reason IN ('reserve', 'confirm', 'release');

-- 2) Índice único parcial: uma reserva ativa por (lead_id, cache_key).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_credit_ledger_reserve_per_report
  ON public.credit_ledger (lead_id, cache_key)
  WHERE reason = 'reserve' AND cache_key IS NOT NULL;