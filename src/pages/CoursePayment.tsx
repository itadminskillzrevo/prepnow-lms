import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCouponValidation } from '@/hooks/useCouponValidation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ArrowLeft, CreditCard, Smartphone, Wallet, CheckCircle,
  Loader2, Shield, DollarSign, IndianRupee, TicketPercent, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { isOrangePgUatEnabled, startOrangePgPayment } from '@/lib/orangePg';

type Currency = 'INR' | 'USD';
const FALLBACK_EXCHANGE_RATE = 83;

// Load Razorpay script dynamically
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const CoursePayment: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [paymentMethod, setPaymentMethod] = useState<string>('razorpay');
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [currency, setCurrency] = useState<Currency>('INR');
  const [couponCode, setCouponCode] = useState('');

  const { validateAndApply, removeCoupon, appliedCoupon, isValidating } = useCouponValidation();

  const { data: liveRate } = useQuery({
    queryKey: ['exchange-rate-usd-inr'],
    queryFn: async () => {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('Failed to fetch rate');
      const json = await res.json();
      return json.rates?.INR as number;
    },
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const exchangeRate = liveRate || FALLBACK_EXCHANGE_RATE;
  const enrollmentId = location.state?.enrollmentId;
  const batchId = location.state?.batchId;

  const formatPrice = (priceINR: number): string => {
    if (currency === 'USD') return `$${Math.round(priceINR / exchangeRate).toLocaleString('en-US')}`;
    return `₹${Math.round(priceINR).toLocaleString('en-IN')}`;
  };

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*').eq('id', courseId).single();
      return data;
    },
    enabled: !!courseId,
  });

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return null;
      const { data } = await supabase.from('enrollments').select('*').eq('id', enrollmentId).single();
      return data;
    },
    enabled: !!enrollmentId,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-payment', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('full_name, email, phone').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const coursePrice = course?.price || 0;
  const finalPrice = appliedCoupon ? appliedCoupon.finalPrice : coursePrice;

  const handleApplyCoupon = async () => {
    if (!courseId || !user) return;
    await validateAndApply(couponCode, courseId, coursePrice, user.id);
  };

  const handleRazorpayPayment = async () => {
    if (!enrollmentId || !course || !user) {
      toast.error('Invalid enrollment data');
      return;
    }

    setIsProcessing(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load Razorpay. Please check your internet connection.');
        setIsProcessing(false);
        return;
      }

      // Create order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: finalPrice,
          currency: 'INR',
          courseId,
          enrollmentId,
        },
      });

      if (orderError || !orderData?.orderId) {
        throw new Error(orderData?.error || 'Failed to create payment order');
      }

      const options = {
        key: orderData.key,
        amount: Math.round(finalPrice * 100),
        currency: 'INR',
        name: 'SkillzRevo LMS',
        description: `Enrollment: ${course.title}`,
        order_id: orderData.orderId,
        prefill: {
          name: userProfile?.full_name || '',
          email: userProfile?.email || user.email || '',
          contact: userProfile?.phone || '',
        },
        theme: {
          color: '#6366f1',
        },
        handler: async (response: any) => {
          try {
            // Verify payment via edge function
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                enrollmentId,
                batchId,
                userId: user.id,
                finalPrice,
                couponId: appliedCoupon?.id || null,
                discountAmount: appliedCoupon?.discountAmount || 0,
                coursePrice,
              },
            });

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyData?.error || 'Payment verification failed');
            }

            queryClient.invalidateQueries({ queryKey: ['enrollment'] });
            setPaymentComplete(true);
            toast.success('Payment successful!');
          } catch (err: any) {
            toast.error(err.message || 'Payment verification failed');
          }
          setIsProcessing(false);
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast.info('Payment cancelled');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast.error(response.error?.description || 'Payment failed');
        setIsProcessing(false);
      });
      rzp.open();
    } catch (error: any) {
      toast.error(error.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleUpiPayment = async () => {
    if (!upiId) {
      toast.error('Please enter your UPI ID');
      return;
    }
    // For UPI, also use Razorpay with method prefill
    await handleRazorpayPayment();
  };

  const handlePayment = async () => {
    if (paymentMethod === 'orange_pg') {
      if (!enrollmentId || !courseId || appliedCoupon) {
        toast.error(appliedCoupon
          ? 'Coupons are not supported by the Orange PG UAT setup yet.'
          : 'Invalid enrollment data');
        return;
      }
      if (currency !== 'INR') {
        toast.error('Orange PG UAT currently supports INR only.');
        return;
      }
      setIsProcessing(true);
      try {
        await startOrangePgPayment('main', enrollmentId);
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Orange PG initiation failed');
        setIsProcessing(false);
      }
      return;
    }
    if (paymentMethod === 'upi' && !upiId) {
      toast.error('Please enter your UPI ID');
      return;
    }
    await handleRazorpayPayment();
  };

  if (!user) {
    navigate('/auth', { state: { from: { pathname: `/courses/${courseId}` } } });
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground">
                Your payment of <span className="font-semibold">{formatPrice(finalPrice)}</span> has been received.
              </p>
              {appliedCoupon && (
                <p className="text-sm text-green-600 mt-1">You saved {formatPrice(appliedCoupon.discountAmount)} with coupon {appliedCoupon.code}!</p>
              )}
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                <strong>Admin Approval Pending:</strong> Your enrollment is awaiting admin approval.
                You will be notified once your access is granted.
              </p>
            </div>
            <div className="pt-4 space-y-3">
              <Button className="w-full" onClick={() => navigate('/my-courses')}>Go to My Courses</Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/courses')}>Browse More Courses</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/courses/${courseId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="ml-4 font-medium">Complete Payment</span>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Select Payment Method</h1>
              <p className="text-muted-foreground">Choose your preferred payment option</p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <Label className="font-medium">Currency</Label>
              <ToggleGroup type="single" value={currency} onValueChange={(val) => val && setCurrency(val as Currency)}>
                <ToggleGroupItem value="USD" className="gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  <DollarSign className="h-4 w-4" /> USD
                </ToggleGroupItem>
                <ToggleGroupItem value="INR" className="gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  <IndianRupee className="h-4 w-4" /> INR
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
              <div>
                <RadioGroupItem value="razorpay" id="razorpay" className="peer sr-only" />
                <Label htmlFor="razorpay" className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><CreditCard className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1"><p className="font-medium">Razorpay</p><p className="text-sm text-muted-foreground">Cards, UPI, Net Banking, Wallets & more</p></div>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="upi" id="upi" className="peer sr-only" />
                <Label htmlFor="upi" className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><Smartphone className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1"><p className="font-medium">UPI</p><p className="text-sm text-muted-foreground">Pay using any UPI app via Razorpay</p></div>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="paypal" id="paypal" className="peer sr-only" />
                <Label htmlFor="paypal" className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><Wallet className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1"><p className="font-medium">PayPal</p><p className="text-sm text-muted-foreground">Pay securely with PayPal</p></div>
                </Label>
              </div>
              {isOrangePgUatEnabled && (
                <div>
                  <RadioGroupItem value="orange_pg" id="orange-pg" className="peer sr-only" />
                  <Label htmlFor="orange-pg" className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><CreditCard className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1"><p className="font-medium">Orange PG (UAT)</p><p className="text-sm text-muted-foreground">ICICI Bank test gateway · INR only · coupon unavailable</p></div>
                  </Label>
                </div>
              )}
            </RadioGroup>

            {paymentMethod === 'upi' && (
              <div className="space-y-2">
                <Label htmlFor="upi-id">Enter UPI ID (optional - you can also enter in Razorpay popup)</Label>
                <Input id="upi-id" placeholder="yourname@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" /><span>Your payment information is secure and encrypted</span>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-20 h-20 object-cover rounded-lg" />
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center"><CreditCard className="h-8 w-8 text-muted-foreground" /></div>
                  )}
                  <div>
                    <h3 className="font-medium">{course.title}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{course.difficulty_level}</p>
                  </div>
                </div>

                {/* Coupon Section */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <TicketPercent className="h-4 w-4 text-primary" /> Apply Coupon
                  </div>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                      <div>
                        <span className="font-mono font-bold text-green-700 dark:text-green-300">{appliedCoupon.code}</span>
                        <span className="text-sm text-green-600 dark:text-green-400 ml-2">
                          -{appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : formatPrice(appliedCoupon.discountAmount)}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeCoupon}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input placeholder="Enter coupon code" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} className="flex-1" />
                      <Button variant="outline" onClick={handleApplyCoupon} disabled={isValidating}>
                        {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Course Price</span>
                    <span>{formatPrice(coursePrice)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon Discount</span>
                      <span>-{formatPrice(appliedCoupon.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(finalPrice)}</span>
                  </div>
                  {currency === 'USD' && <p className="text-xs text-muted-foreground">*Approximate conversion</p>}
                </div>

                <Button className="w-full" size="lg" onClick={handlePayment} disabled={isProcessing}>
                  {isProcessing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>) : `Pay ${formatPrice(finalPrice)}`}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By completing this purchase, you agree to our Terms of Service and Privacy Policy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CoursePayment;
