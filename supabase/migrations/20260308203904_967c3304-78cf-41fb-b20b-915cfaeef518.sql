
-- Allow students to view quizzes that are assigned to them via quiz_assignments
CREATE POLICY "Students can view quizzes assigned to them"
ON public.quizzes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_assignments qa
    WHERE qa.quiz_id = quizzes.id
    AND qa.is_active = true
    AND (
      qa.assignment_type = 'all'
      OR (qa.assignment_type = 'student' AND qa.target_id = auth.uid())
      OR (qa.assignment_type = 'batch' AND EXISTS (
        SELECT 1 FROM public.batch_enrollments be WHERE be.batch_id = qa.target_id AND be.user_id = auth.uid()
      ))
      OR (qa.assignment_type = 'group' AND EXISTS (
        SELECT 1 FROM public.student_group_members sgm WHERE sgm.group_id = qa.target_id AND sgm.user_id = auth.uid()
      ))
      OR (qa.assignment_type = 'course' AND EXISTS (
        SELECT 1 FROM public.enrollments e WHERE e.course_id = qa.target_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'
      ))
    )
  )
);

-- Allow students to view lessons that belong to quizzes assigned to them
CREATE POLICY "Students can view lessons of assigned quizzes"
ON public.lessons FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.quiz_assignments qa ON qa.quiz_id = q.id
    WHERE q.lesson_id = lessons.id
    AND qa.is_active = true
    AND (
      qa.assignment_type = 'all'
      OR (qa.assignment_type = 'student' AND qa.target_id = auth.uid())
      OR (qa.assignment_type = 'batch' AND EXISTS (
        SELECT 1 FROM public.batch_enrollments be WHERE be.batch_id = qa.target_id AND be.user_id = auth.uid()
      ))
      OR (qa.assignment_type = 'group' AND EXISTS (
        SELECT 1 FROM public.student_group_members sgm WHERE sgm.group_id = qa.target_id AND sgm.user_id = auth.uid()
      ))
      OR (qa.assignment_type = 'course' AND EXISTS (
        SELECT 1 FROM public.enrollments e WHERE e.course_id = qa.target_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'
      ))
    )
  )
);

-- Allow students to view modules that contain lessons of assigned quizzes
CREATE POLICY "Students can view modules of assigned quizzes"
ON public.modules FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.quizzes q ON q.lesson_id = l.id
    JOIN public.quiz_assignments qa ON qa.quiz_id = q.id
    WHERE l.module_id = modules.id
    AND qa.is_active = true
    AND (
      qa.assignment_type = 'all'
      OR (qa.assignment_type = 'student' AND qa.target_id = auth.uid())
      OR (qa.assignment_type = 'batch' AND EXISTS (
        SELECT 1 FROM public.batch_enrollments be WHERE be.batch_id = qa.target_id AND be.user_id = auth.uid()
      ))
      OR (qa.assignment_type = 'group' AND EXISTS (
        SELECT 1 FROM public.student_group_members sgm WHERE sgm.group_id = qa.target_id AND sgm.user_id = auth.uid()
      ))
      OR (qa.assignment_type = 'course' AND EXISTS (
        SELECT 1 FROM public.enrollments e WHERE e.course_id = qa.target_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'
      ))
    )
  )
);
