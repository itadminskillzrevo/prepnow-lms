import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { toast } from 'sonner';

const SpAdminAuth: React.FC = () => {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { refresh } = useSpAuth();
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) { toast.error(error?.message || 'Login failed'); setBusy(false); return; }
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id);
    const roleList = (roles ?? []).map((r: any) => r.role);
    if (roleList.some((r: string) => ['sp_admin', 'admin', 'superadmin'].includes(r))) {
      await refresh();
      toast.success('Welcome, admin');
      nav('/selfpaced/admin', { replace: true });
    } else {
      await supabase.auth.signOut({ scope: 'local' });
      toast.error('You are not an admin');
    }
    setBusy(false);
  };

  return (
    <div className="sp-scope" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem 1rem' }}>
      <div className="sp-card" style={{ padding: '2rem', width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <img src="/logo.png" alt="SkillzRevo" style={{ height: 48, objectFit: 'contain' }} />
        </div>
        <h2 style={{ margin: '0 0 1rem', textAlign: 'center' }}>Admin Login</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <input className="sp-input" type="email" placeholder="Admin email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="sp-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="sp-btn" disabled={busy}>{busy ? 'Please wait...' : 'Sign in as admin'}</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.85rem' }}>
          <a href="/selfpaced/auth" style={{ color: 'hsl(var(--sp-primary))' }}>← Back to user login</a>
        </p>
      </div>
    </div>
  );
};

export default SpAdminAuth;
