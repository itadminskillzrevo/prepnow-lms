import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { JrLayout } from '@/jr/components/JrLayout';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function JrAdminAuth() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { signIn, signOut, user, role, loading: authLoading } = useJrAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (authLoading || !user) return;
    if (role === 'jr_admin') {
      nav('/jr/admin', { replace: true });
    } else if (role === 'jr_student') {
      toast.error('This is the admin login. Redirecting to student dashboard.');
      nav('/jr/dashboard', { replace: true });
    } else if (role) {
      toast.error('This account does not have Jr admin access.');
      void signOut();
    }
  }, [user, role, authLoading, nav, signOut]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(form.email, form.password);
      if (error) throw error;
      toast.success('Welcome back, Admin!');
      // Redirect handled in effect once role hydrates
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <JrLayout>
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="jr-card p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-[hsl(var(--jr-secondary))] to-[hsl(var(--jr-primary))] flex items-center justify-center text-white shadow-lg mb-3">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-extrabold mb-1">Admin Login</h1>
            <p className="text-sm text-[hsl(var(--jr-muted))]">SkillzRevo Junior — Admin Panel</p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--jr-muted))]" />
              <input type="email" required placeholder="Admin email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="jr-input !pl-12" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--jr-muted))]" />
              <input type="password" required placeholder="Password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="jr-input !pl-12" />
            </div>
            <button disabled={loading} className="jr-btn w-full !py-3.5 mt-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login as Admin 🔐'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t-2 border-dashed border-[hsl(var(--jr-border))] text-center space-y-2">
            <Link to="/jr/auth" className="block text-xs text-[hsl(var(--jr-muted))] hover:underline">
              Are you a student? Login here
            </Link>
            <Link to="/jr" className="block text-xs text-[hsl(var(--jr-muted))] hover:underline">
              ← Back to SkillzRevo Junior
            </Link>
          </div>
        </div>
      </div>
    </JrLayout>
  );
}
