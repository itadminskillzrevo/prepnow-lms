
-- Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value numeric NOT NULL DEFAULT 0,
  coupon_type text NOT NULL DEFAULT 'per_user', -- 'one_time', 'per_user', 'unlimited', 'monthly', 'campaign'
  max_total_usage integer,
  per_user_limit integer DEFAULT 1,
  min_purchase_amount numeric DEFAULT 0,
  max_discount_limit numeric,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  expiry_date timestamp with time zone,
  applicable_to text NOT NULL DEFAULT 'all', -- 'all', 'specific_course', 'subscription'
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Coupon usage tracking table
CREATE TABLE public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  discount_applied numeric NOT NULL DEFAULT 0,
  original_price numeric NOT NULL DEFAULT 0,
  final_price numeric NOT NULL DEFAULT 0,
  used_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- Coupons RLS: Admins can manage all
CREATE POLICY "Admins can manage all coupons"
ON public.coupons FOR ALL TO authenticated
USING (is_admin_or_higher(auth.uid()));

-- Anyone can view active coupons (for validation at checkout)
CREATE POLICY "Anyone can view active coupons"
ON public.coupons FOR SELECT TO authenticated
USING (is_active = true AND (expiry_date IS NULL OR expiry_date > now()));

-- Coupon usage RLS
CREATE POLICY "Admins can manage all coupon usage"
ON public.coupon_usage FOR ALL TO authenticated
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Users can view own coupon usage"
ON public.coupon_usage FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coupon usage"
ON public.coupon_usage FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add coupon fields to enrollments
ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
