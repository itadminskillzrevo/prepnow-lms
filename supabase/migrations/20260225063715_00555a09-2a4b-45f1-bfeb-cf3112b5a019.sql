
-- Fix modules RLS: allow viewing modules linked via curriculum_id to published courses
DROP POLICY IF EXISTS "Anyone can view modules of published courses" ON public.modules;
CREATE POLICY "Anyone can view modules of published courses"
ON public.modules FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM courses WHERE courses.id = modules.course_id AND courses.is_published = true))
  OR
  (EXISTS (SELECT 1 FROM courses WHERE courses.curriculum_id = modules.curriculum_id AND modules.curriculum_id IS NOT NULL AND courses.is_published = true))
);

-- Fix lessons RLS: allow viewing lessons of modules linked via curriculum_id
DROP POLICY IF EXISTS "Anyone can view lessons of published courses" ON public.lessons;
CREATE POLICY "Anyone can view lessons of published courses"
ON public.lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM modules m
    LEFT JOIN courses c1 ON m.course_id = c1.id
    LEFT JOIN courses c2 ON m.curriculum_id = c2.curriculum_id AND m.curriculum_id IS NOT NULL
    WHERE m.id = lessons.module_id
    AND (
      (c1.is_published = true)
      OR
      (c2.is_published = true)
    )
  )
);

-- Fix sub_modules RLS: allow viewing sub_modules of modules linked via curriculum_id
DROP POLICY IF EXISTS "Anyone can view sub_modules of published courses" ON public.sub_modules;
CREATE POLICY "Anyone can view sub_modules of published courses"
ON public.sub_modules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM modules m
    LEFT JOIN courses c1 ON m.course_id = c1.id
    LEFT JOIN courses c2 ON m.curriculum_id = c2.curriculum_id AND m.curriculum_id IS NOT NULL
    WHERE m.id = sub_modules.module_id
    AND (
      (c1.is_published = true)
      OR
      (c2.is_published = true)
    )
  )
);
