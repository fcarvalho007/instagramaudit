-- Email template overrides and history
CREATE TABLE public.email_template_overrides (
  template_key text PRIMARY KEY,
  subject text,
  preheader text,
  headline text,
  body_html text,
  body_text text,
  updated_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_template_overrides ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER email_template_overrides_set_updated_at
BEFORE UPDATE ON public.email_template_overrides
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.email_template_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  action text NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by_email text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_template_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX email_template_history_key_idx
  ON public.email_template_history (template_key, changed_at DESC);

CREATE OR REPLACE FUNCTION public.log_email_template_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_snapshot jsonb;
  v_key text;
  v_email text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_snapshot := to_jsonb(NEW);
    v_key := NEW.template_key;
    v_email := NEW.updated_by_email;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_snapshot := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
    v_key := NEW.template_key;
    v_email := NEW.updated_by_email;
  ELSE
    v_action := 'deleted';
    v_snapshot := to_jsonb(OLD);
    v_key := OLD.template_key;
    v_email := OLD.updated_by_email;
  END IF;

  INSERT INTO public.email_template_history
    (template_key, action, snapshot, changed_by_email)
  VALUES
    (v_key, v_action, v_snapshot, v_email);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER email_template_overrides_history
AFTER INSERT OR UPDATE OR DELETE ON public.email_template_overrides
FOR EACH ROW
EXECUTE FUNCTION public.log_email_template_history();