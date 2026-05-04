-- =============================================================
-- Migration: User Account Foundation
-- Creates profiles table, report_requests.user_id column,
-- helper function, auto-profile trigger, and RLS policies.
-- =============================================================

-- 1. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  plan text NOT NULL DEFAULT 'free',
  lead_id uuid REFERENCES public.leads(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'agency'))
);

-- 2. Indexes on profiles
CREATE INDEX idx_profiles_email ON public.profiles (email);
CREATE INDEX idx_profiles_lead_id ON public.profiles (lead_id);

-- 3. updated_at trigger for profiles
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. Add user_id to report_requests (nullable, additive)
ALTER TABLE public.report_requests
  ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- 5. Indexes on report_requests
CREATE INDEX idx_report_requests_user_id ON public.report_requests (user_id);
CREATE INDEX idx_report_requests_lead_id ON public.report_requests (lead_id);

-- 6. Helper: link authenticated user to existing reports via email
CREATE OR REPLACE FUNCTION public.link_user_to_existing_reports(
  p_user_id uuid,
  p_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_norm text := lower(trim(p_email));
  v_lead_id uuid;
BEGIN
  -- Find matching lead
  SELECT id INTO v_lead_id
  FROM public.leads
  WHERE email_normalized = v_email_norm
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  -- Link profile to lead
  UPDATE public.profiles
  SET lead_id = v_lead_id,
      updated_at = now()
  WHERE id = p_user_id
    AND lead_id IS NULL;

  -- Backfill report_requests.user_id (never overwrite existing)
  UPDATE public.report_requests
  SET user_id = p_user_id,
      updated_at = now()
  WHERE lead_id = v_lead_id
    AND user_id IS NULL;
END;
$$;

-- 7. Trigger: auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_display_name text;
  v_avatar_url text;
BEGIN
  v_email := COALESCE(NEW.email, '');
  v_display_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    NULL
  );
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'picture',
    NULL
  );

  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (NEW.id, lower(trim(v_email)), v_display_name, v_avatar_url);

  -- Attempt to link to existing reports
  IF v_email <> '' THEN
    PERFORM public.link_user_to_existing_reports(NEW.id, v_email);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 9. RLS policy on report_requests for authenticated users
CREATE POLICY "Users can view own report requests"
  ON public.report_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
