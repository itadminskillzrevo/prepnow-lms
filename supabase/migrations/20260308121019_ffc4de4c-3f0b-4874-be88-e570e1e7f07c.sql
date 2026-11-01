-- Fix RLS policies on quizzes to handle curriculum-based modules
DROP POLICY IF EXISTS "Anyone can view quizzes of published courses" ON public.quizzes;
DROP POLICY IF EXISTS "Enrolled users can view quizzes of their courses" ON public.quizzes;

CREATE POLICY "Anyone can view quizzes of published courses"
ON public.quizzes AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    LEFT JOIN public.courses c1 ON c1.id = m.course_id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    WHERE l.id = quizzes.lesson_id
      AND (c1.is_published = true OR c2.is_published = true)
  )
);

CREATE POLICY "Enrolled users can view quizzes of their courses"
ON public.quizzes AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    LEFT JOIN public.courses c1 ON c1.id = m.course_id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    JOIN public.enrollments e ON (e.course_id = c1.id OR e.course_id = c2.id)
    WHERE l.id = quizzes.lesson_id
      AND e.user_id = auth.uid()
      AND e.approval_status = 'approved'
  )
);

-- Fix RLS policies on assignments to handle curriculum-based modules
DROP POLICY IF EXISTS "Anyone can view assignments of published courses" ON public.assignments;
DROP POLICY IF EXISTS "Enrolled users can view assignments of their courses" ON public.assignments;

CREATE POLICY "Anyone can view assignments of published courses"
ON public.assignments AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    LEFT JOIN public.courses c1 ON c1.id = m.course_id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    WHERE l.id = assignments.lesson_id
      AND (c1.is_published = true OR c2.is_published = true)
  )
);

CREATE POLICY "Enrolled users can view assignments of their courses"
ON public.assignments AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    LEFT JOIN public.courses c1 ON c1.id = m.course_id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    JOIN public.enrollments e ON (e.course_id = c1.id OR e.course_id = c2.id)
    WHERE l.id = assignments.lesson_id
      AND e.user_id = auth.uid()
      AND e.approval_status = 'approved'
  )
);

-- Fix RLS policies on quiz_questions to handle curriculum-based modules
DROP POLICY IF EXISTS "Enrolled students can view quiz questions" ON public.quiz_questions;

CREATE POLICY "Enrolled students can view quiz questions"
ON public.quiz_questions AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.lessons l ON q.lesson_id = l.id
    JOIN public.modules m ON l.module_id = m.id
    LEFT JOIN public.courses c1 ON c1.id = m.course_id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    JOIN public.enrollments e ON (e.course_id = c1.id OR e.course_id = c2.id)
    WHERE q.id = quiz_questions.quiz_id
      AND e.user_id = auth.uid()
      AND e.approval_status = 'approved'
  )
);

-- Fix instructor policies for curriculum path
DROP POLICY IF EXISTS "Instructors can manage own quizzes" ON public.quizzes;
CREATE POLICY "Instructors can manage own quizzes"
ON public.quizzes AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    LEFT JOIN public.courses c1 ON m.course_id = c1.id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    WHERE l.id = quizzes.lesson_id
      AND (c1.instructor_id = auth.uid() OR c2.instructor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Instructors can manage own assignments" ON public.assignments;
CREATE POLICY "Instructors can manage own assignments"
ON public.assignments AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    LEFT JOIN public.courses c1 ON m.course_id = c1.id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    WHERE l.id = assignments.lesson_id
      AND (c1.instructor_id = auth.uid() OR c2.instructor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Instructors can manage own quiz questions" ON public.quiz_questions;
CREATE POLICY "Instructors can manage own quiz questions"
ON public.quiz_questions AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.lessons l ON q.lesson_id = l.id
    JOIN public.modules m ON l.module_id = m.id
    LEFT JOIN public.courses c1 ON m.course_id = c1.id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    WHERE q.id = quiz_questions.quiz_id
      AND (c1.instructor_id = auth.uid() OR c2.instructor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Instructors can manage own quiz assignments" ON public.quiz_assignments;
CREATE POLICY "Instructors can manage own quiz assignments"
ON public.quiz_assignments AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.lessons l ON q.lesson_id = l.id
    JOIN public.modules m ON l.module_id = m.id
    LEFT JOIN public.courses c1 ON m.course_id = c1.id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    WHERE q.id = quiz_assignments.quiz_id
      AND (c1.instructor_id = auth.uid() OR c2.instructor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Instructors can manage own task assignments" ON public.task_assignments;
CREATE POLICY "Instructors can manage own task assignments"
ON public.task_assignments AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.lessons l ON a.lesson_id = l.id
    JOIN public.modules m ON l.module_id = m.id
    LEFT JOIN public.courses c1 ON m.course_id = c1.id
    LEFT JOIN public.courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
    WHERE a.id = task_assignments.assignment_id
      AND (c1.instructor_id = auth.uid() OR c2.instructor_id = auth.uid())
  )
);