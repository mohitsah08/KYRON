-- KYRON auth & profile hardening
-- Non-destructive: no tables or rows are dropped. Applied to project slkmbmixdqczcjmmnnhc.

-- 1. Profiles: the public SELECT policy (qual = true) exposed every column through the
--    Data API, including email, password_hash, credit_balance and role. Keep the row-level
--    policy (public creator pages need it) but limit browser roles to non-sensitive columns.
--    The Node API connects as the table owner and is unaffected.
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, full_name, username, bio, avatar_url, created_at)
  ON public.profiles TO anon, authenticated;
GRANT UPDATE (display_name, full_name, username, bio, avatar_url)
  ON public.profiles TO authenticated;

-- 2. Signup trigger: sanitise the requested username and avoid unique-violation failures
--    ("Database error saving new user") when the name is taken. Still exactly one row per user.
--    Also reads Google/GitHub OAuth metadata (name, user_name, avatar_url/picture).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_display_name TEXT;
  v_username TEXT;
  v_candidate TEXT;
  v_suffix INT := 0;
BEGIN
  v_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );
  v_display_name := left(v_display_name, 80);

  v_username := lower(COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'user_name'), ''),          -- GitHub
    NULLIF(TRIM(NEW.raw_user_meta_data->>'preferred_username'), ''),
    v_display_name
  ));
  v_username := trim(both '_' from regexp_replace(v_username, '[^a-z0-9_]+', '_', 'g'));
  IF length(v_username) < 3 THEN
    v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;
  v_username := left(v_username, 24);

  v_candidate := v_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_candidate AND id <> NEW.id::text) LOOP
    v_suffix := v_suffix + 1;
    v_candidate := v_username || '_' || substr(md5(NEW.id::text || v_suffix::text), 1, 4);
  END LOOP;

  INSERT INTO public.profiles (
    id, email, display_name, full_name, username, avatar_url, bio,
    role, credit_balance, is_unlimited_credit_user, created_at, updated_at
  ) VALUES (
    NEW.id::text, NEW.email, v_display_name, v_display_name, v_candidate,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'), NULL,
    'user', 10.00, 0, clock_timestamp()::text, clock_timestamp()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = clock_timestamp();

  RETURN NEW;
END;
$function$;

-- Keep the profile email in sync when a user changes it through Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id::text;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_change();

-- 3. Profile update guard: browser sessions can never change role, credits, unlimited flag,
--    email or password hash, even if column grants are widened later. Server-side writes
--    (no JWT, or service_role) keep working.
CREATE OR REPLACE FUNCTION public.handle_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_jwt_role TEXT := auth.jwt() ->> 'role';
BEGIN
  IF v_jwt_role IN ('anon', 'authenticated') THEN
    NEW.role := OLD.role;
    NEW.credit_balance := OLD.credit_balance;
    NEW.is_unlimited_credit_user := OLD.is_unlimited_credit_user;
    NEW.email := OLD.email;
    NEW.password_hash := OLD.password_hash;
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
  END IF;

  IF NEW.full_name IS NOT NULL AND (NEW.display_name IS NULL OR NEW.display_name = OLD.display_name) THEN
    NEW.display_name := NEW.full_name;
  ELSIF NEW.display_name IS NOT NULL AND (NEW.full_name IS NULL OR NEW.full_name = OLD.full_name) THEN
    NEW.full_name := NEW.display_name;
  END IF;

  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$function$;

-- 4. Avatars bucket: 2 MB image-only uploads, and each user may only write inside
--    their own "<user id>/" folder.
UPDATE storage.buckets
SET file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
WHERE id = 'avatars';

DROP POLICY IF EXISTS "Authenticated users can upload avatar" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
