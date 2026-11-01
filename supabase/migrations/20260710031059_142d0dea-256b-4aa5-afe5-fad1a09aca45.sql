
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
  END LOOP;
END $$;

-- Also revoke authenticated EXECUTE on pure RLS-helper functions that clients never call directly.
DO $$
DECLARE fn text;
  internal text[] := ARRAY[
    'is_exam_quiz_owner',
    'is_exam_quiz_assigned_to_user',
    'is_exam_assignment_owner',
    'is_exam_assignment_assigned_to_user',
    'is_instructor_of_group',
    'is_enrolled_in_course',
    'is_lesson_in_published_course',
    'is_lesson_instructor',
    'is_lesson_enrolled',
    'is_student_group_member',
    'is_jr_admin',
    'is_jr_student',
    'is_jr_enrolled',
    'is_sp_admin',
    'is_sp_student',
    'is_sp_enrolled',
    'has_assigned_quiz_in_module',
    'has_assigned_quiz_for_lesson',
    'is_quiz_assigned_to_user',
    'is_admin_or_higher',
    'get_user_role',
    'has_role',
    'generate_invoice_number',
    'generate_sp_order_number',
    'handle_new_user',
    'create_finance_invoice_for_enrollment'
  ];
  r record;
BEGIN
  FOREACH fn IN ARRAY internal LOOP
    FOR r IN
      SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated', r.proname, r.args);
    END LOOP;
  END LOOP;
END $$;
