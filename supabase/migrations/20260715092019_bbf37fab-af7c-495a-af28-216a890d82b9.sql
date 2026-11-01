ALTER TABLE public.selfpaced_enrollments
  ADD COLUMN IF NOT EXISTS last_watched_lesson_id uuid,
  ADD COLUMN IF NOT EXISTS last_watched_at timestamptz;