-- Allow public visibility of all lessons under published courses.
-- Playback restriction remains enforced by the UI (only is_preview lessons play without enrollment).
DROP POLICY IF EXISTS sp_l_preview ON public.selfpaced_lessons;
CREATE POLICY sp_l_public_list ON public.selfpaced_lessons
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.selfpaced_modules m
      JOIN public.selfpaced_courses c ON c.id = m.course_id
      WHERE m.id = selfpaced_lessons.module_id AND c.is_published = true
    )
  );