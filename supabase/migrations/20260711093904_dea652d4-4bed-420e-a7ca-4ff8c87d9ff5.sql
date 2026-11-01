
-- Restore EXECUTE on RLS helper functions to authenticated & anon (needed by RLS policies)
GRANT EXECUTE ON FUNCTION public.is_admin_or_higher(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_enrolled_in_course(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_jr_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_jr_student(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_jr_enrolled(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_sp_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_sp_student(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_sp_enrolled(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_lesson_instructor(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_lesson_enrolled(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_lesson_in_published_course(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_instructor_of_group(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_student_group_member(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_quiz_assigned_to_user(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_assigned_quiz_in_module(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_assigned_quiz_for_lesson(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_exam_quiz_owner(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_exam_quiz_assigned_to_user(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_exam_assignment_owner(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_exam_assignment_assigned_to_user(uuid, uuid) TO authenticated, anon;
