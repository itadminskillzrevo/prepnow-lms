-- Add approval workflow columns to jr_courses
ALTER TABLE public.jr_courses
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_notes text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Existing courses should be considered approved so nothing breaks
UPDATE public.jr_courses SET approval_status = 'approved' WHERE approval_status IS NULL OR approval_status = 'pending';

-- Restrict public visibility to approved+published
DROP POLICY IF EXISTS "Anyone view published jr courses" ON public.jr_courses;
CREATE POLICY "Anyone view published approved jr courses"
  ON public.jr_courses FOR SELECT
  USING (is_published = true AND approval_status = 'approved');

-- Add approval workflow columns to jr_enrollments
ALTER TABLE public.jr_enrollments
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_notes text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Existing free enrollments (none paid) should be auto-approved
UPDATE public.jr_enrollments SET approval_status = 'approved' WHERE approval_status IS NULL OR (payment_status <> 'completed' AND approval_status = 'pending');