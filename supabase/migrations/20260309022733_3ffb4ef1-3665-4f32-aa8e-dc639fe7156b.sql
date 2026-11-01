
-- Security definer to check if a module has assigned quizzes for a user
-- Breaks modules -> lessons -> modules recursion
CREATE OR REPLACE FUNCTION public.has_assigned_quiz_in_module(_module_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.quizzes q ON q.lesson_id = l.id
    JOIN public.quiz_assignments qa ON qa.quiz_id = q.id
    WHERE l.module_id = _module_id
      AND qa.is_active = true
      AND (
        qa.assignment_type = 'all'
        OR (qa.assignment_type = 'student' AND qa.target_id = _user_id)
        OR (qa.assignment_type = 'batch' AND EXISTS (
          SELECT 1 FROM public.batch_enrollments be WHERE be.batch_id = qa.target_id AND be.user_id = _user_id
        ))
        OR (qa.assignment_type = 'group' AND EXISTS (
          SELECT 1 FROM public.student_group_members sgm WHERE sgm.group_id = qa.target_id AND sgm.user_id = _user_id
        ))
        OR (qa.assignment_type = 'course' AND EXISTS (
          SELECT 1 FROM public.enrollments e WHERE e.course_id = qa.target_id AND e.user_id = _user_id AND e.approval_status = 'approved'
        ))
      )
  );
$$;

-- Replace the modules policy to use the security definer function
DROP POLICY IF EXISTS "Students can view modules of assigned quizzes" ON public.modules;
CREATE POLICY "Students can view modules of assigned quizzes"
ON public.modules FOR SELECT TO authenticated
USING (has_assigned_quiz_in_module(id, auth.uid()));

-- Also fix lessons policy - it queries quizzes which queries back to lessons/modules
-- Use security definer to break that too
CREATE OR REPLACE FUNCTION public.has_assigned_quiz_for_lesson(_lesson_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quizzes q
    JOIN public.quiz_assignments qa ON qa.quiz_id = q.id
    WHERE q.lesson_id = _lesson_id
      AND qa.is_active = true
      AND (
        qa.assignment_type = 'all'
        OR (qa.assignment_type = 'student' AND qa.target_id = _user_id)
        OR (qa.assignment_type = 'batch' AND EXISTS (
          SELECT 1 FROM public.batch_enrollments be WHERE be.batch_id = qa.target_id AND be.user_id = _user_id
        ))
        OR (qa.assignment_type = 'group' AND EXISTS (
          SELECT 1 FROM public.student_group_members sgm WHERE sgm.group_id = qa.target_id AND sgm.user_id = _user_id
        ))
        OR (qa.assignment_type = 'course' AND EXISTS (
          SELECT 1 FROM public.enrollments e WHERE e.course_id = qa.target_id AND e.user_id = _user_id AND e.approval_status = 'approved'
        ))
      )
  );
$$;

DROP POLICY IF EXISTS "Students can view lessons of assigned quizzes" ON public.lessons;
CREATE POLICY "Students can view lessons of assigned quizzes"
ON public.lessons FOR SELECT TO authenticated
USING (has_assigned_quiz_for_lesson(id, auth.uid()));
