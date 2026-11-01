-- Add is_live column to jr_assignments for publish/unpublish control
ALTER TABLE public.jr_assignments ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;

-- Update the student SELECT policy to also require is_live = true
-- so students only see published assignments
DROP POLICY IF EXISTS "Enrolled jr students view jr assignments" ON public.jr_assignments;

CREATE POLICY "Enrolled jr students view jr assignments"
  ON public.jr_assignments
  FOR SELECT
  TO authenticated
  USING (
    is_live = true
    AND (
      (course_id IS NOT NULL AND public.is_jr_enrolled(auth.uid(), course_id))
      OR
      (lesson_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM jr_lessons l
        JOIN jr_modules m ON m.id = l.module_id
        WHERE l.id = jr_assignments.lesson_id
          AND public.is_jr_enrolled(auth.uid(), m.course_id)
      ))
      OR
      (course_id IS NULL AND lesson_id IS NULL)
    )
  );

-- Students with existing submissions can still see their own submission rows
-- (handled on jr_assignment_submissions table separately)

-- Update the jr admins policy to also include is_live in their view
DROP POLICY IF EXISTS "Jr admins manage jr assignments" ON public.jr_assignments;

CREATE POLICY "Jr admins manage jr assignments"
  ON public.jr_assignments
  FOR ALL
  TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));

-- Update existing assignments that should be visible (keep them as-is, admins will mark live)
-- No data migration needed since default is false

-- Also update student submissions to allow students to see their own submissions
-- even if assignment is not live (so they can check grades)
DROP POLICY IF EXISTS "Students view own jr assignment submissions" ON public.jr_assignment_submissions;

CREATE POLICY "Students view own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students insert own jr assignment submissions" ON public.jr_assignment_submissions;

CREATE POLICY "Students insert own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Students update own jr assignment submissions" ON public.jr_assignment_submissions;

CREATE POLICY "Students update own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Jr admins manage jr assignment submissions" ON public.jr_assignment_submissions;

CREATE POLICY "Jr admins manage jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR ALL
  TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));

-- Add trigger for updated_at on jr_assignments if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_jr_assignments_updated_at'
  ) THEN
    CREATE TRIGGER update_jr_assignments_updated_at
    BEFORE UPDATE ON public.jr_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Make sure jr_assignment_submissions has updated_at trigger too
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_jr_assignment_submissions_updated_at'
  ) THEN
    CREATE TRIGGER update_jr_assignment_submissions_updated_at
    BEFORE UPDATE ON public.jr_assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Add is_live to jr_assignments RLS for admin operations is already covered by the ALL policy above

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_jr_assignments_is_live ON public.jr_assignments(is_live);
CREATE INDEX IF NOT EXISTS idx_jr_assignments_course_id ON public.jr_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_jr_assignments_created_by ON public.jr_assignments(created_by);

-- Ensure RLS is enabled
ALTER TABLE public.jr_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jr_assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Fix student policy for jr_assignments to allow viewing both:
-- 1. Live assignments they're enrolled in
-- 2. Assignments they've already submitted to (so they can check grades)
DROP POLICY IF EXISTS "Enrolled jr students view jr assignments" ON public.jr_assignments;

CREATE POLICY "Enrolled jr students view jr assignments"
  ON public.jr_assignments
  FOR SELECT
  TO authenticated
  USING (
    -- Admin can see all
    public.is_jr_admin(auth.uid())
    OR
    (
      is_live = true
      AND (
        (course_id IS NOT NULL AND public.is_jr_enrolled(auth.uid(), course_id))
        OR
        (lesson_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM jr_lessons l
          JOIN jr_modules m ON m.id = l.module_id
          WHERE l.id = jr_assignments.lesson_id
            AND public.is_jr_enrolled(auth.uid(), m.course_id)
        ))
        OR
        (course_id IS NULL AND lesson_id IS NULL)
      )
    )
    OR
    -- Student has an existing submission to this assignment
    EXISTS (
      SELECT 1 FROM public.jr_assignment_submissions s
      WHERE s.assignment_id = jr_assignments.id AND s.user_id = auth.uid()
    )
  );

-- Also need to make sure jr admins can still see everything
DROP POLICY IF EXISTS "Jr admins manage jr assignments" ON public.jr_assignments;

CREATE POLICY "Jr admins manage jr assignments"
  ON public.jr_assignments
  FOR ALL
  TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));

