
-- Fix: Allow instructors to manage modules linked to their own curriculums
CREATE POLICY "Instructors can manage own curriculum modules"
ON public.modules FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.curriculums c
    WHERE c.id = modules.curriculum_id
    AND c.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.curriculums c
    WHERE c.id = modules.curriculum_id
    AND c.created_by = auth.uid()
  )
);

-- Fix: Allow instructors to manage lessons in their curriculum modules
CREATE POLICY "Instructors can manage own curriculum lessons"
ON public.lessons FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.curriculums c ON c.id = m.curriculum_id
    WHERE m.id = lessons.module_id
    AND c.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.curriculums c ON c.id = m.curriculum_id
    WHERE m.id = lessons.module_id
    AND c.created_by = auth.uid()
  )
);
