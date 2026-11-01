
ALTER TABLE public.jr_quizzes ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;

-- Allow students to view live quizzes (in addition to existing enrolled-only policy)
DROP POLICY IF EXISTS "Anyone view live jr quizzes" ON public.jr_quizzes;
CREATE POLICY "Anyone view live jr quizzes"
  ON public.jr_quizzes FOR SELECT
  USING (is_live = true);

-- Allow viewing questions for live quizzes (without exposing correct_answer? we already have a SECURITY DEFINER fn get_jr_quiz_questions_for_student)
-- Let students read questions of live quizzes through RLS too (correct_answer hidden in client by selecting columns)
DROP POLICY IF EXISTS "Students view live jr quiz questions" ON public.jr_quiz_questions;
CREATE POLICY "Students view live jr quiz questions"
  ON public.jr_quiz_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jr_quizzes q WHERE q.id = jr_quiz_questions.quiz_id AND q.is_live = true));

NOTIFY pgrst, 'reload schema';
