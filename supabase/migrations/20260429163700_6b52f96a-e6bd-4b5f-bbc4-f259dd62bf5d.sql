-- =====================================================================
-- Knowledge Base — armazena benchmarks editoriais, fontes, notas e
-- sugestões automáticas que alimentam a IA dos relatórios.
-- =====================================================================

-- ---------- 1. knowledge_sources ----------
CREATE TABLE public.knowledge_sources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  type          text CHECK (type IN ('study', 'dataset', 'api', 'internal')),
  url           text,
  published_at  date,
  sample_size   integer,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

-- ---------- 2. knowledge_benchmarks ----------
CREATE TABLE public.knowledge_benchmarks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier            text NOT NULL CHECK (tier IN ('nano', 'micro', 'mid', 'macro')),
  format          text NOT NULL CHECK (format IN ('reels', 'carousels', 'images')),
  engagement_pct  numeric(5,3) NOT NULL,
  sample_size     integer NOT NULL,
  source_id       uuid REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  notes           text,
  valid_from      date NOT NULL,
  valid_to        date,
  origin          text NOT NULL CHECK (origin IN ('manual', 'system_suggested', 'system_approved')),
  created_by_email text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_benchmarks_tier_format
  ON public.knowledge_benchmarks (tier, format)
  WHERE valid_to IS NULL;

ALTER TABLE public.knowledge_benchmarks ENABLE ROW LEVEL SECURITY;

-- ---------- 3. knowledge_notes ----------
CREATE TABLE public.knowledge_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category        text NOT NULL CHECK (category IN ('trend', 'format', 'algorithm', 'vertical', 'tool')),
  vertical        text,
  title           text NOT NULL,
  body            text NOT NULL,
  source_id       uuid REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  valid_from      date,
  valid_to        date,
  archived        boolean NOT NULL DEFAULT false,
  created_by_email text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_notes ENABLE ROW LEVEL SECURITY;

-- ---------- 4. knowledge_history (auditoria) ----------
CREATE TABLE public.knowledge_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type       text NOT NULL CHECK (entity_type IN ('benchmark', 'source', 'note')),
  entity_id         uuid NOT NULL,
  action            text NOT NULL CHECK (action IN ('created', 'updated', 'archived')),
  diff              jsonb,
  changed_by_email  text,
  changed_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_history_entity
  ON public.knowledge_history (entity_type, entity_id, changed_at DESC);

ALTER TABLE public.knowledge_history ENABLE ROW LEVEL SECURITY;

-- ---------- 5. knowledge_suggestions ----------
CREATE TABLE public.knowledge_suggestions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type              text NOT NULL CHECK (type IN ('benchmark_update', 'new_pattern', 'outdated')),
  payload           jsonb NOT NULL,
  reason            text,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by_email text,
  reviewed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_suggestions_pending
  ON public.knowledge_suggestions (created_at DESC)
  WHERE status = 'pending';

ALTER TABLE public.knowledge_suggestions ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- Trigger updated_at (reaproveita a função existente set_updated_at)
-- =====================================================================
CREATE TRIGGER trg_knowledge_sources_updated_at
  BEFORE UPDATE ON public.knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_knowledge_benchmarks_updated_at
  BEFORE UPDATE ON public.knowledge_benchmarks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_knowledge_notes_updated_at
  BEFORE UPDATE ON public.knowledge_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- Trigger de auditoria knowledge_history
-- O autor é lido de current_setting('app.current_admin_email', true),
-- que o helper TS define com SET LOCAL antes de cada operação.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.knowledge_log_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_type text;
  v_action      text;
  v_entity_id   uuid;
  v_diff        jsonb;
  v_admin_email text;
BEGIN
  -- Mapeia tabela → entity_type
  IF TG_TABLE_NAME = 'knowledge_benchmarks' THEN
    v_entity_type := 'benchmark';
  ELSIF TG_TABLE_NAME = 'knowledge_sources' THEN
    v_entity_type := 'source';
  ELSIF TG_TABLE_NAME = 'knowledge_notes' THEN
    v_entity_type := 'note';
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Determina action + entity_id + diff
  IF TG_OP = 'INSERT' THEN
    v_action    := 'created';
    v_entity_id := NEW.id;
    v_diff      := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Distingue arquivar (valid_to OU archived) de update normal
    IF (TG_TABLE_NAME = 'knowledge_benchmarks'
         AND OLD.valid_to IS NULL AND NEW.valid_to IS NOT NULL)
       OR (TG_TABLE_NAME = 'knowledge_notes'
           AND OLD.archived = false AND NEW.archived = true) THEN
      v_action := 'archived';
    ELSE
      v_action := 'updated';
    END IF;
    v_entity_id := NEW.id;
    v_diff := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  ELSE
    RETURN OLD;
  END IF;

  -- Lê email do admin (best-effort; null se não definido)
  BEGIN
    v_admin_email := NULLIF(current_setting('app.current_admin_email', true), '');
  EXCEPTION WHEN OTHERS THEN
    v_admin_email := NULL;
  END;

  INSERT INTO public.knowledge_history
    (entity_type, entity_id, action, diff, changed_by_email)
  VALUES
    (v_entity_type, v_entity_id, v_action, v_diff, v_admin_email);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_knowledge_benchmarks_audit
  AFTER INSERT OR UPDATE ON public.knowledge_benchmarks
  FOR EACH ROW EXECUTE FUNCTION public.knowledge_log_change();

