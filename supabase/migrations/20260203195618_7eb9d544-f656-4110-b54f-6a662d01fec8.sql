-- Extend student visibility policies to support course-level assignments

-- quiz_assignments: update student SELECT policy
DROP POLICY IF EXISTS "Students can view assigned quizzes" ON public.quiz_assignments;
CREATE POLICY "Students can view assigned quizzes"
ON public.quiz_assignments
FOR SELECT
USING (
  is_active = true AND (
    (assignment_type = 'all') OR
    (assignment_type = 'student' AND target_id = auth.uid()) OR
    (assignment_type = 'batch' AND EXISTS (
      SELECT 1 FROM public.batch_enrollments be
      WHERE be.batch_id = public.quiz_assignments.target_id
        AND be.user_id = auth.uid()
    )) OR
    (assignment_type = 'group' AND EXISTS (
      SELECT 1 FROM public.student_group_members sgm
      WHERE sgm.group_id = public.quiz_assignments.target_id
        AND sgm.user_id = auth.uid()
    )) OR
    (assignment_type = 'course' AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = public.quiz_assignments.target_id
        AND e.user_id = auth.uid()
        AND e.approval_status = 'approved'
    ))
  )
);

-- task_assignments: update student SELECT policy
DROP POLICY IF EXISTS "Students can view assigned tasks" ON public.task_assignments;
CREATE POLICY "Students can view assigned tasks"
ON public.task_assignments
FOR SELECT
USING (
  is_active = true AND (
    (assignment_type = 'all') OR
    (assignment_type = 'student' AND target_id = auth.uid()) OR
    (assignment_type = 'batch' AND EXISTS (
      SELECT 1 FROM public.batch_enrollments be
      WHERE be.batch_id = public.task_assignments.target_id
        AND be.user_id = auth.uid()
    )) OR
    (assignment_type = 'group' AND EXISTS (
      SELECT 1 FROM public.student_group_members sgm
      WHERE sgm.group_id = public.task_assignments.target_id
        AND sgm.user_id = auth.uid()
    )) OR
    (assignment_type = 'course' AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = public.task_assignments.target_id
        AND e.user_id = auth.uid()
        AND e.approval_status = 'approved'
    ))
  )
);