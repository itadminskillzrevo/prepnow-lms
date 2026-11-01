
-- =============================================
-- FIX: Convert ALL RESTRICTIVE policies to PERMISSIVE
-- for 7 assessment tables
-- =============================================

-- 1. QUIZZES
DROP POLICY IF EXISTS "Admins can manage all quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can view quizzes of published courses" ON public.quizzes;
DROP POLICY IF EXISTS "Enrolled users can view quizzes of their courses" ON public.quizzes;
DROP POLICY IF EXISTS "Instructors can manage own quizzes" ON public.quizzes;

CREATE POLICY "Admins can manage all quizzes" ON public.quizzes AS PERMISSIVE FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can manage own quizzes" ON public.quizzes AS PERMISSIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM lessons l JOIN modules m ON l.module_id = m.id JOIN courses c ON m.course_id = c.id WHERE l.id = quizzes.lesson_id AND c.instructor_id = auth.uid()));
CREATE POLICY "Anyone can view quizzes of published courses" ON public.quizzes AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM lessons l JOIN modules m ON l.module_id = m.id JOIN courses c ON m.course_id = c.id WHERE l.id = quizzes.lesson_id AND c.is_published = true));
CREATE POLICY "Enrolled users can view quizzes of their courses" ON public.quizzes AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM lessons l JOIN modules m ON m.id = l.module_id JOIN enrollments e ON e.course_id = m.course_id WHERE l.id = quizzes.lesson_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'));

-- 2. ASSIGNMENTS
DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.assignments;
DROP POLICY IF EXISTS "Anyone can view assignments of published courses" ON public.assignments;
DROP POLICY IF EXISTS "Enrolled users can view assignments of their courses" ON public.assignments;
DROP POLICY IF EXISTS "Instructors can manage own assignments" ON public.assignments;

CREATE POLICY "Admins can manage all assignments" ON public.assignments AS PERMISSIVE FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can manage own assignments" ON public.assignments AS PERMISSIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM lessons l JOIN modules m ON l.module_id = m.id JOIN courses c ON m.course_id = c.id WHERE l.id = assignments.lesson_id AND c.instructor_id = auth.uid()));
CREATE POLICY "Anyone can view assignments of published courses" ON public.assignments AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM lessons l JOIN modules m ON l.module_id = m.id JOIN courses c ON m.course_id = c.id WHERE l.id = assignments.lesson_id AND c.is_published = true));
CREATE POLICY "Enrolled users can view assignments of their courses" ON public.assignments AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM lessons l JOIN modules m ON m.id = l.module_id JOIN enrollments e ON e.course_id = m.course_id WHERE l.id = assignments.lesson_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'));

-- 3. QUIZ_ASSIGNMENTS
DROP POLICY IF EXISTS "Admins can manage all quiz assignments" ON public.quiz_assignments;
DROP POLICY IF EXISTS "Instructors can manage own quiz assignments" ON public.quiz_assignments;
DROP POLICY IF EXISTS "Students can view assigned quizzes" ON public.quiz_assignments;

