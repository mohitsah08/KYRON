-- Migration: Creator Ecosystem (Agensi-inspired lifecycle & review workflow)
-- Date: 2026-10-30

-- 1. Expand skills.status check constraint to support full review lifecycle
ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_status_check;
ALTER TABLE public.skills ADD CONSTRAINT skills_status_check
  CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'published', 'live', 'rejected', 'paused'));

-- 2. Add visibility column to skills if not exists
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private'));

-- 3. Add reviewer feedback column to skills for quick retrieval
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS rejection_feedback TEXT;

-- 4. Add website_url & onboarding_completed to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed INTEGER DEFAULT 0;

-- 5. Create skill_submissions table for tracking review lifecycle
CREATE TABLE IF NOT EXISTS public.skill_submissions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  submitted_by TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
  validation_report TEXT,
  reviewer_feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 6. Create skill_versions table for tracking immutable release history
CREATE TABLE IF NOT EXISTS public.skill_versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  changelog TEXT,
  file_manifest TEXT,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  UNIQUE (skill_id, version_number)
);

-- 7. Enable RLS on newly created tables
ALTER TABLE public.skill_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_versions ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for skill_submissions
DROP POLICY IF EXISTS "Creators view own submissions" ON public.skill_submissions;
CREATE POLICY "Creators view own submissions" ON public.skill_submissions
  FOR SELECT TO authenticated
  USING (submitted_by = auth.uid()::text);

DROP POLICY IF EXISTS "Creators insert own submissions" ON public.skill_submissions;
CREATE POLICY "Creators insert own submissions" ON public.skill_submissions
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid()::text);

-- 9. RLS Policies for skill_versions
DROP POLICY IF EXISTS "Public can view versions of live skills" ON public.skill_versions;
CREATE POLICY "Public can view versions of live skills" ON public.skill_versions
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.skills s 
      WHERE s.id = skill_versions.skill_id 
      AND s.status IN ('live', 'published')
    )
  );

DROP POLICY IF EXISTS "Creators can view all versions of own skills" ON public.skill_versions;
CREATE POLICY "Creators can view all versions of own skills" ON public.skill_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.skills s 
      WHERE s.id = skill_versions.skill_id 
      AND s.creator_id = auth.uid()::text
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_submissions_skill ON public.skill_submissions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_submissions_creator ON public.skill_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_skill_submissions_status ON public.skill_submissions(status);
CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON public.skill_versions(skill_id);
