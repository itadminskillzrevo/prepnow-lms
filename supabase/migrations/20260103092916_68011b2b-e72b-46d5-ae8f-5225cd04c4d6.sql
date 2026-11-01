-- Add approval_status column to courses for course approval workflow
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';

-- Create index for filtering courses by approval status
CREATE INDEX IF NOT EXISTS idx_courses_approval_status ON public.courses(approval_status);

-- Update existing published courses to have 'approved' status
UPDATE public.courses SET approval_status = 'approved' WHERE is_published = true;

-- Update existing unpublished courses to have 'pending' status
UPDATE public.courses SET approval_status = 'pending' WHERE is_published = false AND approval_status IS NULL;

-- Add approval_notes column for admin feedback
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS approval_notes text;

-- Add approved_by column to track who approved the course
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Add approved_at timestamp
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Update RLS policy to allow admins to update approval status
DROP POLICY IF EXISTS "Admins can update course approval" ON public.courses;
CREATE POLICY "Admins can update course approval"
ON public.courses
FOR UPDATE
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

-- Create a policy for admins to view all courses (including unapproved)
DROP POLICY IF EXISTS "Admins can view all courses" ON public.courses;
CREATE POLICY "Admins can view all courses"
ON public.courses
FOR SELECT
USING (is_admin_or_higher(auth.uid()));

-- Modify the public view policy to only show approved AND published courses
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
CREATE POLICY "Anyone can view approved published courses"
ON public.courses
FOR SELECT
USING ((is_published = true AND approval_status = 'approved'));

-- Allow admins to insert notifications for all users (announcements)
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (is_admin_or_higher(auth.uid()));