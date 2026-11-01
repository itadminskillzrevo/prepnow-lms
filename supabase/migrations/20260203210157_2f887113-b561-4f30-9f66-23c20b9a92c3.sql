-- Add instructor_id to batches table for batch-level instructor assignment
ALTER TABLE public.batches 
ADD COLUMN instructor_id uuid REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX idx_batches_instructor_id ON public.batches(instructor_id);

-- Update RLS policy to allow instructors to view their assigned batches
DROP POLICY IF EXISTS "Instructors can manage own course batches" ON public.batches;

CREATE POLICY "Instructors can manage assigned batches" 
ON public.batches 
FOR ALL 
USING (
  (EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = batches.course_id 
    AND courses.instructor_id = auth.uid()
  ))
  OR (instructor_id = auth.uid())
);

-- Update live_classes RLS to include batch instructor assignment
DROP POLICY IF EXISTS "Instructors can manage own course schedules" ON public.live_class_schedules;

CREATE POLICY "Instructors can manage assigned schedules" 
ON public.live_class_schedules 
FOR ALL 
USING (
  (EXISTS (
    SELECT 1 FROM courses c 
    WHERE c.id = live_class_schedules.course_id 
    AND c.instructor_id = auth.uid()
  ))
  OR (EXISTS (
    SELECT 1 FROM batches b 
    WHERE b.id = live_class_schedules.batch_id 
    AND b.instructor_id = auth.uid()
  ))
);

-- Update live_classes table policy similarly
DROP POLICY IF EXISTS "Instructors can manage own live classes" ON public.live_classes;

CREATE POLICY "Instructors can manage assigned live classes" 
ON public.live_classes 
FOR ALL 
USING (
  (host_id = auth.uid())
  OR (EXISTS (
    SELECT 1 FROM courses c 
    WHERE c.id = live_classes.course_id 
    AND c.instructor_id = auth.uid()
  ))
  OR (EXISTS (
    SELECT 1 FROM batches b 
    WHERE b.id = live_classes.batch_id 
    AND b.instructor_id = auth.uid()
  ))
);