-- Add payment and approval fields to enrollments table
ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_id text,
ADD COLUMN IF NOT EXISTS payment_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approval_notes text;

-- Add index for faster queries on payment and approval status
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_status ON public.enrollments(payment_status);
CREATE INDEX IF NOT EXISTS idx_enrollments_approval_status ON public.enrollments(approval_status);

-- Update RLS to allow admins to update enrollments for approval
CREATE POLICY "Admins can update enrollments for approval" 
ON public.enrollments 
FOR UPDATE 
USING (is_admin_or_higher(auth.uid()));

-- Allow users to update their own enrollments (for payment info)
CREATE POLICY "Users can update own enrollment payment" 
ON public.enrollments 
FOR UPDATE 
USING (auth.uid() = user_id);