
-- 1. Extend handle_new_user to also create a lead row when missing.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_email text;
  v_email_norm text;
  v_display_name text;
  v_avatar_url text;
  v_lead_id uuid;
BEGIN
  v_email := COALESCE(NEW.email, '');
  v_email_norm := lower(trim(v_email));
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
  VALUES (NEW.id, v_email_norm, v_display_name, v_avatar_url);

  IF v_email_norm <> '' THEN
    -- Ensure a lead exists for this auth user. Idempotent: if a lead with
    -- the same normalized email already exists, leave it alone — the
    -- onboarding /start path will UPDATE it with full qualification data.
    SELECT id INTO v_lead_id
    FROM public.leads
    WHERE email_normalized = v_email_norm
    LIMIT 1;

    IF v_lead_id IS NULL THEN
      INSERT INTO public.leads (name, email, email_normalized, source)
      VALUES (
        COALESCE(NULLIF(v_display_name, ''), split_part(v_email, '@', 1)),
        v_email,
        v_email_norm,
        'auth_signup'
      );
    END IF;

    PERFORM public.link_user_to_existing_reports(NEW.id, v_email);
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Backfill: create a lead for every existing auth user without one.
INSERT INTO public.leads (name, email, email_normalized, source, created_at)
SELECT
  COALESCE(
    NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(u.raw_user_meta_data ->> 'name', ''),
    split_part(u.email, '@', 1)
  ),
  u.email,
  lower(trim(u.email)),
  'auth_backfill',
  u.created_at
FROM auth.users u
WHERE u.email IS NOT NULL
  AND u.email <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.email_normalized = lower(trim(u.email))
  );

-- 3. Re-link profiles to the freshly created leads.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT u.id, u.email
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE p.lead_id IS NULL
      AND u.email IS NOT NULL
      AND u.email <> ''
  LOOP
    PERFORM public.link_user_to_existing_reports(r.id, r.email);
  END LOOP;
END
$$;
