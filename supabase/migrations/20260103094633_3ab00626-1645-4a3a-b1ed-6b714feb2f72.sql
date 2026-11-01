-- Create a secure function for students to get quiz questions WITHOUT correct answers
CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_student(p_quiz_id uuid)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  question text,
  question_type text,
  options jsonb,
  points integer,
  order_index integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    q.id,
    q.quiz_id,
    q.question,
    q.question_type,
    q.options,
    q.points,
    q.order_index
  FROM public.quiz_questions q
  JOIN quizzes qz ON q.quiz_id = qz.id
  JOIN lessons l ON qz.lesson_id = l.id
  JOIN modules m ON l.module_id = m.id
  JOIN enrollments e ON m.course_id = e.course_id
  WHERE q.quiz_id = p_quiz_id
    AND e.user_id = auth.uid()
  ORDER BY q.order_index;
$$;

-- Drop the existing policy that exposes correct_answer to students
DROP POLICY IF EXISTS "Enrolled users can view questions" ON public.quiz_questions;

-- Create a function for students to check their answers after submission
CREATE OR REPLACE FUNCTION public.check_quiz_answers(p_quiz_id uuid, p_answers jsonb)
RETURNS TABLE (
  question_id uuid,
  is_correct boolean,
  correct_answer text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    q.id as question_id,
    (p_answers->>q.id::text) = q.correct_answer as is_correct,
    q.correct_answer
  FROM public.quiz_questions q
  WHERE q.quiz_id = p_quiz_id
  ORDER BY q.order_index;
$$;