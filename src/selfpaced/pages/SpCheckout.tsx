import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { formatPrice } from '@/selfpaced/lib/cart';
import { validateSpCoupon, SpCouponResult } from '@/selfpaced/lib/spCoupon';
import { toast } from 'sonner';
import { ShieldCheck, X } from 'lucide-react';
import { isOrangePgUatEnabled, startOrangePgPayment } from '@/lib/orangePg';

declare global { interface Window { Razorpay: any } }

const loadRazorpay = () => new Promise<boolean>((resolve) => {
  if (window.Razorpay) return resolve(true);
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = () => resolve(true); s.onerror = () => resolve(false);
  document.body.appendChild(s);
});

const SpCheckout: React.FC = () => {
  const { user, profile } = useSpAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [address, setAddress] = useState(profile?.address || '');
  const [city, setCity] = useState(profile?.city || '');
  const [state, setState] = useState(profile?.state || '');
  const [pincode, setPincode] = useState(profile?.pincode || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<SpCouponResult | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('selfpaced_cart_items')
      .select('id, course_id, selfpaced_courses(id,title,price,original_price,currency,thumbnail_url)')
      .eq('user_id', user.id)
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, [user?.id]);

  const subtotal = items.reduce((s, i) => s + Number(i.selfpaced_courses?.price ?? 0), 0);
  const discount = coupon?.discountAmount ?? 0;
  const total = Math.max(0, subtotal - discount);

  const applyCoupon = async () => {
    if (!user) return;
    setValidating(true);
    const { result, error } = await validateSpCoupon(
      couponCode,
      items.map(i => ({ id: i.course_id, price: Number(i.selfpaced_courses?.price ?? 0) })),
      subtotal,
      user.id
    );
    setValidating(false);
    if (error || !result) { toast.error(error || 'Invalid coupon'); return; }
    setCoupon(result);
    toast.success('Coupon applied successfully 🎉');
  };

  const removeCoupon = () => { setCoupon(null); setCouponCode(''); };

  const pay = async (gateway: 'razorpay' | 'orange_pg' = 'razorpay') => {
    if (!user || items.length === 0) return;
    if (!phone) { toast.error('Phone number is required'); return; }
    setProcessing(true);
    try {
      if (gateway === 'razorpay') {
        const ok = await loadRazorpay();
        if (!ok) throw new Error('Failed to load Razorpay');
      }

      // update profile shipping
      await supabase.from('selfpaced_profiles').update({ phone, address, city, state, pincode }).eq('user_id', user.id);

      const { data, error } = await supabase.functions.invoke('sp-create-order', {
        body: {
          courseIds: items.map(i => i.course_id),
          amount: total,
          currency: 'INR',
          couponCode: coupon?.code ?? null,
          gateway,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const { orderId, key, spOrderId, amount } = data;

      if (gateway === 'orange_pg') {
        await startOrangePgPayment('selfpaced', spOrderId);
        return;
      }

      const rz = new window.Razorpay({
        key,
        amount: Math.round(Number(amount ?? total) * 100),
        currency: 'INR',
        name: 'SkillzRevo Self-Paced',
        description: `${items.length} course(s)`,
        order_id: orderId,
        prefill: { email: user.email, contact: phone, name: profile?.full_name || '' },
        theme: { color: '#4f46e5' },
        handler: async (resp: any) => {
          const { error: verifyErr, data: verifyData } = await supabase.functions.invoke('sp-verify-payment', {
            body: {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              spOrderId,
            },
          });
          if (verifyErr || !verifyData?.success) { toast.error('Payment verification failed'); setProcessing(false); return; }
          toast.success('Payment successful!');
          nav(`/selfpaced/orders/${spOrderId}?success=1`);
        },
        modal: { ondismiss: () => setProcessing(false) },
      });
      rz.open();
    } catch (e: any) {
      toast.error(e.message || 'Checkout failed');
      setProcessing(false);
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
  if (items.length === 0) return <div style={{ padding: '3rem', textAlign: 'center' }}>Your cart is empty.</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }} className="sp-checkout-grid">
      <div className="sp-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Billing details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
          <input className="sp-input" placeholder="Phone *" value={phone} onChange={e => setPhone(e.target.value)} />
          <input className="sp-input" placeholder="Pincode" value={pincode} onChange={e => setPincode(e.target.value)} />
          <input className="sp-input" style={{ gridColumn: '1/-1' }} placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
          <input className="sp-input" placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
          <input className="sp-input" placeholder="State" value={state} onChange={e => setState(e.target.value)} />
        </div>
        <h3>Order items</h3>
        {items.map(it => (
          <div key={it.id} style={{ display: 'flex', gap: '.75rem', padding: '.6rem 0', borderTop: '1px solid hsl(var(--sp-border))' }}>
            <img src={it.selfpaced_courses.thumbnail_url || '/placeholder.svg'} alt="" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }} />
            <div style={{ flex: 1, fontSize: '.9rem' }}>{it.selfpaced_courses.title}</div>
            <div style={{ fontWeight: 600 }}>{formatPrice(it.selfpaced_courses.price)}</div>
          </div>
        ))}
      </div>
      <aside className="sp-card" style={{ padding: '1.25rem', height: 'fit-content', position: 'sticky', top: 80 }}>
        <h3 style={{ marginTop: 0 }}>Payment</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0' }}><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>

        {coupon ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.5rem .6rem', margin: '.5rem 0', borderRadius: 8, background: 'hsl(var(--sp-primary) / 0.08)' }}>
            <div style={{ fontSize: '.85rem' }}>
              <strong>{coupon.code}</strong>
              <div style={{ color: 'hsl(var(--sp-success))' }}>You saved {formatPrice(coupon.discountAmount)}</div>
            </div>
            <button className="sp-btn sp-btn-ghost" onClick={removeCoupon} title="Remove coupon"><X size={15} /></button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '.4rem', margin: '.6rem 0' }}>
            <input className="sp-input" style={{ flex: 1 }} placeholder="Coupon code"
              value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} />
            <button className="sp-btn sp-btn-outline" disabled={validating} onClick={applyCoupon}>
              {validating ? '...' : 'Apply'}
            </button>
          </div>
        )}

        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', color: 'hsl(var(--sp-success))' }}>
            <span>Coupon discount</span><span>-{formatPrice(discount)}</span>
          </div>
        )}
        <hr style={{ border: 0, borderTop: '1px solid hsl(var(--sp-border))', margin: '.5rem 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', fontWeight: 700, fontSize: '1.15rem' }}><span>Total</span><span>{formatPrice(total)}</span></div>
        <button className="sp-btn" style={{ width: '100%', marginTop: '1rem' }} disabled={processing} onClick={() => pay()}>
          {processing ? 'Processing...' : 'Pay with Razorpay'}
        </button>
        {isOrangePgUatEnabled && (
          <button className="sp-btn sp-btn-outline" style={{ width: '100%', marginTop: '.5rem' }} disabled={processing} onClick={() => pay('orange_pg')}>
            {processing ? 'Processing...' : 'Pay with Orange PG (UAT)'}
          </button>
        )}
        <p style={{ fontSize: '.75rem', color: 'hsl(var(--sp-muted))', marginTop: '.75rem', display: 'flex', gap: '.3rem', alignItems: 'center' }}>
          <ShieldCheck size={14} /> Secure payment via selected gateway
        </p>
      </aside>
      <style>{`@media(max-width:820px){.sp-checkout-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
};

export default SpCheckout;
