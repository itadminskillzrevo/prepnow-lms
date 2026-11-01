
-- Fix quiz_assignments RLS: Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can manage all quiz assignments" ON public.quiz_assignments;
DROP POLICY IF EXISTS "Instructors can manage own quiz assignments" ON public.quiz_assignments;
DROP POLICY IF EXISTS "Students can view assigned quizzes" ON public.quiz_assignments;

CREATE POLICY "Admins can manage all quiz assignments"
ON public.quiz_assignments FOR ALL
TO authenticated
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own quiz assignments"
ON public.quiz_assignments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quizzes q
    JOIN lessons l ON q.lesson_id = l.id
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE q.id = quiz_assignments.quiz_id AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "Students can view assigned quizzes"
ON public.quiz_assignments FOR SELECT
TO authenticated
USING (
  is_active = true AND (
    assignment_type = 'all'
    OR (assignment_type = 'student' AND target_id = auth.uid())
    OR (assignment_type = 'batch' AND EXISTS (
      SELECT 1 FROM batch_enrollments be WHERE be.batch_id = quiz_assignments.target_id AND be.user_id = auth.uid()
    ))
    OR (assignment_type = 'group' AND EXISTS (
      SELECT 1 FROM student_group_members sgm WHERE sgm.group_id = quiz_assignments.target_id AND sgm.user_id = auth.uid()
    ))
    OR (assignment_type = 'course' AND EXISTS (
      SELECT 1 FROM enrollments e WHERE e.course_id = quiz_assignments.target_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'
    ))
  )
);

-- Fix task_assignments RLS: Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can manage all task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Instructors can manage own task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Students can view assigned tasks" ON public.task_assignments;

CREATE POLICY "Admins can manage all task assignments"
ON public.task_assignments FOR ALL
TO authenticated
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own task assignments"
ON public.task_assignments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN lessons l ON a.lesson_id = l.id
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE a.id = task_assignments.assignment_id AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "Students can view assigned tasks"
ON public.task_assignments FOR SELECT
TO authenticated
USING (
  is_active = true AND (
    assignment_type = 'all'
    OR (assignment_type = 'student' AND target_id = auth.uid())
    OR (assignment_type = 'batch' AND EXISTS (
      SELECT 1 FROM batch_enrollments be WHERE be.batch_id = task_assignments.target_id AND be.user_id = auth.uid()
    ))
    OR (assignment_type = 'group' AND EXISTS (
      SELECT 1 FROM student_group_members sgm WHERE sgm.group_id = task_assignments.target_id AND sgm.user_id = auth.uid()
    ))
    OR (assignment_type = 'course' AND EXISTS (
      SELECT 1 FROM enrollments e WHERE e.course_id = task_assignments.target_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'
    ))
  )
);
