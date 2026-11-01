
-- Add course_type and requirements to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_type text NOT NULL DEFAULT 'live';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS requirements text[] DEFAULT '{}';

-- Create course_reviews table
CREATE TABLE public.course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews of published courses
CREATE POLICY "Anyone can view reviews of published courses"
ON public.course_reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_reviews.course_id AND c.is_published = true
  )
);

-- Users can create their own reviews (only if enrolled and completed)
CREATE POLICY "Users can create own reviews"
ON public.course_reviews FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = course_reviews.course_id
    AND e.user_id = auth.uid()
    AND e.approval_status = 'approved'
  )
);

-- Users can update own reviews
CREATE POLICY "Users can update own reviews"
ON public.course_reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete own reviews
CREATE POLICY "Users can delete own reviews"
ON public.course_reviews FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
ON public.course_reviews FOR ALL
USING (is_admin_or_higher(auth.uid()));
