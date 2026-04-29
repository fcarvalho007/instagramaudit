-- R4-A.1: Invalidar snapshot atual do handle de teste (frederico.m.carvalho)
-- para forçar repopulação na próxima análise, garantindo captura dos
-- campos R4-A (video_duration, coauthors, tagged_users, location_name,
-- music_title, product_type, caption_length, is_pinned).
--
-- Não apaga a snapshot — apenas marca como expirada. A camada de cache
-- em /api/analyze-public-v1 trata `expires_at <= now()` como miss e
-- volta a chamar o Apify, persistindo o normalized_payload enriquecido.
UPDATE public.analysis_snapshots
SET expires_at = now() - interval '1 second',
    updated_at = now()
WHERE lower(instagram_username) = 'frederico.m.carvalho'
  AND (expires_at IS NULL OR expires_at > now());