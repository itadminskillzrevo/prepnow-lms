-- Allow enrolled students to view modules of their enrolled courses (even unpublished)
CREATE POLICY "Enrolled users can view modules of their courses"
ON public.modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = auth.uid()
    AND (
      e.course_id = modules.course_id
      OR EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = e.course_id
        AND c.curriculum_id = modules.curriculum_id
      )
    )
  )
);

-- Allow enrolled students to view lessons of their enrolled courses (even unpublished)
CREATE POLICY "Enrolled users can view lessons of their courses"
ON public.lessons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = lessons.module_id
    AND (
      EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.user_id = auth.uid()
        AND e.course_id = m.course_id
      )
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.courses c ON c.id = e.course_id
        WHERE e.user_id = auth.uid()
        AND c.curriculum_id = m.curriculum_id
      )
    )
  )
);

-- Allow enrolled students to view sub_modules of their enrolled courses
CREATE POLICY "Enrolled users can view sub_modules of their courses"
ON public.sub_modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = sub_modules.module_id
    AND (
      EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.user_id = auth.uid()
        AND e.course_id = m.course_id
      )
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.courses c ON c.id = e.course_id
        WHERE e.user_id = auth.uid()
        AND c.curriculum_id = m.curriculum_id
      )
    )
  )
);

-- Allow enrolled students to view curriculums of their enrolled courses
CREATE POLICY "Enrolled users can view curriculums of their courses"
ON public.curriculums
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.enrollments e ON e.course_id = c.id
    WHERE c.curriculum_id = curriculums.id
    AND e.user_id = auth.uid()
  )
);