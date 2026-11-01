-- Allow enrolled students to read quizzes for their enrolled courses (needed for student quiz list + lesson attempt)
DROP POLICY IF EXISTS "Enrolled users can view quizzes of their courses" ON public.quizzes;
CREATE POLICY "Enrolled users can view quizzes of their courses"
ON public.quizzes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.enrollments e ON e.course_id = m.course_id
    WHERE l.id = quizzes.lesson_id
      AND e.user_id = auth.uid()
      AND e.approval_status = 'approved'
  )
);

-- Allow enrolled students to read assignments for their enrolled courses (needed for student assignment list + submission flow)
DROP POLICY IF EXISTS "Enrolled users can view assignments of their courses" ON public.assignments;
CREATE POLICY "Enrolled users can view assignments of their courses"
ON public.assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.enrollments e ON e.course_id = m.course_id
    WHERE l.id = assignments.lesson_id
      AND e.user_id = auth.uid()
      AND e.approval_status = 'approved'
  )
);