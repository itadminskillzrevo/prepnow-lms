
-- ============================================================
-- Allow enrolled JR students (and JR admins) to view course
-- content regardless of publication state.
-- ============================================================

-- jr_modules
DROP POLICY IF EXISTS "Enrolled jr students view jr modules" ON public.jr_modules;
CREATE POLICY "Enrolled jr students view jr modules"
  ON public.jr_modules FOR SELECT TO authenticated
  USING (
    public.is_jr_admin(auth.uid())
    OR public.is_jr_enrolled(auth.uid(), course_id)
  );

-- jr_sub_modules
DROP POLICY IF EXISTS "Enrolled jr students view jr sub_modules" ON public.jr_sub_modules;
CREATE POLICY "Enrolled jr students view jr sub_modules"
  ON public.jr_sub_modules FOR SELECT TO authenticated
  USING (
    public.is_jr_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.jr_modules m
      WHERE m.id = jr_sub_modules.module_id
        AND public.is_jr_enrolled(auth.uid(), m.course_id)
    )
  );

-- jr_lessons
DROP POLICY IF EXISTS "Enrolled jr students view jr lessons" ON public.jr_lessons;
CREATE POLICY "Enrolled jr students view jr lessons"
  ON public.jr_lessons FOR SELECT TO authenticated
  USING (
    public.is_jr_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.jr_modules m
      WHERE m.id = jr_lessons.module_id
        AND public.is_jr_enrolled(auth.uid(), m.course_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.jr_sub_modules sm
      JOIN public.jr_modules m ON m.id = sm.module_id
      WHERE sm.id = jr_lessons.sub_module_id
        AND public.is_jr_enrolled(auth.uid(), m.course_id)
    )
  );

-- jr_course_materials
DROP POLICY IF EXISTS "Enrolled jr students view jr course_materials" ON public.jr_course_materials;
CREATE POLICY "Enrolled jr students view jr course_materials"
  ON public.jr_course_materials FOR SELECT TO authenticated
  USING (
    public.is_jr_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.jr_lessons l
      LEFT JOIN public.jr_modules m  ON m.id = l.module_id
      LEFT JOIN public.jr_sub_modules sm ON sm.id = l.sub_module_id
      LEFT JOIN public.jr_modules m2 ON m2.id = sm.module_id
      WHERE l.id = jr_course_materials.lesson_id
        AND public.is_jr_enrolled(auth.uid(), COALESCE(m.course_id, m2.course_id))
    )
  );

-- ============================================================
-- Finance: allow SuperAdmin to update invoice total_fees / notes
-- (already covered by FOR ALL policy, but ensure update grants)
-- Allow admins to view payments via existing policy (already in place)
-- ============================================================
