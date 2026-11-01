import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SpAuth: React.FC = () => {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup'>(params.get('mode') === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, refresh } = useSpAuth();
  const nav = useNavigate();
  const redirectParam = params.get('redirect');

  const resolveDest = async (): Promise<string> => {
    if (redirectParam) return redirectParam;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '/selfpaced/dashboard';
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = (roleRows ?? []).map((r: any) => r.role as string);
    if (roles.some(r => ['sp_admin', 'admin', 'superadmin'].includes(r))) return '/selfpaced/admin';
    return '/selfpaced/dashboard';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    if (mode === 'signup') {
      const { error } = await signUp({ email, password, full_name: fullName, phone });
      if (error) { toast.error(error.message); setBusy(false); return; }
      toast.success('Account created! Check your email if confirmation is required.');
      await refresh();
      nav(await resolveDest(), { replace: true });
    } else {
      const { error } = await signIn(email, password);
      if (error) { toast.error(error.message); setBusy(false); return; }
      toast.success('Welcome back!');
      await refresh();
      nav(await resolveDest(), { replace: true });
    }
    setBusy(false);
  };

  const forgot = async () => {
    if (!email) { toast.error('Enter your email first'); return; }
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message); else toast.success('Password reset email sent');
  };

  return (
    <div className="sr-auth-scope">
      <style>{`
        .sr-auth-scope {
          --sr-ink: #111827;
          --sr-muted: #6B7280;
          --sr-canvas: #F4F6FB;
          --sr-border: #ECEEF3;
          --sr-primary: #4F46E5;
          --sr-primary-dark: #4338CA;
          --sr-primary-tint: #EEF0FF;
          --sr-field-bg: #E9F0FE;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          min-height: calc(100vh - 60px);
          display: grid;
          place-items: center;
          padding: 2.5rem 1rem;
          background: var(--sr-canvas);
        }
        .sr-auth-scope * { box-sizing: border-box; }
        .sr-card {
          width: 100%;
          max-width: 400px;
          background: #FFFFFF;
          border: 1px solid var(--sr-border);
          border-radius: 22px;
          padding: 2.25rem 2rem 2rem;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 16px 40px -16px rgba(16, 24, 40, 0.12);
        }
        .sr-logo-row { display: flex; justify-content: center; margin-bottom: 1.5rem; }
        .sr-logo-row img { height: 46px; object-fit: contain; }
        .sr-heading {
          font-size: 22px;
          font-weight: 700;
          color: var(--sr-ink);
          margin: 0 0 4px;
          text-align: center;
          letter-spacing: -0.01em;
        }
        .sr-subtext {
          font-size: 13.5px;
          color: var(--sr-muted);
          margin: 0 0 1.75rem;
          line-height: 1.5;
          text-align: center;
        }
        .sr-field { margin-bottom: 14px; }
        .sr-label {
          display: block;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--sr-ink);
          margin-bottom: 6px;
        }
        .sr-input-wrap { position: relative; }
        .sr-input {
          width: 100%;
          height: 46px;
          border: 1px solid transparent;
          border-radius: 12px;
          padding: 0 14px;
          font-size: 14px;
          color: var(--sr-ink);
          background: var(--sr-field-bg);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .sr-input::placeholder { color: #8B93A7; }
        .sr-input:focus {
          border-color: var(--sr-primary);
          background: #FFFFFF;
          box-shadow: 0 0 0 3px var(--sr-primary-tint);
        }
        .sr-input.sr-has-toggle { padding-right: 42px; }
        .sr-eye-btn {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 8px;
          display: grid;
          place-items: center;
          cursor: pointer;
          color: var(--sr-muted);
        }
        .sr-eye-btn:hover { background: rgba(0,0,0,0.05); color: var(--sr-ink); }
        .sr-forgot-row {
          display: flex;
          justify-content: flex-end;
          margin: -2px 0 18px;
        }
        .sr-link {
          font-size: 12.5px;
          font-weight: 500;
          color: var(--sr-primary);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          text-decoration: none;
        }
        .sr-link:hover { color: var(--sr-primary-dark); text-decoration: underline; }
        .sr-btn-primary {
          width: 100%;
          height: 48px;
          border: none;
          border-radius: 14px;
          background: var(--sr-primary);
          color: #FFFFFF;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, transform 0.05s;
        }
        .sr-btn-primary:hover:not(:disabled) { background: var(--sr-primary-dark); }
        .sr-btn-primary:active:not(:disabled) { transform: scale(0.99); }
        .sr-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
        .sr-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: sr-spin 0.7s linear infinite;
        }
        @keyframes sr-spin { to { transform: rotate(360deg); } }
        .sr-switch-row {
          text-align: center;
          font-size: 13px;
          color: var(--sr-muted);
          margin: 18px 0 0;
        }
        .sr-switch-btn {
          background: none;
          border: none;
          color: var(--sr-primary);
          font-weight: 700;
          cursor: pointer;
          padding: 0 0 0 4px;
          font-size: 13px;
        }
        .sr-switch-btn:hover { color: var(--sr-primary-dark); }
        .sr-divider {
          border: none;
          border-top: 1px solid var(--sr-border);
          margin: 20px 0 16px;
        }
        .sr-btn-outline {
          width: 100%;
          height: 46px;
          border: 1px solid var(--sr-border);
          border-radius: 14px;
          background: #FFFFFF;
          color: var(--sr-ink);
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .sr-btn-outline:hover { border-color: #D7DCE5; background: var(--sr-canvas); }
        .sr-back-link {
          display: block;
          text-align: center;
          margin-top: 14px;
          font-size: 13px;
          color: var(--sr-primary);
          text-decoration: none;
          font-weight: 500;
        }
        .sr-back-link:hover { color: var(--sr-primary-dark); }
      `}</style>

      <div className="sr-card">
        <div className="sr-logo-row">
          <img src="/logo.png" alt="SkillzRevo" />
        </div>

        <h2 className="sr-heading">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="sr-subtext">
          {mode === 'signin' ? 'Sign in to continue your learning path.' : 'Start your self-paced learning journey.'}
        </p>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <>
              <div className="sr-field">
                <label className="sr-label">Full name</label>
                <input className="sr-input" placeholder="Your name" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="sr-field">
                <label className="sr-label">Phone</label>
                <input className="sr-input" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </>
          )}

          <div className="sr-field">
            <label className="sr-label">Email</label>
            <input className="sr-input" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="sr-field">
            <label className="sr-label">Password</label>
            <div className="sr-input-wrap">
              <input
                className="sr-input sr-has-toggle"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button type="button" className="sr-eye-btn" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.5A9.9 9.9 0 0112 5c5.5 0 9 5 9 7-0.6 1.1-1.7 2.6-3.3 3.9M6.3 6.7C4.5 8 3.3 9.6 3 12c1.6 3 5.1 7 9 7 1.1 0 2.2-0.2 3.2-0.6" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>

          {mode === 'signin' && (
            <div className="sr-forgot-row">
              <button type="button" onClick={forgot} className="sr-link">Forgot password?</button>
            </div>
          )}

          <button className="sr-btn-primary" disabled={busy}>
            {busy && <span className="sr-spinner" />}
            {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="sr-switch-row">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
          <button className="sr-switch-btn" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        <hr className="sr-divider" />

        <Link to="/selfpaced/admin/login" className="sr-btn-outline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 9.5-4-1.3-7-5-7-9.5V6l7-3z" strokeLinejoin="round" /></svg>
          Login as admin
        </Link>

        <Link to="/selfpaced" className="sr-back-link">← Back to home</Link>
      </div>
    </div>
  );
};

export default SpAuth;