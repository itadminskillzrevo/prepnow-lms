-- Break RLS recursion between student_groups and student_group_members
-- by moving membership checks into a SECURITY DEFINER helper.

CREATE OR REPLACE FUNCTION public.is_student_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_group_members
    WHERE group_id = _group_id
      AND user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_student_group_member(uuid, uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "Students can view groups they belong to" ON public.student_groups;

CREATE POLICY "Students can view groups they belong to"
ON public.student_groups
FOR SELECT
TO authenticated
USING (public.is_student_group_member(id, auth.uid()));