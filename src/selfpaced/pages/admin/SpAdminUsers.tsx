import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Upload, Loader2, X, Pencil, KeyRound, Trash2 } from 'lucide-react';

type Profile = { id: string; user_id: string; email: string; full_name: string | null; phone: string | null; created_at: string; role?: string };

const SpAdminUsers: React.FC = () => {
  const [rows, setRows] = useState<Profile[]>([]);
  const [q, setQ] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [resetting, setResetting] = useState<Profile | null>(null);

  const load = async () => {
    const { data: profs } = await supabase
      .from('selfpaced_profiles')
      .select('id,user_id,email,full_name,phone,created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    const ids = (profs ?? []).map((p) => p.user_id);
    let roleMap: Record<string, string> = {};
    if (ids.length) {
      const { data: roles } = await supabase.from('user_roles').select('user_id,role').in('user_id', ids);
      (roles ?? []).forEach((r: any) => {
        if (!roleMap[r.user_id] || r.role === 'sp_admin') roleMap[r.user_id] = r.role;
      });
    }
    setRows((profs ?? []).map((p) => ({ ...p, role: roleMap[p.user_id] || 'sp_student' })));
  };
  useEffect(() => { void load(); }, []);

  const filtered = rows.filter(
    (r) => !q || (r.full_name || '').toLowerCase().includes(q.toLowerCase()) || (r.email || '').toLowerCase().includes(q.toLowerCase())
  );

  const del = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    const { error } = await supabase.functions.invoke('delete-user', { body: { userId } });
    if (error) toast.error(error.message);
    else { toast.success('User deleted'); load(); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Users</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sp-btn sp-btn-outline" onClick={() => setShowBulk(true)}><Upload size={14} /> Bulk import</button>
          <button className="sp-btn" onClick={() => setShowAdd(true)}><UserPlus size={14} /> Add user</button>
        </div>
      </div>

      <input
        className="sp-input"
        placeholder="Search name or email..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ maxWidth: 320, marginBottom: 12 }}
      />

      <div className="sp-card" style={{ padding: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid hsl(var(--sp-border))' }}>
              <th style={{ padding: '.5rem' }}>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Joined</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--sp-border))' }}>
                <td style={{ padding: '.5rem' }}>{r.full_name || '—'}</td>
                <td>{r.email}</td>
                <td>
                  <span
                    style={{
                      padding: '.15rem .5rem',
                      borderRadius: 999,
                      fontSize: '.75rem',
                      background: r.role === 'sp_admin' ? 'hsl(var(--sp-primary) / .15)' : 'hsl(var(--sp-border))',
                      color: r.role === 'sp_admin' ? 'hsl(var(--sp-primary))' : 'inherit',
                    }}
                  >
                    {r.role}
                  </span>
                </td>
                <td>{r.phone || '—'}</td>
                <td>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <div style={{ display: 'inline-flex', gap: 4 }}>
                    <button className="sp-btn sp-btn-ghost" title="Edit profile" onClick={() => setEditing(r)}><Pencil size={14} /></button>
                    <button className="sp-btn sp-btn-ghost" title="Reset password" onClick={() => setResetting(r)}><KeyRound size={14} /></button>
                    <button className="sp-btn sp-btn-ghost" style={{ color: '#dc2626' }} title="Delete" onClick={() => del(r.user_id, r.email)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--sp-muted))' }}>No users yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddUserDialog onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {showBulk && <BulkImportDialog onClose={() => setShowBulk(false)} onSaved={() => { setShowBulk(false); load(); }} />}
      {editing && <EditUserDialog user={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {resetting && <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 16 }}>
    <div className="sp-card" style={{ width: '100%', maxWidth: wide ? 640 : 460, background: 'hsl(var(--sp-surface))', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button className="sp-btn sp-btn-ghost" onClick={onClose}><X size={16} /></button>
      </div>
      {children}
    </div>
  </div>
);

const AddUserDialog: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'sp_student' | 'sp_admin'>('sp_student');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email || !password) { toast.error('Email and password required'); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('create-user', { body: { email, password, fullName, role } });
    setBusy(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || 'Failed'); return; }
    toast.success('User created');
    onSaved();
  };
  return (
    <Modal title="Add user" onClose={onClose}>
      <div style={{ display: 'grid', gap: '.6rem' }}>
        <input className="sp-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input className="sp-input" type="email" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="sp-input" type="text" placeholder="Password * (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <select className="sp-input" value={role} onChange={(e) => setRole(e.target.value as any)}>
          <option value="sp_student">Self-paced Student</option>
          <option value="sp_admin">Self-paced Admin</option>
        </select>
        <button className="sp-btn" disabled={busy} onClick={submit}>
          {busy ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : 'Create user'}
        </button>
      </div>
    </Modal>
  );
};

const BulkImportDialog: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [text, setText] = useState('');
  const [role, setRole] = useState<'sp_student' | 'sp_admin'>('sp_student');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const submit = async () => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error('Paste at least one row'); return; }
    const users = lines.map((line) => {
      // CSV: email,password,fullName
      const [email, password, ...rest] = line.split(',').map((s) => s.trim());
      return { email, password, fullName: rest.join(',') || '', role };
    });
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('bulk-import-users', { body: { users } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setResults((data as any)?.results ?? []);
    const s = (data as any)?.summary;
    toast.success(`Import done — ${s?.success ?? 0} ok, ${s?.failed ?? 0} failed`);
    if ((s?.success ?? 0) > 0) onSaved();
  };

  return (
    <Modal title="Bulk import users" onClose={onClose} wide>
      <p style={{ margin: '0 0 .5rem', color: 'hsl(var(--sp-muted))', fontSize: '.85rem' }}>
        Paste one user per line as CSV: <code>email,password,fullName</code>
      </p>
      <select className="sp-input" value={role} onChange={(e) => setRole(e.target.value as any)} style={{ marginBottom: 8 }}>
        <option value="sp_student">Assign role: Self-paced Student</option>
        <option value="sp_admin">Assign role: Self-paced Admin</option>
      </select>
      <textarea
        className="sp-input"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'jane@example.com,Passw0rd!,Jane Doe\njohn@example.com,Hunter22,John Roe'}
        style={{ fontFamily: 'monospace', fontSize: '.85rem' }}
      />
      <button className="sp-btn" disabled={busy} onClick={submit} style={{ marginTop: 8, width: '100%' }}>
        {busy ? <><Loader2 size={14} className="animate-spin" /> Importing...</> : 'Import users'}
      </button>
      {results && (
        <div style={{ marginTop: 12, maxHeight: 220, overflowY: 'auto', fontSize: '.8rem' }}>
          {results.map((r, i) => (
            <div key={i} style={{ padding: '.3rem 0', borderTop: '1px solid hsl(var(--sp-border))', color: r.success ? '#059669' : '#dc2626' }}>
              {r.success ? '✓' : '✗'} {r.email} {r.error ? `— ${r.error}` : ''}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

const EditUserDialog: React.FC<{ user: Profile; onClose: () => void; onSaved: () => void }> = ({ user, onClose, onSaved }) => {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.from('selfpaced_profiles').update({ full_name: fullName, phone }).eq('user_id', user.user_id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Profile updated');
    onSaved();
  };
  return (
    <Modal title={`Edit ${user.email}`} onClose={onClose}>
      <div style={{ display: 'grid', gap: '.6rem' }}>
        <input className="sp-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input className="sp-input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="sp-input" value={user.email} disabled />
        <button className="sp-btn" disabled={busy} onClick={submit}>
          {busy ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save changes'}
        </button>
      </div>
    </Modal>
  );
};

const ResetPasswordDialog: React.FC<{ user: Profile; onClose: () => void }> = ({ user, onClose }) => {
  const [mode, setMode] = useState<'set' | 'email'>('set');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      if (mode === 'set') {
        if (pwd.length < 6) { toast.error('Password must be at least 6 characters'); setBusy(false); return; }
        const { data, error } = await supabase.functions.invoke('change-user-password', { body: { userId: user.user_id, newPassword: pwd } });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        toast.success('Password updated');
      } else {
        const { data, error } = await supabase.functions.invoke('reset-user-password', { body: { email: user.email } });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        toast.success('Reset email sent');
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally { setBusy(false); }
  };
  return (
    <Modal title={`Reset password — ${user.email}`} onClose={onClose}>
      <div style={{ display: 'grid', gap: '.6rem' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`sp-btn ${mode === 'set' ? '' : 'sp-btn-outline'}`} style={{ flex: 1 }} onClick={() => setMode('set')}>Set new password</button>
          <button className={`sp-btn ${mode === 'email' ? '' : 'sp-btn-outline'}`} style={{ flex: 1 }} onClick={() => setMode('email')}>Send reset email</button>
        </div>
        {mode === 'set'
          ? <input className="sp-input" type="text" placeholder="New password (min 6 chars)" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          : <p style={{ margin: 0, fontSize: '.85rem', color: 'hsl(var(--sp-muted))' }}>A reset email will be sent to {user.email}.</p>}
        <button className="sp-btn" disabled={busy} onClick={submit}>
          {busy ? <><Loader2 size={14} className="animate-spin" /> Working...</> : (mode === 'set' ? 'Update password' : 'Send email')}
        </button>
      </div>
    </Modal>
  );
};


export default SpAdminUsers;