CREATE TRIGGER trg_knowledge_sources_audit
  AFTER INSERT OR UPDATE ON public.knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.knowledge_log_change();

CREATE TRIGGER trg_knowledge_notes_audit
  AFTER INSERT OR UPDATE ON public.knowledge_notes
  FOR EACH ROW EXECUTE FUNCTION public.knowledge_log_change();

-- =====================================================================
-- RPC: get_knowledge_context — alimenta o prompt do GPT no R3
-- Devolve benchmarks vigentes do par tier+format + notas relevantes.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_knowledge_context(
  p_tier      text,
  p_format    text,
  p_vertical  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_benchmarks jsonb;
  v_notes      jsonb;
  v_metadata   jsonb;
BEGIN
  -- Benchmarks vigentes (valid_to IS NULL ou ainda futuro) que coincidam.
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'tier', b.tier,
             'format', b.format,
             'engagement_pct', b.engagement_pct,
             'sample_size', b.sample_size,
             'source_name', s.name,
             'valid_from', b.valid_from,
             'valid_to', b.valid_to
           ) ORDER BY b.tier, b.format
         ), '[]'::jsonb)
    INTO v_benchmarks
  FROM public.knowledge_benchmarks b
  LEFT JOIN public.knowledge_sources s ON s.id = b.source_id
  WHERE b.tier = p_tier
    AND b.format = p_format
    AND (b.valid_to IS NULL OR b.valid_to >= CURRENT_DATE);

  -- Notas relevantes: não-arquivadas, vigentes, e relevantes para a vertical.
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'category', n.category,
             'title', n.title,
             'body', n.body,
             'valid_from', n.valid_from,
             'valid_to', n.valid_to
           ) ORDER BY n.category, n.created_at DESC
         ), '[]'::jsonb)
    INTO v_notes
  FROM public.knowledge_notes n
  WHERE n.archived = false
    AND (n.valid_to IS NULL OR n.valid_to >= CURRENT_DATE)
    AND (
      n.category <> 'vertical'
      OR p_vertical IS NULL
      OR n.vertical IS NULL
      OR lower(n.vertical) = lower(p_vertical)
    );

  -- Metadata
  SELECT jsonb_build_object(
           'last_updated', GREATEST(
             COALESCE((SELECT MAX(updated_at) FROM public.knowledge_benchmarks), 'epoch'::timestamptz),
             COALESCE((SELECT MAX(updated_at) FROM public.knowledge_sources), 'epoch'::timestamptz),
             COALESCE((SELECT MAX(updated_at) FROM public.knowledge_notes), 'epoch'::timestamptz)
           ),
           'total_entries', (
             (SELECT COUNT(*) FROM public.knowledge_benchmarks WHERE valid_to IS NULL OR valid_to >= CURRENT_DATE)
           + (SELECT COUNT(*) FROM public.knowledge_sources)
           + (SELECT COUNT(*) FROM public.knowledge_notes WHERE archived = false)
           )
         )
    INTO v_metadata;

  RETURN jsonb_build_object(
    'benchmarks', v_benchmarks,
    'notes', v_notes,
    'metadata', v_metadata
  );
END;
$$;

