-- Drop the existing student SELECT policy
DROP POLICY IF EXISTS "Enrolled users can view materials" ON public.course_materials;

-- Create updated policy that handles both course_id and curriculum_id linked modules
CREATE POLICY "Enrolled users can view materials"
ON public.course_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    JOIN enrollments e ON e.user_id = auth.uid()
    WHERE l.id = course_materials.lesson_id
    AND (
      (m.course_id IS NOT NULL AND m.course_id = e.course_id)
      OR
      (m.curriculum_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = e.course_id
        AND c.curriculum_id = m.curriculum_id
      ))
    )
  )
);

-- Also fix instructor policy similarly
DROP POLICY IF EXISTS "Instructors can manage own materials" ON public.course_materials;

CREATE POLICY "Instructors can manage own materials"
ON public.course_materials
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON (
      (m.course_id IS NOT NULL AND c.id = m.course_id)
      OR
      (m.curriculum_id IS NOT NULL AND c.curriculum_id = m.curriculum_id)
    )
    WHERE l.id = course_materials.lesson_id
    AND c.instructor_id = auth.uid()
  )
);