import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CouponResult {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_discount_limit: number | null;
  discountAmount: number;
  finalPrice: number;
}

export const useCouponValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);

  const validateAndApply = async (
    code: string,
    courseId: string,
    coursePrice: number,
    userId: string
  ): Promise<CouponResult | null> => {
    if (!code.trim()) {
      toast.error('Please enter a coupon code');
      return null;
    }

    setIsValidating(true);
    try {
      // Fetch coupon
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!coupon) {
        toast.error('Invalid coupon code');
        return null;
      }

      // Check expiry
      if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
        toast.error('This coupon has expired');
        return null;
      }

      // Check start date
      if (new Date(coupon.start_date) > new Date()) {
        toast.error('This coupon is not yet active');
        return null;
      }

      // Check course applicability
      if (coupon.applicable_to === 'specific_course' && coupon.course_id !== courseId) {
        toast.error('This coupon is not valid for this course');
        return null;
      }

      // Check min purchase
      if (coupon.min_purchase_amount && coursePrice < Number(coupon.min_purchase_amount)) {
        toast.error(`Minimum purchase amount is ₹${coupon.min_purchase_amount}`);
        return null;
      }

      // Check total usage
      if (coupon.max_total_usage) {
        const { count } = await supabase
          .from('coupon_usage')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id);
        if ((count || 0) >= coupon.max_total_usage) {
          toast.error('This coupon has reached its usage limit');
          return null;
        }
      }

      // Check per-user usage
      if (coupon.per_user_limit) {
        const { count } = await supabase
          .from('coupon_usage')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('user_id', userId);
        if ((count || 0) >= coupon.per_user_limit) {
          toast.error('You have already used this coupon');
          return null;
        }
      }

      // One-time coupon check
      if (coupon.coupon_type === 'one_time') {
        const { count } = await supabase
          .from('coupon_usage')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id);
        if ((count || 0) >= 1) {
          toast.error('This coupon has already been used');
          return null;
        }
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = (coursePrice * Number(coupon.discount_value)) / 100;
      } else {
        discountAmount = Number(coupon.discount_value);
      }

      // Apply max discount limit
      if (coupon.max_discount_limit && discountAmount > Number(coupon.max_discount_limit)) {
        discountAmount = Number(coupon.max_discount_limit);
      }

      // Can't exceed price
      discountAmount = Math.min(discountAmount, coursePrice);
      const finalPrice = coursePrice - discountAmount;

      const result: CouponResult = {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: Number(coupon.discount_value),
        max_discount_limit: coupon.max_discount_limit ? Number(coupon.max_discount_limit) : null,
        discountAmount,
        finalPrice,
      };

      setAppliedCoupon(result);
      toast.success('Coupon Applied Successfully 🎉');
      return result;
    } catch (e: any) {
      toast.error(e.message || 'Failed to validate coupon');
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast.info('Coupon removed');
  };

  return { validateAndApply, removeCoupon, appliedCoupon, isValidating };
};
