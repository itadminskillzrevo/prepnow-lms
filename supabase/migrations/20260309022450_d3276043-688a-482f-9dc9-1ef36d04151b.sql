
-- Security definer function to check if a quiz is assigned to a student
-- This breaks the recursion between modules and quizzes RLS policies
CREATE OR REPLACE FUNCTION public.is_quiz_assigned_to_user(_quiz_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quiz_assignments qa
    WHERE qa.quiz_id = _quiz_id
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

-- Security definer function to check if a lesson belongs to a module with a published course
CREATE OR REPLACE FUNCTION public.is_lesson_in_published_course(_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    LEFT JOIN public.courses c1 ON c1.id = m.course_id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    WHERE l.id = _lesson_id
      AND (c1.is_published = true OR c2.is_published = true)
  );
$$;

-- Security definer to check if lesson belongs to instructor
CREATE OR REPLACE FUNCTION public.is_lesson_instructor(_lesson_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    LEFT JOIN public.courses c1 ON m.course_id = c1.id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    WHERE l.id = _lesson_id
      AND (c1.instructor_id = _user_id OR c2.instructor_id = _user_id)
  );
$$;

-- Security definer to check if lesson is enrolled for user
CREATE OR REPLACE FUNCTION public.is_lesson_enrolled(_lesson_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    LEFT JOIN public.courses c1 ON c1.id = m.course_id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    JOIN public.enrollments e ON (e.course_id = c1.id OR e.course_id = c2.id)
    WHERE l.id = _lesson_id
      AND e.user_id = _user_id
      AND e.approval_status = 'approved'
  );
$$;

-- Now replace quizzes policies to use security definer functions instead of inline subqueries on modules
DROP POLICY IF EXISTS "Anyone can view quizzes of published courses" ON public.quizzes;
CREATE POLICY "Anyone can view quizzes of published courses"
ON public.quizzes FOR SELECT
USING (is_lesson_in_published_course(lesson_id));

DROP POLICY IF EXISTS "Enrolled users can view quizzes of their courses" ON public.quizzes;
CREATE POLICY "Enrolled users can view quizzes of their courses"
ON public.quizzes FOR SELECT TO authenticated
USING (is_lesson_enrolled(lesson_id, auth.uid()));

DROP POLICY IF EXISTS "Instructors can manage own quizzes" ON public.quizzes;
CREATE POLICY "Instructors can manage own quizzes"
ON public.quizzes FOR ALL TO authenticated
USING (is_lesson_instructor(lesson_id, auth.uid()));

DROP POLICY IF EXISTS "Students can view quizzes assigned to them" ON public.quizzes;
CREATE POLICY "Students can view quizzes assigned to them"
ON public.quizzes FOR SELECT TO authenticated
USING (is_quiz_assigned_to_user(id, auth.uid()));

-- Also fix modules policy that references quizzes (the other side of the recursion)
DROP POLICY IF EXISTS "Students can view modules of assigned quizzes" ON public.modules;
CREATE POLICY "Students can view modules of assigned quizzes"
ON public.modules FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.module_id = modules.id
      AND EXISTS (
        SELECT 1 FROM public.quizzes q
        WHERE q.lesson_id = l.id
          AND is_quiz_assigned_to_user(q.id, auth.uid())
      )
  )
);

-- Fix lessons policy that references quizzes too
DROP POLICY IF EXISTS "Students can view lessons of assigned quizzes" ON public.lessons;
CREATE POLICY "Students can view lessons of assigned quizzes"
ON public.lessons FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.lesson_id = lessons.id
      AND is_quiz_assigned_to_user(q.id, auth.uid())
  )
);
