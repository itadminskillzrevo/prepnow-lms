
-- Exam assignments: add missing columns
ALTER TABLE public.exam_assignments
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT false;

-- Exam quizzes: add live toggle
ALTER TABLE public.exam_quizzes
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT false;

-- Allow enrolled jr students to view their course even if unpublished
DROP POLICY IF EXISTS "Enrolled jr students view their courses" ON public.jr_courses;
CREATE POLICY "Enrolled jr students view their courses"
ON public.jr_courses FOR SELECT
USING (public.is_jr_enrolled(auth.uid(), id));