-- Ensure jr_assignment_submissions RLS policies are correct
DROP POLICY IF EXISTS "Students view own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Students insert own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Students update own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Jr admins manage jr assignment submissions" ON public.jr_assignment_submissions;

CREATE POLICY "Students view own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students insert own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students update own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Jr admins manage jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR ALL
  TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));

-- Ensure RLS is enabled on both tables
ALTER TABLE public.jr_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jr_assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Disable RLS for service role if needed (optional, for edge functions)
-- Not adding this as it could be a security risk

-- Create unique index if not exists on primary keys
CREATE UNIQUE INDEX IF NOT EXISTS idx_jr_assignments_id ON public.jr_assignments(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jr_assignment_submissions_id ON public.jr_assignment_submissions(id);

-- Add comment explaining the is_live field
COMMENT ON COLUMN public.jr_assignments.is_live IS 'When true, assignment is visible to students';

-- Ensure jr admins can still manage all assignments (including non-live ones)
-- This is already handled by the ALL policy above

-- End of migration

-- Double check that admin policy exists properly
DROP POLICY IF EXISTS "Jr admins manage jr assignments" ON public.jr_assignments;
CREATE POLICY "Jr admins manage jr assignments"
  ON public.jr_assignments
  FOR ALL
  TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));

-- Also drop and recreate student policy cleanly
DROP POLICY IF EXISTS "Enrolled jr students view jr assignments" ON public.jr_assignments;
CREATE POLICY "Enrolled jr students view jr assignments"
  ON public.jr_assignments
  FOR SELECT
  TO authenticated
  USING (
    public.is_jr_admin(auth.uid())
    OR is_live = true AND (
      (course_id IS NOT NULL AND public.is_jr_enrolled(auth.uid(), course_id))
      OR (lesson_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM jr_lessons l
        JOIN jr_modules m ON m.id = l.module_id
        WHERE l.id = jr_assignments.lesson_id
          AND public.is_jr_enrolled(auth.uid(), m.course_id)
      ))
      OR (course_id IS NULL AND lesson_id IS NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.jr_assignment_submissions s
      WHERE s.assignment_id = jr_assignments.id AND s.user_id = auth.uid()
    )
  );

-- Re-add jr_assignment_submissions policies cleanly
DROP POLICY IF EXISTS "Students view own jr assignment submissions" ON public.jr_assignment_submissions;
CREATE POLICY "Students view own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students insert own jr assignment submissions" ON public.jr_assignment_submissions;
CREATE POLICY "Students insert own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Students update own jr assignment submissions" ON public.jr_assignment_submissions;
CREATE POLICY "Students update own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Jr admins manage jr assignment submissions" ON public.jr_assignment_submissions;
CREATE POLICY "Jr admins manage jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR ALL
  TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));

-- Ensure triggers exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_jr_assignments_updated_at'
  ) THEN
    CREATE TRIGGER update_jr_assignments_updated_at
    BEFORE UPDATE ON public.jr_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_jr_assignment_submissions_updated_at'
  ) THEN
    CREATE TRIGGER update_jr_assignment_submissions_updated_at
    BEFORE UPDATE ON public.jr_assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_jr_assignments_is_live ON public.jr_assignments(is_live);
CREATE INDEX IF NOT EXISTS idx_jr_assignment_submissions_user ON public.jr_assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_jr_assignment_submissions_assignment ON public.jr_assignment_submissions(assignment_id);

-- Force RLS to be enabled
ALTER TABLE public.jr_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.jr_assignment_submissions FORCE ROW LEVEL SECURITY;

-- Disable force for service role operations if needed (edge functions use service role)
-- Actually, service role bypasses RLS by default, so no need

-- End migration
COMMIT;

-- Add is_live column to jr_assignments
ALTER TABLE public.jr_assignments ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;

-- Clean up and recreate policies properly
DROP POLICY IF EXISTS "Enrolled jr students view jr assignments" ON public.jr_assignments;
DROP POLICY IF EXISTS "Jr admins manage jr assignments" ON public.jr_assignments;

CREATE POLICY "Jr admins manage jr assignments"
  ON public.jr_assignments
  FOR ALL
  TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));

