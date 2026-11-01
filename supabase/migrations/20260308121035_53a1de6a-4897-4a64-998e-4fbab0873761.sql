-- Fix get_quiz_questions_for_student to handle curriculum-based modules
CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_student(p_quiz_id uuid)
 RETURNS TABLE(id uuid, quiz_id uuid, question text, question_type text, options jsonb, points integer, order_index integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
  LEFT JOIN courses c1 ON c1.id = m.course_id
  LEFT JOIN courses c2 ON m.curriculum_id IS NOT NULL AND c2.curriculum_id = m.curriculum_id
  JOIN enrollments e ON (e.course_id = c1.id OR e.course_id = c2.id)
  WHERE q.quiz_id = p_quiz_id
    AND e.user_id = auth.uid()
    AND e.approval_status = 'approved'
  ORDER BY q.order_index;
$$;