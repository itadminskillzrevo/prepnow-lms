-- Prevent potential RLS recursion when student_group_members policies are evaluated
-- (e.g. via modules/quizzes visibility policies that reference group membership).

CREATE OR REPLACE FUNCTION public.is_instructor_of_group(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_groups sg
    JOIN public.courses c ON c.id = sg.course_id
    WHERE sg.id = _group_id
      AND c.instructor_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_instructor_of_group(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Instructors can manage course group members" ON public.student_group_members;

CREATE POLICY "Instructors can manage course group members"
ON public.student_group_members
FOR ALL
TO authenticated
USING (public.is_instructor_of_group(group_id, auth.uid()))
WITH CHECK (public.is_instructor_of_group(group_id, auth.uid()));