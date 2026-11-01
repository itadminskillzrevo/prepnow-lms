-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  target_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'course', 'batch', 'role'
  target_id UUID NULL, -- For course_id or batch_id targeting
  target_role app_role NULL, -- For role-based targeting
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  starts_at TIMESTAMP WITH TIME ZONE NULL,
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Admins can manage all announcements
CREATE POLICY "Admins can manage all announcements"
ON public.announcements
FOR ALL
USING (is_admin_or_higher(auth.uid()));

-- Instructors can manage their own announcements
CREATE POLICY "Instructors can manage own announcements"
ON public.announcements
FOR ALL
USING (auth.uid() = created_by AND has_role(auth.uid(), 'instructor'));

-- Users can view published announcements targeted to them
CREATE POLICY "Users can view targeted announcements"
ON public.announcements
FOR SELECT
USING (
  is_published = true 
  AND (starts_at IS NULL OR starts_at <= now())
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    -- Global announcements
    target_type = 'all'
    -- Course-specific announcements for enrolled users
    OR (target_type = 'course' AND EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.course_id = announcements.target_id 
      AND e.user_id = auth.uid()
      AND e.approval_status = 'approved'
    ))
    -- Batch-specific announcements for batch members
    OR (target_type = 'batch' AND EXISTS (
      SELECT 1 FROM batch_enrollments be 
      WHERE be.batch_id = announcements.target_id 
      AND be.user_id = auth.uid()
    ))
    -- Role-specific announcements
    OR (target_type = 'role' AND has_role(auth.uid(), announcements.target_role))
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();