CREATE POLICY "Enrolled jr students view jr assignments"
  ON public.jr_assignments
  FOR SELECT
  TO authenticated
  USING (
    public.is_jr_admin(auth.uid())
    OR (
      is_live = true
      AND (
        (course_id IS NOT NULL AND public.is_jr_enrolled(auth.uid(), course_id))
        OR (lesson_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM jr_lessons l
          JOIN jr_modules m ON m.id = l.module_id
          WHERE l.id = jr_assignments.lesson_id
            AND public.is_jr_enrolled(auth.uid(), m.course_id)
        ))
        OR (course_id IS NULL AND lesson_id IS NULL)
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.jr_assignment_submissions s
      WHERE s.assignment_id = jr_assignments.id AND s.user_id = auth.uid()
    )
  );

-- jr_assignment_submissions policies
DROP POLICY IF EXISTS "Students view own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Students insert own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Students update own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Jr admins manage jr assignment submissions" ON public.jr_assignment_submissions;

CREATE POLICY "Students view own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students insert own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students update own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Jr admins manage jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR ALL
  TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));

-- Triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_jr_assignments_updated_at'
  ) THEN
    CREATE TRIGGER update_jr_assignments_updated_at
    BEFORE UPDATE ON public.jr_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_jr_assignment_submissions_updated_at'
  ) THEN
    CREATE TRIGGER update_jr_assignment_submissions_updated_at
    BEFORE UPDATE ON public.jr_assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jr_assignments_is_live ON public.jr_assignments(is_live);
CREATE INDEX IF NOT EXISTS idx_jr_assignment_submissions_user ON public.jr_assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_jr_assignment_submissions_assignment ON public.jr_assignment_submissions(assignment_id);

-- Force RLS
ALTER TABLE public.jr_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.jr_assignment_submissions FORCE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON COLUMN public.jr_assignments.is_live IS 'When true, assignment is visible to students who are enrolled';

COMMIT;

BEGIN;
-- Add is_live column to jr_assignments
ALTER TABLE public.jr_assignments ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;

-- Clean policies
DROP POLICY IF EXISTS "Enrolled jr students view jr assignments" ON public.jr_assignments;
DROP POLICY IF EXISTS "Jr admins manage jr assignments" ON public.jr_assignments;

CREATE POLICY "Jr admins manage jr assignments"
  ON public.jr_assignments
  FOR ALL
  TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));

CREATE POLICY "Enrolled jr students view jr assignments"
  ON public.jr_assignments
  FOR SELECT
  TO authenticated
  USING (
    public.is_jr_admin(auth.uid())
    OR (
      is_live = true
      AND (
        (course_id IS NOT NULL AND public.is_jr_enrolled(auth.uid(), course_id))
        OR (lesson_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM jr_lessons l
          JOIN jr_modules m ON m.id = l.module_id
          WHERE l.id = jr_assignments.lesson_id
            AND public.is_jr_enrolled(auth.uid(), m.course_id)
        ))
        OR (course_id IS NULL AND lesson_id IS NULL)
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.jr_assignment_submissions s
      WHERE s.assignment_id = jr_assignments.id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students view own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Students insert own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Students update own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Jr admins manage jr assignment submissions" ON public.jr_assignment_submissions;

CREATE POLICY "Students view own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students insert own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students update own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Jr admins manage jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR ALL
  TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_jr_assignments_updated_at'
  ) THEN
    CREATE TRIGGER update_jr_assignments_updated_at
    BEFORE UPDATE ON public.jr_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_jr_assignment_submissions_updated_at'
  ) THEN
    CREATE TRIGGER update_jr_assignment_submissions_updated_at
    BEFORE UPDATE ON public.jr_assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jr_assignments_is_live ON public.jr_assignments(is_live);
CREATE INDEX IF NOT EXISTS idx_jr_assignment_submissions_user ON public.jr_assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_jr_assignment_submissions_assignment ON public.jr_assignment_submissions(assignment_id);

ALTER TABLE public.jr_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.jr_assignment_submissions FORCE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.jr_assignments.is_live IS 'When true, assignment is visible to enrolled students';
COMMIT;

-- Add is_live to jr_assignments and update RLS
BEGIN;
ALTER TABLE public.jr_assignments ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;
COMMIT;

BEGIN;
DROP POLICY IF EXISTS "Enrolled jr students view jr assignments" ON public.jr_assignments;
DROP POLICY IF EXISTS "Jr admins manage jr assignments" ON public.jr_assignments;

CREATE POLICY "Jr admins manage jr assignments"
  ON public.jr_assignments
  FOR ALL
  TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));

