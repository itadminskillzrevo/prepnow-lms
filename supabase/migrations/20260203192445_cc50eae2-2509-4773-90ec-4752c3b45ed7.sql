-- Add Google Drive integration support

-- Add google_drive_folder_id columns to support Drive attachments at various levels
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS google_drive_folder_id text DEFAULT NULL;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS google_drive_folder_url text DEFAULT NULL;

ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS google_drive_folder_id text DEFAULT NULL;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS google_drive_folder_url text DEFAULT NULL;

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS google_drive_folder_id text DEFAULT NULL;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS google_drive_folder_url text DEFAULT NULL;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS recorded_video_url text DEFAULT NULL;

-- Create a table to track individual Google Drive attachments
CREATE TABLE IF NOT EXISTS public.google_drive_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL, -- 'batch', 'module', 'lesson'
    entity_id uuid NOT NULL,
    file_id text NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_type text,
    file_size bigint,
    mime_type text,
    thumbnail_url text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on google_drive_attachments
ALTER TABLE public.google_drive_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for google_drive_attachments
CREATE POLICY "Admins can manage all attachments"
ON public.google_drive_attachments
FOR ALL
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own content attachments"
ON public.google_drive_attachments
FOR ALL
USING (
    auth.uid() = created_by OR
    -- Check if instructor owns the related course through various entity types
    (entity_type = 'batch' AND EXISTS (
        SELECT 1 FROM batches b
        JOIN courses c ON b.course_id = c.id
        WHERE b.id = google_drive_attachments.entity_id AND c.instructor_id = auth.uid()
    )) OR
    (entity_type = 'module' AND EXISTS (
        SELECT 1 FROM modules m
        JOIN courses c ON m.course_id = c.id
        WHERE m.id = google_drive_attachments.entity_id AND c.instructor_id = auth.uid()
    )) OR
    (entity_type = 'lesson' AND EXISTS (
        SELECT 1 FROM lessons l
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE l.id = google_drive_attachments.entity_id AND c.instructor_id = auth.uid()
    ))
);

CREATE POLICY "Students can view attachments for enrolled content"
ON public.google_drive_attachments
FOR SELECT
USING (
    -- Batch attachments for enrolled students
    (entity_type = 'batch' AND EXISTS (
        SELECT 1 FROM batch_enrollments be
        WHERE be.batch_id = google_drive_attachments.entity_id AND be.user_id = auth.uid()
    )) OR
    -- Module attachments for enrolled students
    (entity_type = 'module' AND EXISTS (
        SELECT 1 FROM modules m
        JOIN enrollments e ON m.course_id = e.course_id
        WHERE m.id = google_drive_attachments.entity_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'
    )) OR
    -- Lesson attachments for enrolled students
    (entity_type = 'lesson' AND EXISTS (
        SELECT 1 FROM lessons l
        JOIN modules m ON l.module_id = m.id
        JOIN enrollments e ON m.course_id = e.course_id
        WHERE l.id = google_drive_attachments.entity_id AND e.user_id = auth.uid() AND e.approval_status = 'approved'
    ))
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_drive_attachments_entity ON public.google_drive_attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_drive_attachments_created_by ON public.google_drive_attachments(created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_google_drive_attachments_updated_at
BEFORE UPDATE ON public.google_drive_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();