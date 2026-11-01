
ALTER TABLE public.jr_enrollments
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- Allow students to update their own enrollment payment fields
DROP POLICY IF EXISTS "Jr students update own enrollment payment" ON public.jr_enrollments;
CREATE POLICY "Jr students update own enrollment payment" ON public.jr_enrollments
  FOR UPDATE USING (auth.uid() = user_id);
