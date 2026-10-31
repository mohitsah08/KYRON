-- KYRON Standalone Skills Marketplace: Storage, Downloads, and Skill Metadata Migration
-- Applied to project slkmbmixdqczcjmmnnhc

-- 1. Ensure columns exist on skills and skill_packages
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS license TEXT DEFAULT 'MIT';
ALTER TABLE public.skill_packages ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 2. Create private skill-packages storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'skill-packages',
  'skill-packages',
  false,
  52428800,
  ARRAY['application/zip', 'text/markdown', 'text/plain', 'application/json', 'application/x-zip-compressed']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/zip', 'text/markdown', 'text/plain', 'application/json', 'application/x-zip-compressed'];

-- 3. Create skill_downloads table for download audit & metrics
CREATE TABLE IF NOT EXISTS public.skill_downloads (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  version TEXT NOT NULL,
  download_type TEXT CHECK (download_type IN ('markdown', 'zip', 'prompt')) NOT NULL,
  downloaded_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_skill_downloads_skill ON public.skill_downloads(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_downloads_user ON public.skill_downloads(user_id);

ALTER TABLE public.skill_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own downloads" ON public.skill_downloads;
CREATE POLICY "Users can view own downloads"
  ON public.skill_downloads FOR SELECT TO authenticated
  USING (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Skill creators can view skill downloads" ON public.skill_downloads;
CREATE POLICY "Skill creators can view skill downloads"
  ON public.skill_downloads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.skills s WHERE s.id = skill_downloads.skill_id AND s.creator_id = (auth.uid())::text));

DROP POLICY IF EXISTS "Authenticated users can record downloads" ON public.skill_downloads;
CREATE POLICY "Authenticated users can record downloads"
  ON public.skill_downloads FOR INSERT TO authenticated
  WITH CHECK ((user_id IS NULL) OR (user_id = (auth.uid())::text));

-- 4. Storage RLS policies for skill-packages bucket
DROP POLICY IF EXISTS "Creators can upload skill packages" ON storage.objects;
CREATE POLICY "Creators can upload skill packages"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'skill-packages' AND
    EXISTS (
      SELECT 1 FROM public.skills s
      WHERE s.id = (storage.foldername(name))[2]
        AND s.creator_id = (auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Creators can update skill packages" ON storage.objects;
CREATE POLICY "Creators can update skill packages"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'skill-packages' AND
    EXISTS (
      SELECT 1 FROM public.skills s
      WHERE s.id = (storage.foldername(name))[2]
        AND s.creator_id = (auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Authorized users can read skill packages" ON storage.objects;
CREATE POLICY "Authorized users can read skill packages"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'skill-packages' AND
    EXISTS (
      SELECT 1 FROM public.skills s
      WHERE s.id = (storage.foldername(name))[2]
        AND (
          s.pricing_type = 'free'
          OR s.creator_id = (auth.uid())::text
          OR EXISTS (
            SELECT 1 FROM public.user_purchases p
            WHERE p.skill_id = s.id AND p.user_id = (auth.uid())::text AND p.status = 'completed'
          )
        )
    )
  );
