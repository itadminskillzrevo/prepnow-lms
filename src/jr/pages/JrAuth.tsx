import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { JrLayout } from '@/jr/components/JrLayout';
import { Sparkles, Mail, Lock, User, School, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function JrAuth() {
  const [params] = useSearchParams();
  const initialMode = params.get('mode') === 'signup' ? 'signup' : 'login';
  const errorParam = params.get('error');
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', school_name: '',
  });
  const { signIn, signUpStudent, signOut, user, role, loading: authLoading } = useJrAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (authLoading || !user) return;
    if (role === 'jr_admin') nav('/jr/admin', { replace: true });
    else if (role === 'jr_student') nav('/jr/dashboard', { replace: true });
    else if (role) {
      toast.error('This account is not a Prepnow Jr account. Please use the main login.');
      void signOut();
    }
  }, [user, role, authLoading, nav, signOut]);

  useEffect(() => {
    if (errorParam === 'not_jr') {
      toast.error('This account is not a Prepnow Jr account. Please use the main login.');
    }
  }, [errorParam]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUpStudent(form);
        if (error) throw error;
        toast.success('Welcome! Please check your email to confirm your account. 🎉');
        setMode('login');
      } else {
        const { error } = await signIn(form.email, form.password);
        if (error) throw error;
        toast.success('Yay! Logged in 🎉');
        // Redirect handled in effect once role hydrates
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <JrLayout>
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="jr-card p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-[hsl(var(--jr-primary))] to-[hsl(var(--jr-pink))] flex items-center justify-center text-white shadow-lg jr-wobble mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-extrabold mb-1">
              {mode === 'signup' ? 'Join the fun! 🎉' : 'Welcome back! 👋'}
            </h1>
            <p className="text-sm text-[hsl(var(--jr-muted))]">
              {mode === 'signup' ? 'Create your Prepnow Jr account' : 'Login to continue learning'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <Field icon={User} placeholder="Your full name" value={form.full_name}
                  onChange={(v) => setForm({ ...form, full_name: v })} required />
                <Field icon={School} placeholder="School name (optional)" value={form.school_name}
                  onChange={(v) => setForm({ ...form, school_name: v })} />
              </>
            )}
            <Field icon={Mail} type="email" placeholder="Email" value={form.email}
              onChange={(v) => setForm({ ...form, email: v })} required />
            <Field icon={Lock} type="password" placeholder="Password" value={form.password}
              onChange={(v) => setForm({ ...form, password: v })} required />

            <button disabled={loading} className="jr-btn w-full !py-3.5 mt-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'signup' ? 'Create Account ✨' : 'Login 🚀')}
            </button>
          </form>

          <div className="mt-5 text-center text-sm">
            {mode === 'signup' ? (
              <>Already have an account?{' '}
                <button onClick={() => setMode('login')} className="font-bold text-[hsl(var(--jr-primary))] hover:underline">Login</button>
              </>
            ) : (
              <>New here?{' '}
                <button onClick={() => setMode('signup')} className="font-bold text-[hsl(var(--jr-primary))] hover:underline">Create account</button>
              </>
            )}
          </div>

          <div className="mt-6 pt-5 border-t-2 border-dashed border-[hsl(var(--jr-border))] text-center">
            <Link to="/" className="text-xs text-[hsl(var(--jr-muted))] hover:underline">
              ← Back to main site
            </Link>
          </div>
        </div>
      </div>
    </JrLayout>
  );
}

function Field({ icon: Icon, ...props }: any) {
  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--jr-muted))]" />
      <input {...props} onChange={(e) => props.onChange(e.target.value)} className="jr-input !pl-12" />
    </div>
  );
}
