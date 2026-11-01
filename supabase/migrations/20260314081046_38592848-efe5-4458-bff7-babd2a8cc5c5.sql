
-- ============================================
-- PART 1: Separate Examination System Tables
-- ============================================

-- Exam Quizzes (standalone, NOT linked to lessons)
CREATE TABLE public.exam_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 70,
  time_limit_minutes INTEGER,
  max_attempts INTEGER DEFAULT 3,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_quizzes ENABLE ROW LEVEL SECURITY;

-- Exam Quiz Questions
CREATE TABLE public.exam_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.exam_quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_quiz_questions ENABLE ROW LEVEL SECURITY;

-- Exam Quiz Attempts
CREATE TABLE public.exam_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.exam_quizzes(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  answers JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.exam_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Exam Quiz Assignments (targeting)
CREATE TABLE public.exam_quiz_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.exam_quizzes(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL,
  target_id UUID,
  scheduled_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_quiz_assignments ENABLE ROW LEVEL SECURITY;

-- Exam Assignments (standalone, NOT linked to lessons)
CREATE TABLE public.exam_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  max_score INTEGER DEFAULT 100,
  due_date TIMESTAMPTZ,
  allow_late_submission BOOLEAN DEFAULT false,
  max_file_size_mb INTEGER DEFAULT 10,
  file_types_allowed TEXT[] DEFAULT ARRAY['pdf','doc','docx','txt'],
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_assignments ENABLE ROW LEVEL SECURITY;

-- Exam Assignment Submissions
CREATE TABLE public.exam_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.exam_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'pending',
  score INTEGER,
  feedback TEXT,
  graded_by UUID,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Exam Assignment Targeting (who gets which exam assignment)
CREATE TABLE public.exam_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.exam_assignments(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL,
  target_id UUID,
  scheduled_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_task_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for Examination Tables
-- ============================================

-- exam_quizzes
CREATE POLICY "Admins can manage all exam quizzes" ON public.exam_quizzes FOR ALL TO public USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can manage own exam quizzes" ON public.exam_quizzes FOR ALL TO public USING (auth.uid() = created_by AND has_role(auth.uid(), 'instructor'::app_role));
CREATE POLICY "Students can view assigned exam quizzes" ON public.exam_quizzes FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.exam_quiz_assignments eqa
    WHERE eqa.quiz_id = exam_quizzes.id AND eqa.is_active = true
    AND (
      eqa.assignment_type = 'all'
      OR (eqa.assignment_type = 'student' AND eqa.target_id = auth.uid())
      OR (eqa.assignment_type = 'batch' AND EXISTS (SELECT 1 FROM public.batch_enrollments be WHERE be.batch_id = eqa.target_id AND be.user_id = auth.uid()))
      OR (eqa.assignment_type = 'group' AND EXISTS (SELECT 1 FROM public.student_group_members sgm WHERE sgm.group_id = eqa.target_id AND sgm.user_id = auth.uid()))
      OR (eqa.assignment_type = 'course' AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = eqa.target_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'))
    )
  )
);

-- exam_quiz_questions
CREATE POLICY "Admins can manage all exam quiz questions" ON public.exam_quiz_questions FOR ALL TO public USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can manage own exam quiz questions" ON public.exam_quiz_questions FOR ALL TO public USING (
  EXISTS (SELECT 1 FROM public.exam_quizzes eq WHERE eq.id = exam_quiz_questions.quiz_id AND eq.created_by = auth.uid())
);
CREATE POLICY "Assigned students can view exam quiz questions" ON public.exam_quiz_questions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.exam_quiz_assignments eqa
    WHERE eqa.quiz_id = exam_quiz_questions.quiz_id AND eqa.is_active = true
    AND (
      eqa.assignment_type = 'all'
      OR (eqa.assignment_type = 'student' AND eqa.target_id = auth.uid())
      OR (eqa.assignment_type = 'batch' AND EXISTS (SELECT 1 FROM public.batch_enrollments be WHERE be.batch_id = eqa.target_id AND be.user_id = auth.uid()))
      OR (eqa.assignment_type = 'group' AND EXISTS (SELECT 1 FROM public.student_group_members sgm WHERE sgm.group_id = eqa.target_id AND sgm.user_id = auth.uid()))
      OR (eqa.assignment_type = 'course' AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = eqa.target_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'))
    )
  )
);

