
-- 1. audit_logs: remove forgeable INSERT
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_higher(auth.uid()));

-- 2. course_analytics: remove wide-open ALL policy
DROP POLICY IF EXISTS "System can manage course analytics" ON public.course_analytics;
CREATE POLICY "Admins can manage course analytics" ON public.course_analytics
  FOR ALL TO authenticated
  USING (public.is_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_admin_or_higher(auth.uid()));

-- 3. notifications: remove forgeable INSERT
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
-- Existing "Admins can insert notifications" remains.

-- 4. scheduled_notifications: remove forgeable INSERT
DROP POLICY IF EXISTS "System can insert scheduled notifications" ON public.scheduled_notifications;
-- Existing "Admins can manage scheduled notifications" (ALL) covers admin INSERT.

-- 5. jr_quiz_questions: require enrollment
DROP POLICY IF EXISTS "Students view live jr quiz questions" ON public.jr_quiz_questions;
CREATE POLICY "Enrolled students view live jr quiz questions" ON public.jr_quiz_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jr_quizzes q
      JOIN public.jr_lessons l ON l.id = q.lesson_id
      JOIN public.jr_sub_modules sm ON sm.id = l.sub_module_id
      JOIN public.jr_modules m ON m.id = sm.module_id
      JOIN public.jr_enrollments e ON e.course_id = m.course_id
      WHERE q.id = jr_quiz_questions.quiz_id
        AND q.is_live = true
        AND e.user_id = auth.uid()
    )
  );

-- 6. selfpaced_sub_modules: restrict visibility
DROP POLICY IF EXISTS "sp_sm_read" ON public.selfpaced_sub_modules;
CREATE POLICY "sp_sm_read" ON public.selfpaced_sub_modules
  FOR SELECT TO anon, authenticated
  USING (
    public.is_sp_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.selfpaced_modules m
      JOIN public.selfpaced_courses c ON c.id = m.course_id
      WHERE m.id = selfpaced_sub_modules.module_id
        AND (
          c.is_published = true
          OR public.is_sp_enrolled(auth.uid(), c.id)
        )
    )
  );

-- 7. jr-media storage: ownership on update/delete + drop broad SELECT
DROP POLICY IF EXISTS "Authenticated update jr-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete jr-media" ON storage.objects;
DROP POLICY IF EXISTS "Public read jr-media" ON storage.objects;

CREATE POLICY "jr-media owner or admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'jr-media'
    AND (owner = auth.uid() OR public.is_jr_admin(auth.uid()))
  );

CREATE POLICY "jr-media owner or admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'jr-media'
    AND (owner = auth.uid() OR public.is_jr_admin(auth.uid()))
  );

-- Direct CDN reads still work because bucket is public; policy only affects storage.objects listing API.

-- 8. course-media: drop broad SELECT policy that permitted listing
DROP POLICY IF EXISTS "Anyone can view course media" ON storage.objects;

-- 9. jr-assignments: drop public read policy (bucket now private; use signed URLs)
DROP POLICY IF EXISTS "jr_assignments_public_read" ON storage.objects;
CREATE POLICY "jr_assignments_owner_or_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'jr-assignments'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.is_jr_admin(auth.uid())
    )
  );

-- 10. Revoke EXECUTE on internal helper functions from anon (and PUBLIC).
-- Keep EXECUTE for authenticated so RLS policies continue to work.
DO $$
DECLARE
  fn text;
  helpers text[] := ARRAY[
    'is_exam_quiz_owner(uuid,uuid)',
    'is_exam_quiz_assigned_to_user(uuid,uuid)',
    'is_exam_assignment_owner(uuid,uuid)',
    'is_exam_assignment_assigned_to_user(uuid,uuid)',
    'is_instructor_of_group(uuid,uuid)',
    'is_enrolled_in_course(uuid,uuid)',
    'is_lesson_in_published_course(uuid)',
    'is_lesson_instructor(uuid,uuid)',
    'is_lesson_enrolled(uuid,uuid)',
    'is_student_group_member(uuid,uuid)',
    'is_jr_admin(uuid)',
    'is_jr_student(uuid)',
    'is_jr_enrolled(uuid,uuid)',
    'is_sp_admin(uuid)',
    'is_sp_student(uuid)',
    'is_sp_enrolled(uuid,uuid)',
    'has_assigned_quiz_in_module(uuid,uuid)',
    'has_assigned_quiz_for_lesson(uuid,uuid)',
    'is_quiz_assigned_to_user(uuid,uuid)',
    'has_role(uuid,app_role)',
    'is_admin_or_higher(uuid)',
    'get_user_role(uuid)',
    'generate_invoice_number()',
    'generate_sp_order_number()',
    'log_audit_event(text,text,uuid,jsonb,jsonb)',
    'delete_course_cascade(uuid)',
    'change_user_role(uuid,app_role)'
  ];
BEGIN
  FOREACH fn IN ARRAY helpers LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
  END LOOP;
END $$;