-- Negar acesso público — só o service role chama esta função.
REVOKE EXECUTE ON FUNCTION public.get_knowledge_context(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_knowledge_context(text, text, text) FROM anon, authenticated;

-- =====================================================================
-- SEED — dataset editorial inicial
-- =====================================================================
DO $$
DECLARE
  v_phlanx     uuid := gen_random_uuid();
  v_internal   uuid := gen_random_uuid();
  v_iconosq    uuid := gen_random_uuid();
  v_meta       uuid := gen_random_uuid();
BEGIN
  -- Fontes
  INSERT INTO public.knowledge_sources (id, name, type, url, published_at, sample_size, notes) VALUES
    (v_phlanx,   'Phlanx Q1 2026 Engagement Report', 'study',    'https://phlanx.com/engagement-report-q1-2026', '2026-04-15', 32000, 'Padrão de mercado'),
    (v_iconosq,  'Iconosquare State of Social 2026', 'study',    'https://iconosquare.com/state-of-social-2026', '2026-02-01', 12000, 'A integrar'),
    (v_internal, 'InstaBench dataset interno',       'internal', NULL,                                          NULL,         NULL,  'Próprio dataset, rolling crescente'),
    (v_meta,     'Meta Business benchmarks API',     'api',      'https://graph.facebook.com/v19.0',            NULL,         NULL,  'A explorar');

  -- Benchmarks (12 linhas)
  INSERT INTO public.knowledge_benchmarks
    (tier, format, engagement_pct, sample_size, source_id, valid_from, valid_to, origin) VALUES
    ('nano',  'reels',     4.200, 1847, v_phlanx,   '2026-01-01', '2026-03-31', 'manual'),
    ('nano',  'carousels', 3.800, 2103, v_phlanx,   '2026-01-01', '2026-03-31', 'manual'),
    ('nano',  'images',    2.100, 1534, v_phlanx,   '2026-01-01', '2026-03-31', 'manual'),
    ('micro', 'reels',     3.500, 4218, v_phlanx,   '2026-01-01', '2026-03-31', 'manual'),
    ('micro', 'carousels', 2.900, 4892, v_phlanx,   '2026-01-01', '2026-03-31', 'manual'),
    ('micro', 'images',    1.800, 3711, v_phlanx,   '2026-01-01', '2026-03-31', 'manual'),
    ('mid',   'reels',     2.800, 3156, v_internal, '2026-01-01', '2026-03-31', 'manual'),
    ('mid',   'carousels', 2.300, 2984, v_internal, '2026-01-01', '2026-03-31', 'manual'),
    ('mid',   'images',    1.400, 2215, v_internal, '2026-01-01', '2026-03-31', 'manual'),
    ('macro', 'reels',     1.900, 1428, v_internal, '2026-01-01', '2026-03-31', 'system_approved'),
    ('macro', 'carousels', 1.600, 1302, v_internal, '2026-01-01', '2026-03-31', 'manual'),
    ('macro', 'images',    0.900, 1156, v_internal, '2026-01-01', '2026-03-31', 'manual');

  -- Notas (6 cartões editoriais)
  INSERT INTO public.knowledge_notes (category, vertical, title, body) VALUES
    ('trend',     NULL,   'Reels longos perdem retenção',
     'Reels longos (>30s) perdem 30% de retenção desde Jan 2026. Para tier Nano, recomendar Reels curtos (10-15s) com gancho forte.'),
    ('format',    NULL,   'Carrosséis 7-10 slides',
     'Carrosséis com 7-10 slides têm 2x o save rate de carrosséis com menos de 5.'),
    ('algorithm', NULL,   'Algoritmo IG privilegia comentários',
     'Algoritmo IG passou a privilegiar comentários sobre likes em Mar 2026.'),
    ('vertical',  'tech', 'Conteúdos sobre IA',
     'Conteúdos sobre IA têm engagement 3x superior à média desde Out 2025.'),
    ('tool',      NULL,   'Áudio nativo aumenta retenção',
     'Edição com elementos de áudio nativo (não music) aumenta retenção em 18%.'),
    ('trend',     NULL,   'Storytelling em primeira pessoa B2B',
     'Storytelling em primeira pessoa sobe de relevância em B2B/SaaS desde 2026.');

  -- Sugestões pendentes (3 mock para o KPI "Pendentes · 3")
  INSERT INTO public.knowledge_suggestions (type, payload, reason, status) VALUES
    ('benchmark_update',
     jsonb_build_object('tier', 'micro', 'format', 'reels', 'engagement_pct', 3.8, 'sample_size', 42),
     'Desvio de +8.6% face ao benchmark vigente em 42 reports recentes.',
     'pending'),
    ('new_pattern',
     jsonb_build_object('tier', 'mid', 'format', 'carousels', 'observation', 'Carrosséis com cover em vídeo'),
     'Padrão emergente detectado em 31 reports do tier Mid.',
     'pending'),
    ('outdated',
     jsonb_build_object('benchmark_tier', 'macro', 'benchmark_format', 'images'),
     'Amostra do Macro Imagens caiu para n=18 nos últimos 30 dias — recolha pode estar desactualizada.',
     'pending');
END $$;