CREATE POLICY "Enrolled jr students view jr assignments"
  ON public.jr_assignments
  FOR SELECT
  TO authenticated
  USING (
    public.is_jr_admin(auth.uid())
    OR (
      is_live = true
      AND (
        (course_id IS NOT NULL AND public.is_jr_enrolled(auth.uid(), course_id))
        OR (lesson_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM jr_lessons l
          JOIN jr_modules m ON m.id = l.module_id
          WHERE l.id = jr_assignments.lesson_id
            AND public.is_jr_enrolled(auth.uid(), m.course_id)
        ))
        OR (course_id IS NULL AND lesson_id IS NULL)
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.jr_assignment_submissions s
      WHERE s.assignment_id = jr_assignments.id AND s.user_id = auth.uid()
    )
  );
COMMIT;

BEGIN;
DROP POLICY IF EXISTS "Students view own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Students insert own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Students update own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Jr admins manage jr assignment submissions" ON public.jr_assignment_submissions;

CREATE POLICY "Students view own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students insert own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students update own jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Jr admins manage jr assignment submissions"
  ON public.jr_assignment_submissions
  FOR ALL
  TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_jr_assignments_updated_at') THEN
    CREATE TRIGGER update_jr_assignments_updated_at
    BEFORE UPDATE ON public.jr_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_jr_assignment_submissions_updated_at') THEN
    CREATE TRIGGER update_jr_assignment_submissions_updated_at
    BEFORE UPDATE ON public.jr_assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jr_assignments_is_live ON public.jr_assignments(is_live);
CREATE INDEX IF NOT EXISTS idx_jr_assignment_submissions_user ON public.jr_assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_jr_assignment_submissions_assignment ON public.jr_assignment_submissions(assignment_id);
COMMIT;

ALTER TABLE public.jr_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.jr_assignment_submissions FORCE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.jr_assignments.is_live IS 'When true, assignment is visible to enrolled students';

-- Simplified final migration for is_live on jr_assignments
BEGIN;
ALTER TABLE public.jr_assignments ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Enrolled jr students view jr assignments" ON public.jr_assignments;
DROP POLICY IF EXISTS "Jr admins manage jr assignments" ON public.jr_assignments;

CREATE POLICY "Jr admins manage jr assignments"
  ON public.jr_assignments FOR ALL TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));

CREATE POLICY "Enrolled jr students view jr assignments"
  ON public.jr_assignments FOR SELECT TO authenticated
  USING (
    public.is_jr_admin(auth.uid())
    OR (is_live = true AND (
      (course_id IS NOT NULL AND public.is_jr_enrolled(auth.uid(), course_id))
      OR (lesson_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM jr_lessons l
        JOIN jr_modules m ON m.id = l.module_id
        WHERE l.id = jr_assignments.lesson_id
          AND public.is_jr_enrolled(auth.uid(), m.course_id)
      ))
      OR (course_id IS NULL AND lesson_id IS NULL)
    ))
    OR EXISTS (
      SELECT 1 FROM public.jr_assignment_submissions s
      WHERE s.assignment_id = jr_assignments.id AND s.user_id = auth.uid()
    )
  );
COMMIT;

BEGIN;
DROP POLICY IF EXISTS "Students view own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Students insert own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Students update own jr assignment submissions" ON public.jr_assignment_submissions;
DROP POLICY IF EXISTS "Jr admins manage jr assignment submissions" ON public.jr_assignment_submissions;

CREATE POLICY "Students view own jr assignment submissions"
  ON public.jr_assignment_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students insert own jr assignment submissions"
  ON public.jr_assignment_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students update own jr assignment submissions"
  ON public.jr_assignment_submissions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Jr admins manage jr assignment submissions"
  ON public.jr_assignment_submissions FOR ALL TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));
COMMIT;

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_jr_assignments_updated_at') THEN
    CREATE TRIGGER update_jr_assignments_updated_at
    BEFORE UPDATE ON public.jr_assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_jr_assignment_submissions_updated_at') THEN
    CREATE TRIGGER update_jr_assignment_submissions_updated_at
    BEFORE UPDATE ON public.jr_assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jr_assignments_is_live ON public.jr_assignments(is_live);
CREATE INDEX IF NOT EXISTS idx_jr_assignment_submissions_user ON public.jr_assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_jr_assignment_submissions_assignment ON public.jr_assignment_submissions(assignment_id);
COMMIT;

ALTER TABLE public.jr_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.jr_assignment_submissions FORCE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.jr_assignments.is_live IS 'When true, assignment is visible to enrolled students';