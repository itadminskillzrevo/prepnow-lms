CREATE OR REPLACE FUNCTION public.is_exam_quiz_owner(_quiz_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam_quizzes
    WHERE id = _quiz_id
      AND created_by = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_exam_assignment_owner(_assignment_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam_assignments
    WHERE id = _assignment_id
      AND created_by = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_exam_quiz_assigned_to_user(_quiz_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam_quiz_assignments eqa
    WHERE eqa.quiz_id = _quiz_id
      AND eqa.is_active = true
      AND (
        eqa.assignment_type = 'all'
        OR (eqa.assignment_type = 'student' AND eqa.target_id = _user_id)
        OR (
          eqa.assignment_type = 'batch'
          AND EXISTS (
            SELECT 1
            FROM public.batch_enrollments be
            WHERE be.batch_id = eqa.target_id
              AND be.user_id = _user_id
          )
        )
        OR (
          eqa.assignment_type = 'group'
          AND EXISTS (
            SELECT 1
            FROM public.student_group_members sgm
            WHERE sgm.group_id = eqa.target_id
              AND sgm.user_id = _user_id
          )
        )
        OR (
          eqa.assignment_type = 'course'
          AND EXISTS (
            SELECT 1
            FROM public.enrollments e
            WHERE e.course_id = eqa.target_id
              AND e.user_id = _user_id
              AND e.approval_status = 'approved'
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_exam_assignment_assigned_to_user(_assignment_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam_task_assignments eta
    WHERE eta.assignment_id = _assignment_id
      AND eta.is_active = true
      AND (
        eta.assignment_type = 'all'
        OR (eta.assignment_type = 'student' AND eta.target_id = _user_id)
        OR (
          eta.assignment_type = 'batch'
          AND EXISTS (
            SELECT 1
            FROM public.batch_enrollments be
            WHERE be.batch_id = eta.target_id
              AND be.user_id = _user_id
          )
        )
        OR (
          eta.assignment_type = 'group'
          AND EXISTS (
            SELECT 1
            FROM public.student_group_members sgm
            WHERE sgm.group_id = eta.target_id
              AND sgm.user_id = _user_id
          )
        )
        OR (
          eta.assignment_type = 'course'
          AND EXISTS (
            SELECT 1
            FROM public.enrollments e
            WHERE e.course_id = eta.target_id
              AND e.user_id = _user_id
              AND e.approval_status = 'approved'
          )
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Admins can manage all exam quizzes" ON public.exam_quizzes;
DROP POLICY IF EXISTS "Instructors can manage own exam quizzes" ON public.exam_quizzes;
DROP POLICY IF EXISTS "Students can view assigned exam quizzes" ON public.exam_quizzes;
CREATE POLICY "Admins can manage all exam quizzes"
ON public.exam_quizzes
FOR ALL
USING (public.is_admin_or_higher(auth.uid()))
WITH CHECK (public.is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can view own exam quizzes"
ON public.exam_quizzes
FOR SELECT
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(id, auth.uid()));
CREATE POLICY "Instructors can create own exam quizzes"
ON public.exam_quizzes
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'instructor') AND auth.uid() = created_by);
CREATE POLICY "Instructors can update own exam quizzes"
ON public.exam_quizzes
FOR UPDATE
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(id, auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'instructor') AND auth.uid() = created_by);
CREATE POLICY "Instructors can delete own exam quizzes"
ON public.exam_quizzes
FOR DELETE
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(id, auth.uid()));
CREATE POLICY "Students can view assigned exam quizzes"
ON public.exam_quizzes
FOR SELECT
USING (public.is_exam_quiz_assigned_to_user(id, auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all exam quiz questions" ON public.exam_quiz_questions;
DROP POLICY IF EXISTS "Instructors can manage own exam quiz questions" ON public.exam_quiz_questions;
DROP POLICY IF EXISTS "Assigned students can view exam quiz questions" ON public.exam_quiz_questions;
CREATE POLICY "Admins can manage all exam quiz questions"
ON public.exam_quiz_questions
FOR ALL
USING (public.is_admin_or_higher(auth.uid()))
WITH CHECK (public.is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can view own exam quiz questions"
ON public.exam_quiz_questions
FOR SELECT
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(quiz_id, auth.uid()));
CREATE POLICY "Instructors can create own exam quiz questions"
ON public.exam_quiz_questions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(quiz_id, auth.uid()));
CREATE POLICY "Instructors can update own exam quiz questions"
ON public.exam_quiz_questions
FOR UPDATE
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(quiz_id, auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(quiz_id, auth.uid()));
CREATE POLICY "Instructors can delete own exam quiz questions"
ON public.exam_quiz_questions
FOR DELETE
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(quiz_id, auth.uid()));
CREATE POLICY "Assigned students can view exam quiz questions"
ON public.exam_quiz_questions
FOR SELECT
USING (public.is_exam_quiz_assigned_to_user(quiz_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all exam quiz assignments" ON public.exam_quiz_assignments;
DROP POLICY IF EXISTS "Instructors can manage own exam quiz assignments" ON public.exam_quiz_assignments;
DROP POLICY IF EXISTS "Students can view assigned exam quiz assignments" ON public.exam_quiz_assignments;
CREATE POLICY "Admins can manage all exam quiz assignments"
ON public.exam_quiz_assignments
FOR ALL
USING (public.is_admin_or_higher(auth.uid()))
WITH CHECK (public.is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can view own exam quiz assignments"
ON public.exam_quiz_assignments
FOR SELECT
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(quiz_id, auth.uid()));
CREATE POLICY "Instructors can create own exam quiz assignments"
ON public.exam_quiz_assignments
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(quiz_id, auth.uid()));
CREATE POLICY "Instructors can update own exam quiz assignments"
ON public.exam_quiz_assignments
FOR UPDATE
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(quiz_id, auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(quiz_id, auth.uid()));
CREATE POLICY "Instructors can delete own exam quiz assignments"
ON public.exam_quiz_assignments
FOR DELETE
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(quiz_id, auth.uid()));
CREATE POLICY "Students can view assigned exam quiz assignments"
ON public.exam_quiz_assignments
FOR SELECT
USING (public.is_exam_quiz_assigned_to_user(quiz_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all exam assignments" ON public.exam_assignments;
DROP POLICY IF EXISTS "Instructors can manage own exam assignments" ON public.exam_assignments;
DROP POLICY IF EXISTS "Students can view assigned exam assignments" ON public.exam_assignments;
CREATE POLICY "Admins can manage all exam assignments"
ON public.exam_assignments
FOR ALL
USING (public.is_admin_or_higher(auth.uid()))
WITH CHECK (public.is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can view own exam assignments"
ON public.exam_assignments
FOR SELECT
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_assignment_owner(id, auth.uid()));
CREATE POLICY "Instructors can create own exam assignments"
ON public.exam_assignments
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'instructor') AND auth.uid() = created_by);
CREATE POLICY "Instructors can update own exam assignments"
ON public.exam_assignments
FOR UPDATE
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_assignment_owner(id, auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'instructor') AND auth.uid() = created_by);
CREATE POLICY "Instructors can delete own exam assignments"
ON public.exam_assignments
FOR DELETE
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_assignment_owner(id, auth.uid()));
CREATE POLICY "Students can view assigned exam assignments"
ON public.exam_assignments
FOR SELECT
USING (public.is_exam_assignment_assigned_to_user(id, auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all exam task assignments" ON public.exam_task_assignments;
DROP POLICY IF EXISTS "Instructors can manage own exam task assignments" ON public.exam_task_assignments;
DROP POLICY IF EXISTS "Students can view assigned exam task assignments" ON public.exam_task_assignments;
CREATE POLICY "Admins can manage all exam task assignments"
ON public.exam_task_assignments
FOR ALL
USING (public.is_admin_or_higher(auth.uid()))
WITH CHECK (public.is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can view own exam task assignments"
ON public.exam_task_assignments
FOR SELECT
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_assignment_owner(assignment_id, auth.uid()));
CREATE POLICY "Instructors can create own exam task assignments"
ON public.exam_task_assignments
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'instructor') AND public.is_exam_assignment_owner(assignment_id, auth.uid()));
CREATE POLICY "Instructors can update own exam task assignments"
ON public.exam_task_assignments
FOR UPDATE
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_assignment_owner(assignment_id, auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'instructor') AND public.is_exam_assignment_owner(assignment_id, auth.uid()));
CREATE POLICY "Instructors can delete own exam task assignments"
ON public.exam_task_assignments
FOR DELETE
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_assignment_owner(assignment_id, auth.uid()));
CREATE POLICY "Students can view assigned exam task assignments"
ON public.exam_task_assignments
FOR SELECT
USING (public.is_exam_assignment_assigned_to_user(assignment_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can view all exam quiz attempts" ON public.exam_quiz_attempts;
DROP POLICY IF EXISTS "Instructors can view exam quiz attempts" ON public.exam_quiz_attempts;
DROP POLICY IF EXISTS "Users can create own exam quiz attempts" ON public.exam_quiz_attempts;
DROP POLICY IF EXISTS "Users can update own exam quiz attempts" ON public.exam_quiz_attempts;
DROP POLICY IF EXISTS "Users can view own exam quiz attempts" ON public.exam_quiz_attempts;
CREATE POLICY "Admins can view all exam quiz attempts"
ON public.exam_quiz_attempts
FOR SELECT
USING (public.is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can view exam quiz attempts"
ON public.exam_quiz_attempts
FOR SELECT
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_quiz_owner(quiz_id, auth.uid()));
CREATE POLICY "Users can create own exam quiz attempts"
ON public.exam_quiz_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exam quiz attempts"
ON public.exam_quiz_attempts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own exam quiz attempts"
ON public.exam_quiz_attempts
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all exam submissions" ON public.exam_assignment_submissions;
DROP POLICY IF EXISTS "Instructors can update exam submissions" ON public.exam_assignment_submissions;
DROP POLICY IF EXISTS "Instructors can view exam submissions" ON public.exam_assignment_submissions;
DROP POLICY IF EXISTS "Users can create own exam submissions" ON public.exam_assignment_submissions;
DROP POLICY IF EXISTS "Users can view own exam submissions" ON public.exam_assignment_submissions;
DROP POLICY IF EXISTS "Users can update own exam submissions" ON public.exam_assignment_submissions;
CREATE POLICY "Admins can manage all exam submissions"
ON public.exam_assignment_submissions
FOR ALL
USING (public.is_admin_or_higher(auth.uid()))
WITH CHECK (public.is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can view exam submissions"
ON public.exam_assignment_submissions
FOR SELECT
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_assignment_owner(assignment_id, auth.uid()));
CREATE POLICY "Instructors can update exam submissions"
ON public.exam_assignment_submissions
FOR UPDATE
USING (public.has_role(auth.uid(), 'instructor') AND public.is_exam_assignment_owner(assignment_id, auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'instructor') AND public.is_exam_assignment_owner(assignment_id, auth.uid()));
CREATE POLICY "Users can create own exam submissions"
ON public.exam_assignment_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own exam submissions"
ON public.exam_assignment_submissions
FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can update own exam submissions"
ON public.exam_assignment_submissions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);