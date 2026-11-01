ALTER TABLE public.jr_courses
  ADD COLUMN IF NOT EXISTS program_overview text,
  ADD COLUMN IF NOT EXISTS tools_covered text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS skills_developed text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS requirements text[] DEFAULT '{}'::text[];