CREATE POLICY "Admins can manage all quiz assignments" ON public.quiz_assignments AS PERMISSIVE FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can manage own quiz assignments" ON public.quiz_assignments AS PERMISSIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN modules m ON l.module_id = m.id JOIN courses c ON m.course_id = c.id WHERE q.id = quiz_assignments.quiz_id AND c.instructor_id = auth.uid()));
CREATE POLICY "Students can view assigned quizzes" ON public.quiz_assignments AS PERMISSIVE FOR SELECT TO authenticated USING (is_active = true AND (assignment_type = 'all' OR (assignment_type = 'student' AND target_id = auth.uid()) OR (assignment_type = 'batch' AND EXISTS (SELECT 1 FROM batch_enrollments be WHERE be.batch_id = quiz_assignments.target_id AND be.user_id = auth.uid())) OR (assignment_type = 'group' AND EXISTS (SELECT 1 FROM student_group_members sgm WHERE sgm.group_id = quiz_assignments.target_id AND sgm.user_id = auth.uid())) OR (assignment_type = 'course' AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = quiz_assignments.target_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'))));

-- 4. TASK_ASSIGNMENTS
DROP POLICY IF EXISTS "Admins can manage all task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Instructors can manage own task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Students can view assigned tasks" ON public.task_assignments;

CREATE POLICY "Admins can manage all task assignments" ON public.task_assignments AS PERMISSIVE FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can manage own task assignments" ON public.task_assignments AS PERMISSIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM assignments a JOIN lessons l ON a.lesson_id = l.id JOIN modules m ON l.module_id = m.id JOIN courses c ON m.course_id = c.id WHERE a.id = task_assignments.assignment_id AND c.instructor_id = auth.uid()));
CREATE POLICY "Students can view assigned tasks" ON public.task_assignments AS PERMISSIVE FOR SELECT TO authenticated USING (is_active = true AND (assignment_type = 'all' OR (assignment_type = 'student' AND target_id = auth.uid()) OR (assignment_type = 'batch' AND EXISTS (SELECT 1 FROM batch_enrollments be WHERE be.batch_id = task_assignments.target_id AND be.user_id = auth.uid())) OR (assignment_type = 'group' AND EXISTS (SELECT 1 FROM student_group_members sgm WHERE sgm.group_id = task_assignments.target_id AND sgm.user_id = auth.uid())) OR (assignment_type = 'course' AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = task_assignments.target_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'))));

-- 5. QUIZ_QUESTIONS
DROP POLICY IF EXISTS "Admins can manage all questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Instructors can manage own questions" ON public.quiz_questions;

CREATE POLICY "Admins can manage all quiz questions" ON public.quiz_questions AS PERMISSIVE FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can manage own quiz questions" ON public.quiz_questions AS PERMISSIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN modules m ON l.module_id = m.id JOIN courses c ON m.course_id = c.id WHERE q.id = quiz_questions.quiz_id AND c.instructor_id = auth.uid()));
CREATE POLICY "Enrolled students can view quiz questions" ON public.quiz_questions AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN modules m ON l.module_id = m.id JOIN enrollments e ON e.course_id = m.course_id WHERE q.id = quiz_questions.quiz_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'));

-- 6. QUIZ_ATTEMPTS
DROP POLICY IF EXISTS "Admins can view all attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Instructors can view course attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can create own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can update own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can view own attempts" ON public.quiz_attempts;

CREATE POLICY "Admins can view all attempts" ON public.quiz_attempts AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can view course attempts" ON public.quiz_attempts AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM quizzes q JOIN lessons l ON q.lesson_id = l.id JOIN modules m ON l.module_id = m.id JOIN courses c ON m.course_id = c.id WHERE q.id = quiz_attempts.quiz_id AND c.instructor_id = auth.uid()));
CREATE POLICY "Users can create own attempts" ON public.quiz_attempts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts" ON public.quiz_attempts AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 7. ASSIGNMENT_SUBMISSIONS
DROP POLICY IF EXISTS "Admins can manage all submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Instructors can grade submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Instructors can view course submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Users can submit assignments" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Users can view own submissions" ON public.assignment_submissions;

CREATE POLICY "Admins can manage all submissions" ON public.assignment_submissions AS PERMISSIVE FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can view course submissions" ON public.assignment_submissions AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM assignments a JOIN lessons l ON a.lesson_id = l.id JOIN modules m ON l.module_id = m.id JOIN courses c ON m.course_id = c.id WHERE a.id = assignment_submissions.assignment_id AND c.instructor_id = auth.uid()));
CREATE POLICY "Instructors can grade submissions" ON public.assignment_submissions AS PERMISSIVE FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM assignments a JOIN lessons l ON a.lesson_id = l.id JOIN modules m ON l.module_id = m.id JOIN courses c ON m.course_id = c.id WHERE a.id = assignment_submissions.assignment_id AND c.instructor_id = auth.uid()));
CREATE POLICY "Users can submit assignments" ON public.assignment_submissions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own submissions" ON public.assignment_submissions AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
