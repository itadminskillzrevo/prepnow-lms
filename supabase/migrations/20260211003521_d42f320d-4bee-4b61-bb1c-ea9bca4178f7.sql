-- Fix infinite recursion: create a security definer function to check enrollment
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = _user_id
    AND course_id = _course_id
  )
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Enrolled users can view their courses" ON public.courses;

-- Recreate with security definer function (no recursion)
CREATE POLICY "Enrolled users can view their courses"
ON public.courses
FOR SELECT
USING (
  public.is_enrolled_in_course(auth.uid(), id)
);

-- Also fix modules policy that may reference courses causing recursion
DROP POLICY IF EXISTS "Enrolled users can view modules of their courses" ON public.modules;
CREATE POLICY "Enrolled users can view modules of their courses"
ON public.modules
FOR SELECT
USING (
  (course_id IS NOT NULL AND public.is_enrolled_in_course(auth.uid(), course_id))
  OR
  (curriculum_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.curriculum_id = modules.curriculum_id
    AND public.is_enrolled_in_course(auth.uid(), c.id)
  ))
);

-- Fix lessons policy
DROP POLICY IF EXISTS "Enrolled users can view lessons of their courses" ON public.lessons;
CREATE POLICY "Enrolled users can view lessons of their courses"
ON public.lessons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = lessons.module_id
    AND (
      (m.course_id IS NOT NULL AND public.is_enrolled_in_course(auth.uid(), m.course_id))
      OR
      (m.curriculum_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.curriculum_id = m.curriculum_id
        AND public.is_enrolled_in_course(auth.uid(), c.id)
      ))
    )
  )
);

-- Fix sub_modules policy
DROP POLICY IF EXISTS "Enrolled users can view sub_modules of their courses" ON public.sub_modules;
CREATE POLICY "Enrolled users can view sub_modules of their courses"
ON public.sub_modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = sub_modules.module_id
    AND (
      (m.course_id IS NOT NULL AND public.is_enrolled_in_course(auth.uid(), m.course_id))
      OR
      (m.curriculum_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.curriculum_id = m.curriculum_id
        AND public.is_enrolled_in_course(auth.uid(), c.id)
      ))
    )
  )
);

-- Fix curriculums policy
DROP POLICY IF EXISTS "Enrolled users can view curriculums of their courses" ON public.curriculums;
CREATE POLICY "Enrolled users can view curriculums of their courses"
ON public.curriculums
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.curriculum_id = curriculums.id
    AND public.is_enrolled_in_course(auth.uid(), c.id)
  )
);