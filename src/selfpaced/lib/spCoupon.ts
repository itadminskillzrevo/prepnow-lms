import { supabase } from '@/integrations/supabase/client';

export interface SpCouponResult {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  discountAmount: number;
  finalPrice: number;
}

export const computeDiscount = (coupon: any, amount: number) => {
  let d = coupon.discount_type === 'percentage'
    ? (amount * Number(coupon.discount_value)) / 100
    : Number(coupon.discount_value);
  if (coupon.max_discount_limit && d > Number(coupon.max_discount_limit)) d = Number(coupon.max_discount_limit);
  return Math.max(0, Math.min(d, amount));
};

/** Client-side (best-effort) coupon validation. Server re-validates at order creation. */
export const validateSpCoupon = async (
  code: string,
  courses: Array<{ id: string; price: number }>,
  subtotal: number,
  userId: string
): Promise<{ result?: SpCouponResult; error?: string }> => {
  if (!code.trim()) return { error: 'Please enter a coupon code' };

  const { data: coupon, error } = await supabase
    .from('sp_coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!coupon) return { error: 'Invalid coupon code' };
  if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) return { error: 'This coupon has expired' };
  if (new Date(coupon.start_date) > new Date()) return { error: 'This coupon is not yet active' };
  if (coupon.applicable_to === 'specific_course' && !courses.some(course => course.id === coupon.course_id)) {
    return { error: 'This coupon is not valid for the courses in your cart' };
  }
  if (coupon.min_purchase_amount && subtotal < Number(coupon.min_purchase_amount)) {
    return { error: `Minimum purchase amount is ₹${coupon.min_purchase_amount}` };
  }
  if (coupon.per_user_limit) {
    const { count } = await supabase
      .from('sp_coupon_usage')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId);
    if ((count || 0) >= coupon.per_user_limit) return { error: 'You have already used this coupon' };
  }

  const eligibleAmount = coupon.applicable_to === 'specific_course'
    ? Number(courses.find(course => course.id === coupon.course_id)?.price ?? 0)
    : subtotal;
  const discountAmount = computeDiscount(coupon, eligibleAmount);
  return {
    result: {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      discountAmount,
      finalPrice: subtotal - discountAmount,
    },
  };
};


