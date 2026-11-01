import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const emit = (evt: string) => window.dispatchEvent(new CustomEvent(evt));

export const addToCart = async (userId: string, courseId: string) => {
  const { data: enr } = await supabase.from('selfpaced_enrollments').select('id')
    .eq('user_id', userId).eq('course_id', courseId).maybeSingle();
  if (enr) { toast.info('You already own this course'); return false; }
  const { error } = await supabase.from('selfpaced_cart_items').insert({ user_id: userId, course_id: courseId });
  if (error) {
    if (error.code === '23505') { toast.info('Already in cart'); return true; }
    toast.error(error.message); return false;
  }
  toast.success('Added to cart');
  emit('sp:cart-updated');
  return true;
};

export const removeFromCart = async (userId: string, courseId: string) => {
  const { error } = await supabase.from('selfpaced_cart_items').delete()
    .eq('user_id', userId).eq('course_id', courseId);
  if (error) { toast.error(error.message); return false; }
  emit('sp:cart-updated');
  return true;
};

export const addToWishlist = async (userId: string, courseId: string) => {
  const { error } = await supabase.from('selfpaced_wishlist').insert({ user_id: userId, course_id: courseId });
  if (error) {
    if (error.code === '23505') { toast.info('Already in wishlist'); return true; }
    toast.error(error.message); return false;
  }
  toast.success('Added to wishlist');
  emit('sp:wishlist-updated');
  return true;
};

export const removeFromWishlist = async (userId: string, courseId: string) => {
  const { error } = await supabase.from('selfpaced_wishlist').delete()
    .eq('user_id', userId).eq('course_id', courseId);
  if (error) { toast.error(error.message); return false; }
  emit('sp:wishlist-updated');
  return true;
};

export const moveWishlistToCart = async (userId: string, courseId: string) => {
  const ok = await addToCart(userId, courseId);
  if (ok) await removeFromWishlist(userId, courseId);
};

export const formatPrice = (n: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0);