-- exam_quiz_attempts
CREATE POLICY "Admins can view all exam quiz attempts" ON public.exam_quiz_attempts FOR SELECT TO public USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can view exam quiz attempts" ON public.exam_quiz_attempts FOR SELECT TO public USING (
  EXISTS (SELECT 1 FROM public.exam_quizzes eq WHERE eq.id = exam_quiz_attempts.quiz_id AND eq.created_by = auth.uid())
);
CREATE POLICY "Users can create own exam quiz attempts" ON public.exam_quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exam quiz attempts" ON public.exam_quiz_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own exam quiz attempts" ON public.exam_quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- exam_quiz_assignments
CREATE POLICY "Admins can manage all exam quiz assignments" ON public.exam_quiz_assignments FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can manage own exam quiz assignments" ON public.exam_quiz_assignments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.exam_quizzes eq WHERE eq.id = exam_quiz_assignments.quiz_id AND eq.created_by = auth.uid())
);
CREATE POLICY "Students can view assigned exam quiz assignments" ON public.exam_quiz_assignments FOR SELECT TO authenticated USING (
  is_active = true AND (
    assignment_type = 'all'
    OR (assignment_type = 'student' AND target_id = auth.uid())
    OR (assignment_type = 'batch' AND EXISTS (SELECT 1 FROM public.batch_enrollments be WHERE be.batch_id = target_id AND be.user_id = auth.uid()))
    OR (assignment_type = 'group' AND EXISTS (SELECT 1 FROM public.student_group_members sgm WHERE sgm.group_id = target_id AND sgm.user_id = auth.uid()))
    OR (assignment_type = 'course' AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = target_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'))
  )
);

-- exam_assignments
CREATE POLICY "Admins can manage all exam assignments" ON public.exam_assignments FOR ALL TO public USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can manage own exam assignments" ON public.exam_assignments FOR ALL TO public USING (auth.uid() = created_by AND has_role(auth.uid(), 'instructor'::app_role));
CREATE POLICY "Students can view assigned exam assignments" ON public.exam_assignments FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.exam_task_assignments eta
    WHERE eta.assignment_id = exam_assignments.id AND eta.is_active = true
    AND (
      eta.assignment_type = 'all'
      OR (eta.assignment_type = 'student' AND eta.target_id = auth.uid())
      OR (eta.assignment_type = 'batch' AND EXISTS (SELECT 1 FROM public.batch_enrollments be WHERE be.batch_id = eta.target_id AND be.user_id = auth.uid()))
      OR (eta.assignment_type = 'group' AND EXISTS (SELECT 1 FROM public.student_group_members sgm WHERE sgm.group_id = eta.target_id AND sgm.user_id = auth.uid()))
      OR (eta.assignment_type = 'course' AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = eta.target_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'))
    )
  )
);

-- exam_assignment_submissions
CREATE POLICY "Admins can manage all exam submissions" ON public.exam_assignment_submissions FOR ALL TO public USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can view exam submissions" ON public.exam_assignment_submissions FOR SELECT TO public USING (
  EXISTS (SELECT 1 FROM public.exam_assignments ea WHERE ea.id = exam_assignment_submissions.assignment_id AND ea.created_by = auth.uid())
);
CREATE POLICY "Instructors can update exam submissions" ON public.exam_assignment_submissions FOR UPDATE TO public USING (
  EXISTS (SELECT 1 FROM public.exam_assignments ea WHERE ea.id = exam_assignment_submissions.assignment_id AND ea.created_by = auth.uid())
);
CREATE POLICY "Users can create own exam submissions" ON public.exam_assignment_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own exam submissions" ON public.exam_assignment_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- exam_task_assignments
CREATE POLICY "Admins can manage all exam task assignments" ON public.exam_task_assignments FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Instructors can manage own exam task assignments" ON public.exam_task_assignments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.exam_assignments ea WHERE ea.id = exam_task_assignments.assignment_id AND ea.created_by = auth.uid())
);
CREATE POLICY "Students can view assigned exam task assignments" ON public.exam_task_assignments FOR SELECT TO authenticated USING (
  is_active = true AND (
    assignment_type = 'all'
    OR (assignment_type = 'student' AND target_id = auth.uid())
    OR (assignment_type = 'batch' AND EXISTS (SELECT 1 FROM public.batch_enrollments be WHERE be.batch_id = target_id AND be.user_id = auth.uid()))
    OR (assignment_type = 'group' AND EXISTS (SELECT 1 FROM public.student_group_members sgm WHERE sgm.group_id = target_id AND sgm.user_id = auth.uid()))
    OR (assignment_type = 'course' AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = target_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'))
  )
);

-- ============================================
-- PART 2: Progress-based learning flow
-- ============================================

-- Add max_attempts to quizzes table for course quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3;

-- Add requires_quiz_pass to lessons to control sequential unlock
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS requires_quiz_pass BOOLEAN DEFAULT false;

-- Security definer function for exam quiz answer checking
CREATE OR REPLACE FUNCTION public.check_exam_quiz_answers(p_quiz_id uuid, p_answers jsonb)
RETURNS TABLE(question_id uuid, is_correct boolean, correct_answer text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    q.id as question_id,
    (p_answers->>q.id::text) = q.correct_answer as is_correct,
    q.correct_answer
  FROM public.exam_quiz_questions q
  WHERE q.quiz_id = p_quiz_id
  ORDER BY q.order_index;
$$;

-- Security definer function for getting exam quiz questions without answers
CREATE OR REPLACE FUNCTION public.get_exam_quiz_questions_for_student(p_quiz_id uuid)
RETURNS TABLE(id uuid, quiz_id uuid, question text, question_type text, options jsonb, points integer, order_index integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    q.id, q.quiz_id, q.question, q.question_type, q.options, q.points, q.order_index
  FROM public.exam_quiz_questions q
  WHERE q.quiz_id = p_quiz_id
  ORDER BY q.order_index;
$$;

-- Updated_at triggers for new tables
CREATE TRIGGER update_exam_quizzes_updated_at BEFORE UPDATE ON public.exam_quizzes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exam_assignments_updated_at BEFORE UPDATE ON public.exam_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exam_assignment_submissions_updated_at BEFORE UPDATE ON public.exam_assignment_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exam_quiz_assignments_updated_at BEFORE UPDATE ON public.exam_quiz_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exam_task_assignments_updated_at BEFORE UPDATE ON public.exam_task_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
