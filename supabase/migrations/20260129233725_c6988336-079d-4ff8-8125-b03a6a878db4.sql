-- Drop existing insert policy and add a new one that allows admins to enroll any user
DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;

-- Create policy that allows users to enroll themselves OR admins to enroll anyone
CREATE POLICY "Users can enroll themselves or admins can enroll anyone" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR is_admin_or_higher(auth.uid())
);

-- Also add a policy for batch_enrollments to allow admins to add users
DROP POLICY IF EXISTS "Admins can manage all batch enrollments" ON public.batch_enrollments;

CREATE POLICY "Admins can manage all batch enrollments" 
ON public.batch_enrollments 
FOR ALL 
USING (is_admin_or_higher(auth.uid()));

-- Make sure there's an insert policy for users adding themselves
DROP POLICY IF EXISTS "Users can enroll in batches" ON public.batch_enrollments;

CREATE POLICY "Users can enroll in batches" 
ON public.batch_enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR is_admin_or_higher(auth.uid()));