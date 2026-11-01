import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { JrLayout } from '@/jr/components/JrLayout';
import { supabase } from '@/integrations/supabase/client';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { ArrowLeft, CreditCard, Smartphone, Wallet, CheckCircle, Loader2, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { isOrangePgUatEnabled, startOrangePgPayment } from '@/lib/orangePg';

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) return resolve(true);
    const s = document.createElement('script');
    s.id = 'razorpay-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export default function JrPayment() {
  const { courseId } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useJrAuth();
  const [course, setCourse] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>((loc.state as any)?.enrollmentId ?? null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [method, setMethod] = useState('razorpay');

  useEffect(() => {
    if (!courseId || !user) return;
    (async () => {
      const [{ data: c }, { data: p }, { data: existing }] = await Promise.all([
        supabase.from('jr_courses').select('*').eq('id', courseId).maybeSingle(),
        supabase.from('jr_profiles').select('full_name, email').eq('user_id', user.id).maybeSingle(),
        supabase.from('jr_enrollments').select('*').eq('user_id', user.id).eq('course_id', courseId).maybeSingle(),
      ]);
      setCourse(c); setProfile(p);
      if (existing) {
        setEnrollmentId(existing.id);
        if (existing.payment_status === 'completed') {
          nav(`/jr/courses/${courseId}`, { replace: true });
          return;
        }
      }
      setLoading(false);
    })();
  }, [courseId, user]);

  if (!user) { nav('/jr/auth?mode=signup'); return null; }

  const ensureEnrollment = async (isFreeEnroll = false): Promise<string | null> => {
    if (enrollmentId) {
      if (isFreeEnroll) {
        await supabase.from('jr_enrollments').update({ payment_status: 'completed', payment_amount: 0, payment_date: new Date().toISOString() }).eq('id', enrollmentId);
      }
      return enrollmentId;
    }
    const { data, error } = await supabase
      .from('jr_enrollments')
      .insert({
        user_id: user.id,
        course_id: courseId!,
        payment_status: isFreeEnroll ? 'completed' : 'pending',
        approval_status: 'pending',
        payment_amount: isFreeEnroll ? 0 : undefined,
        payment_date: isFreeEnroll ? new Date().toISOString() : undefined,
      })
      .select('id')
      .single();
    if (error) { toast.error(error.message); return null; }
    setEnrollmentId(data.id);
    return data.id;
  };

  const pay = async () => {
    if (!course) return;
    setProcessing(true);
    try {
      const eid = await ensureEnrollment();
      if (!eid) { setProcessing(false); return; }

      if (method === 'orange_pg') {
        await startOrangePgPayment('jr', eid);
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok) { toast.error('Failed to load payment gateway'); setProcessing(false); return; }

      const price = Number(course.price ?? 0);
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { amount: price, currency: 'INR', courseId, enrollmentId: eid },
      });
      if (orderError || !orderData?.orderId) throw new Error(orderData?.error || 'Failed to create order');

      const options = {
        key: orderData.key,
        amount: Math.round(price * 100),
        currency: 'INR',
        name: 'Prepnow Junior 🎓',
        description: course.title,
        order_id: orderData.orderId,
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || user.email || '',
        },
        theme: { color: '#6366f1' },
        handler: async (response: any) => {
          try {
            const { data: vd, error: ve } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                enrollmentId: eid,
                userId: user.id,
                finalPrice: price,
                coursePrice: price,
                isJr: true,
              },
            });
            if (ve || !vd?.success) throw new Error(vd?.error || 'Verification failed');
            setDone(true);
            toast.success('Payment successful! 🎉');
          } catch (err: any) {
            toast.error(err.message || 'Verification failed');
          } finally {
            setProcessing(false);
          }
        },
        modal: { ondismiss: () => { setProcessing(false); toast.info('Payment cancelled'); } },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (r: any) => { toast.error(r.error?.description || 'Payment failed'); setProcessing(false); });
      rzp.open();
    } catch (e: any) {
      toast.error(e.message || 'Payment failed');
      setProcessing(false);
    }
  };

  if (loading) return <JrLayout><div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--jr-primary))]" /></div></JrLayout>;
  if (!course) return <JrLayout><div className="py-20 text-center">Course not found.</div></JrLayout>;

  if (done) {
    const isFreeEnroll = Number(course.price ?? 0) === 0;
    return (
      <JrLayout>
        <div className="max-w-md mx-auto py-16 px-4">
          <div className="jr-card p-8 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2">{isFreeEnroll ? 'Enrollment Submitted! 📝' : 'Payment Successful! 🎉'}</h2>
            <p className="text-[hsl(var(--jr-muted))] mb-6">
              Your enrollment in <strong>{course.title}</strong> is <span className="text-yellow-600 font-bold">pending admin approval</span>. You'll get access once approved.
            </p>
            <div className="flex flex-col gap-2">
              <button className="jr-btn w-full justify-center" onClick={() => nav(`/jr/my-courses`)}>My Courses</button>
              <button className="jr-btn jr-btn-secondary w-full justify-center" onClick={() => nav('/jr/courses')}>Browse More</button>
            </div>
          </div>
        </div>
      </JrLayout>
    );
  }

  const price = Number(course.price ?? 0);
  const isFree = price === 0;

  if (isFree) {
    // Free course — auto-enroll without gateway
    return (
      <JrLayout>
        <div className="max-w-md mx-auto py-16 px-4">
          <div className="jr-card p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-[hsl(var(--jr-pink))] mb-3" />
            <h2 className="text-2xl font-extrabold mb-2">This course is FREE 🆓</h2>
            <p className="text-[hsl(var(--jr-muted))] mb-6">Click below to enroll instantly.</p>
            <button
              disabled={processing}
              onClick={async () => {
                setProcessing(true);
                const eid = await ensureEnrollment(true);
                if (eid) { setDone(true); }
                setProcessing(false);
              }}
              className="jr-btn w-full justify-center"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enroll for Free'}
            </button>
          </div>
        </div>
      </JrLayout>
    );
  }

  return (
    <JrLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => nav(`/jr/courses/${courseId}`)} className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--jr-primary))] mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Course
        </button>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Methods */}
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold">Complete Payment 💳</h1>
            <p className="text-[hsl(var(--jr-muted))]">Pick a payment method — sab kuch secure aur fast hai.</p>

            <div className="space-y-3">
              {[
                { id: 'razorpay', icon: CreditCard, label: 'Card / Net Banking', desc: 'Visa, Mastercard, RuPay, Net Banking' },
                { id: 'upi', icon: Smartphone, label: 'UPI', desc: 'PhonePe, GPay, Paytm, BHIM' },
                { id: 'wallet', icon: Wallet, label: 'Wallets', desc: 'Paytm, Mobikwik, Freecharge & more' },
                ...(isOrangePgUatEnabled ? [{ id: 'orange_pg', icon: CreditCard, label: 'Orange PG (UAT)', desc: 'ICICI Bank test gateway · INR only' }] : []),
              ].map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition ${active ? 'border-[hsl(var(--jr-primary))] bg-[hsl(var(--jr-primary)/0.06)]' : 'border-[hsl(var(--jr-border))] hover:border-[hsl(var(--jr-primary)/0.5)]'}`}>
                    <div className="w-12 h-12 rounded-full bg-[hsl(var(--jr-primary)/0.15)] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[hsl(var(--jr-primary))]" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{m.label}</div>
                      <div className="text-xs text-[hsl(var(--jr-muted))]">{m.desc}</div>
                    </div>
                    {active && <CheckCircle className="w-5 h-5 text-[hsl(var(--jr-primary))]" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs text-[hsl(var(--jr-muted))]">
              <Shield className="w-4 h-4" /> {method === 'orange_pg' ? 'ICICI Orange PG UAT' : 'Secured by Razorpay'}
            </div>
          </div>

          {/* Summary */}
          <div className="jr-card p-5 h-fit md:sticky md:top-24">
            <h2 className="font-extrabold mb-4">Order Summary</h2>
            <div className="flex gap-3 mb-4">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="w-20 h-20 rounded-xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[hsl(var(--jr-primary)/0.2)] to-[hsl(var(--jr-pink)/0.2)] flex items-center justify-center text-3xl">📘</div>
              )}
              <div>
                <div className="font-bold">{course.title}</div>
                <div className="text-xs text-[hsl(var(--jr-muted))] capitalize">{course.difficulty ?? 'beginner'}</div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[hsl(var(--jr-muted))]">Course Price</span><span>₹{price.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-lg font-extrabold pt-2 border-t"><span>Total</span><span>₹{price.toLocaleString('en-IN')}</span></div>
            </div>

            <button onClick={pay} disabled={processing} className="jr-btn w-full justify-center mt-5">
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : `Pay ₹${price.toLocaleString('en-IN')}`}
            </button>
            <p className="text-[10px] text-center text-[hsl(var(--jr-muted))] mt-3">By paying you agree to our Terms & Privacy Policy.</p>
          </div>
        </div>
      </div>
    </JrLayout>
  );
}
