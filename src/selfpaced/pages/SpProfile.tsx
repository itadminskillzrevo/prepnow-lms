import React, { useEffect, useState } from 'react';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SpProfile: React.FC = () => {
  const { user, profile, refresh } = useSpAuth();
  const [f, setF] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [pwd, setPwd] = useState({ next: '', confirm: '' });
  const [pwdBusy, setPwdBusy] = useState(false);
  useEffect(() => { setF(profile || {}); }, [profile?.id]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from('selfpaced_profiles').update({
      full_name: f.full_name, phone: f.phone, address: f.address, city: f.city, state: f.state, pincode: f.pincode,
    }).eq('user_id', user.id);
    if (error) toast.error(error.message); else { toast.success('Profile updated'); refresh(); }
    setBusy(false);
  };

  const submitPwd = async () => {
    if (pwd.next.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (pwd.next !== pwd.confirm) { toast.error('Passwords do not match'); return; }
    setPwdBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-user-password', {
        body: { userId: user?.id, newPassword: pwd.next, isSelfChange: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Password updated successfully');
      setShowPwd(false); setPwd({ next: '', confirm: '' });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to change password');
    } finally { setPwdBusy(false); }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem' }}>
      <h1>My Profile</h1>
      <div className="sp-card" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: '.8rem', color: 'hsl(var(--sp-muted))' }}>Email</label>
          <input className="sp-input" value={user?.email || ''} disabled />
        </div>
        <div><label style={{ fontSize: '.8rem', color: 'hsl(var(--sp-muted))' }}>Full name</label>
          <input className="sp-input" value={f.full_name || ''} onChange={e => setF({ ...f, full_name: e.target.value })} /></div>
        <div><label style={{ fontSize: '.8rem', color: 'hsl(var(--sp-muted))' }}>Phone</label>
          <input className="sp-input" value={f.phone || ''} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
        <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '.8rem', color: 'hsl(var(--sp-muted))' }}>Address</label>
          <input className="sp-input" value={f.address || ''} onChange={e => setF({ ...f, address: e.target.value })} /></div>
        <div><label style={{ fontSize: '.8rem', color: 'hsl(var(--sp-muted))' }}>City</label>
          <input className="sp-input" value={f.city || ''} onChange={e => setF({ ...f, city: e.target.value })} /></div>
        <div><label style={{ fontSize: '.8rem', color: 'hsl(var(--sp-muted))' }}>State</label>
          <input className="sp-input" value={f.state || ''} onChange={e => setF({ ...f, state: e.target.value })} /></div>
        <div><label style={{ fontSize: '.8rem', color: 'hsl(var(--sp-muted))' }}>Pincode</label>
          <input className="sp-input" value={f.pincode || ''} onChange={e => setF({ ...f, pincode: e.target.value })} /></div>
        <div style={{ gridColumn: '1/-1', display: 'flex', gap: '.5rem' }}>
          <button className="sp-btn" onClick={save} disabled={busy}>Save changes</button>
          <button className="sp-btn sp-btn-outline" onClick={() => setShowPwd(true)}>Change password</button>
        </div>
      </div>

      {showPwd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 16 }} onClick={() => setShowPwd(false)}>
          <div className="sp-card" style={{ width: '100%', maxWidth: 420, padding: '1.25rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Change password</h3>
            <div style={{ display: 'grid', gap: '.6rem' }}>
              <input className="sp-input" type="password" placeholder="New password (min 6)" value={pwd.next} onChange={e => setPwd({ ...pwd, next: e.target.value })} />
              <input className="sp-input" type="password" placeholder="Confirm new password" value={pwd.confirm} onChange={e => setPwd({ ...pwd, confirm: e.target.value })} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="sp-btn sp-btn-outline" onClick={() => setShowPwd(false)}>Cancel</button>
                <button className="sp-btn" onClick={submitPwd} disabled={pwdBusy}>{pwdBusy ? 'Updating…' : 'Update password'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpProfile;
