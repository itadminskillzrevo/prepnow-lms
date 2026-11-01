-- Create table for weekly recurring schedules
CREATE TABLE public.live_class_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    target_student_id UUID, -- For individual student targeting
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    title TEXT NOT NULL,
    description TEXT,
    platform TEXT NOT NULL DEFAULT 'google_meet',
    is_active BOOLEAN NOT NULL DEFAULT true,
    host_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add student_id column to live_classes for individual targeting
ALTER TABLE public.live_classes 
ADD COLUMN IF NOT EXISTS target_student_id UUID,
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.live_class_schedules(id) ON DELETE SET NULL;

-- Enable RLS on live_class_schedules
ALTER TABLE public.live_class_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for live_class_schedules
CREATE POLICY "Admins can manage all schedules"
ON public.live_class_schedules
FOR ALL
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own course schedules"
ON public.live_class_schedules
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = live_class_schedules.course_id
        AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY "Students can view assigned schedules"
ON public.live_class_schedules
FOR SELECT
USING (
    is_active = true AND (
        -- Batch-based schedule: student is in the batch
        (batch_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM batch_enrollments be
            WHERE be.batch_id = live_class_schedules.batch_id
            AND be.user_id = auth.uid()
        ))
        OR
        -- Individual student schedule
        (target_student_id = auth.uid())
        OR
        -- Course-level schedule: student is enrolled
        (batch_id IS NULL AND target_student_id IS NULL AND EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = live_class_schedules.course_id
            AND e.user_id = auth.uid()
            AND e.approval_status = 'approved'
        ))
    )
);

-- Update live_classes RLS to include student targeting
CREATE POLICY "Students can view assigned live classes"
ON public.live_classes
FOR SELECT
USING (
    -- Batch-based: student is in the batch
    (batch_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM batch_enrollments be
        WHERE be.batch_id = live_classes.batch_id
        AND be.user_id = auth.uid()
    ))
    OR
    -- Individual student
    (target_student_id = auth.uid())
    OR
    -- Course-level: student is enrolled
    (batch_id IS NULL AND target_student_id IS NULL AND EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.course_id = live_classes.course_id
        AND e.user_id = auth.uid()
        AND e.approval_status = 'approved'
    ))
);

-- Add trigger for updated_at
CREATE TRIGGER update_live_class_schedules_updated_at
BEFORE UPDATE ON public.live_class_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_live_class_schedules_course ON public.live_class_schedules(course_id);
CREATE INDEX idx_live_class_schedules_batch ON public.live_class_schedules(batch_id);
CREATE INDEX idx_live_class_schedules_day ON public.live_class_schedules(day_of_week);
CREATE INDEX idx_live_classes_target_student ON public.live_classes(target_student_id);