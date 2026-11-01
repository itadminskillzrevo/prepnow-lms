import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, X, Loader2, Users, Download, KeyRound, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';

const GRADES = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

type Row = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  grade: string | null;
  school_name: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  city: string | null;
  state: string | null;
  date_of_birth: string | null;
  created_at?: string;
};

const empty = {
  email: '', password: '', full_name: '', grade: '', school_name: '',
  parent_name: '', parent_phone: '', parent_email: '', city: '', state: '', date_of_birth: '',
};

export default function JrAdminStudents() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState<Row | null>(null);
  const [resetMode, setResetMode] = useState<'set' | 'email'>('set');
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('jr_profiles').select('*').order('created_at', { ascending: false });
    setItems((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ ...empty }); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      email: r.email, password: '',
      full_name: r.full_name ?? '', grade: r.grade ?? '', school_name: r.school_name ?? '',
      parent_name: r.parent_name ?? '', parent_phone: r.parent_phone ?? '', parent_email: r.parent_email ?? '',
      city: r.city ?? '', state: r.state ?? '', date_of_birth: r.date_of_birth ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.email || !form.full_name) return toast.error('Name and email required');
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('jr_profiles').update({
          full_name: form.full_name, grade: form.grade || null, school_name: form.school_name || null,
          parent_name: form.parent_name || null, parent_phone: form.parent_phone || null, parent_email: form.parent_email || null,
          city: form.city || null, state: form.state || null, date_of_birth: form.date_of_birth || null,
        }).eq('id', editing.id);
        if (error) throw error;
        toast.success('Student updated');
      } else {
        if (!form.password || form.password.length < 6) {
          setSaving(false);
          return toast.error('Password must be at least 6 characters');
        }
        // Create auth user via edge function (trigger creates jr_profile + jr_student role via is_jr metadata)
        const { data: cu, error: ceErr } = await supabase.functions.invoke('create-user', {
          body: { email: form.email, password: form.password, fullName: form.full_name, role: 'jr_student' },
        });
        if (ceErr) throw ceErr;
        const newUserId = (cu as any)?.user?.id;
        if (!newUserId) throw new Error('Failed to create user');

        // Update jr_profiles with extra fields (row already created by trigger)
        const { error: pErr } = await supabase.from('jr_profiles').update({
          grade: form.grade || null, school_name: form.school_name || null,
          parent_name: form.parent_name || null, parent_phone: form.parent_phone || null, parent_email: form.parent_email || null,
          city: form.city || null, state: form.state || null, date_of_birth: form.date_of_birth || null,
        }).eq('user_id', newUserId);
        if (pErr) throw pErr;
        toast.success('Student added');
      }
      setOpen(false);
      await load();
      } catch (e: any) {
      const message = e?.context?.error?.error || e?.message || 'Failed to save';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: Row) => {
    if (!confirm(`Delete ${r.full_name || r.email}? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.functions.invoke('delete-user', { body: { userId: r.user_id } });
      if (error) throw error;
      toast.success('Student deleted');
      await load();
    } catch (e: any) {
      const message = e?.context?.error?.error || e?.message || 'Failed to delete';
      toast.error(message);
    }
  };

  const openDashboard = (r: Row) => {
    window.open(`/admin/user-dashboard/${r.user_id}`, '_blank', 'noopener,noreferrer');
  };

  const submitReset = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      if (resetMode === 'set') {
        if (!newPassword || newPassword.length < 6) {
          setResetting(false);
          return toast.error('Password must be at least 6 characters');
        }
        const { data, error } = await supabase.functions.invoke('change-user-password', {
          body: { userId: resetTarget.user_id, newPassword },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        toast.success(`Password updated for ${resetTarget.full_name || resetTarget.email}`);
      } else {
        const { data, error } = await supabase.functions.invoke('reset-user-password', {
          body: { email: resetTarget.email },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        toast.success(`Password reset email sent to ${resetTarget.email}`);
      }
      setResetTarget(null);
      setNewPassword('');
    } catch (e: any) {
      const message = e?.context?.error?.error || e?.message || 'Failed to reset password';
      toast.error(message);
    } finally {
      setResetting(false);
    }
  };

  const filtered = items.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [s.full_name, s.email, s.grade, s.school_name].some((v) => v?.toLowerCase().includes(q));
  });

  const downloadExcel = () => {
    if (items.length === 0) return toast.error('No students to export');
    const rows = items.map((s) => ({
      'Full Name': s.full_name || '',
      'Email': s.email,
      'Grade': s.grade || '',
      'School': s.school_name || '',
      'Date of Birth': s.date_of_birth || '',
      'Parent Name': s.parent_name || '',
      'Parent Phone': s.parent_phone || '',
      'Parent Email': s.parent_email || '',
      'City': s.city || '',
      'State': s.state || '',
      'Registered On': s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0]).map((k) => ({ wch: Math.max(14, k.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jr Students');
    XLSX.writeFile(wb, `jr-students-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel downloaded');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2"><Users className="w-7 h-7 text-[hsl(var(--jr-primary))]" /> Students</h1>
          <p className="text-sm text-[hsl(var(--jr-muted))] mt-1">{items.length} student{items.length !== 1 ? 's' : ''} registered</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadExcel} className="jr-btn jr-btn-secondary"><Download className="w-4 h-4" /> Download Excel</button>
          <button onClick={openAdd} className="jr-btn"><Plus className="w-4 h-4" /> Add Student</button>
        </div>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--jr-muted))]" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, grade, school..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[hsl(var(--jr-border))] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--jr-primary)/0.3)]"
        />
      </div>

      <div className="jr-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--jr-primary))]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--jr-primary)/0.08)]">
                <tr>
                  <th className="text-left p-3 font-bold">Name</th>
                  <th className="text-left p-3 font-bold">Email</th>
                  <th className="text-left p-3 font-bold">Grade</th>
                  <th className="text-left p-3 font-bold">School</th>
                  <th className="text-left p-3 font-bold">Parent</th>
                  <th className="text-right p-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-[hsl(var(--jr-border))] hover:bg-[hsl(var(--jr-primary)/0.04)]">
                    <td className="p-3 font-semibold">{s.full_name || '—'}</td>
                    <td className="p-3 text-[hsl(var(--jr-muted))]">{s.email}</td>
                    <td className="p-3">{s.grade || '—'}</td>
                    <td className="p-3">{s.school_name || '—'}</td>
                    <td className="p-3">
                      {s.parent_name || '—'}
                      {s.parent_phone && <div className="text-xs text-[hsl(var(--jr-muted))]">{s.parent_phone}</div>}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openDashboard(s)} className="p-2 rounded-lg hover:bg-[hsl(var(--jr-primary)/0.12)] text-[hsl(var(--jr-primary))]" title="Open Dashboard (new tab)">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-[hsl(var(--jr-primary)/0.12)] text-[hsl(var(--jr-primary))]" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setResetTarget(s); setResetMode('set'); setNewPassword(''); }} className="p-2 rounded-lg hover:bg-[hsl(var(--jr-primary)/0.12)] text-[hsl(var(--jr-primary))]" title="Reset Password">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(s)} className="p-2 rounded-lg hover:bg-red-50 text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center p-12 text-[hsl(var(--jr-muted))]">
                    {search ? 'No students match your search.' : 'No students yet. Click "Add Student" to get started.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[hsl(var(--jr-border))] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">{editing ? 'Edit Student' : 'Add New Student'}</h2>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-[hsl(var(--jr-primary)/0.08)]"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full Name *" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
                <Field label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} disabled={!!editing} />
              </div>
              {!editing && (
                <Field label="Password *" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} hint="At least 6 characters" />
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[hsl(var(--jr-muted))] uppercase tracking-wider">Grade</label>
                  <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[hsl(var(--jr-border))] bg-white text-sm">
                    <option value="">Select grade</option>
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <Field label="School Name" value={form.school_name} onChange={(v) => setForm({ ...form, school_name: v })} />
              </div>
              <Field label="Date of Birth" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} />

              <div className="pt-2 border-t border-[hsl(var(--jr-border))]">
                <h3 className="font-bold text-sm mb-3 text-[hsl(var(--jr-primary))]">👨‍👩‍👧 Parent / Guardian</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Parent Name" value={form.parent_name} onChange={(v) => setForm({ ...form, parent_name: v })} />
                  <Field label="Parent Phone" value={form.parent_phone} onChange={(v) => setForm({ ...form, parent_phone: v })} />
                </div>
                <div className="mt-4">
                  <Field label="Parent Email" type="email" value={form.parent_email} onChange={(v) => setForm({ ...form, parent_email: v })} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-[hsl(var(--jr-border))]">
                <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-[hsl(var(--jr-border))] px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl font-semibold hover:bg-[hsl(var(--jr-primary)/0.08)]">Cancel</button>
              <button onClick={save} disabled={saving} className="jr-btn">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Update' : 'Create'} Student
              </button>
            </div>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !resetting && setResetTarget(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[hsl(var(--jr-border))] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold flex items-center gap-2"><KeyRound className="w-5 h-5 text-[hsl(var(--jr-primary))]" /> Reset Password</h2>
              <button onClick={() => !resetting && setResetTarget(null)} className="p-2 rounded-lg hover:bg-[hsl(var(--jr-primary)/0.08)]"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[hsl(var(--jr-muted))]">
                For <span className="font-semibold text-foreground">{resetTarget.full_name || resetTarget.email}</span>
              </p>
              <div className="flex gap-2">
                <button onClick={() => setResetMode('set')} className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold border ${resetMode === 'set' ? 'bg-[hsl(var(--jr-primary))] text-white border-[hsl(var(--jr-primary))]' : 'border-[hsl(var(--jr-border))]'}`}>Set New Password</button>
                <button onClick={() => setResetMode('email')} className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold border ${resetMode === 'email' ? 'bg-[hsl(var(--jr-primary))] text-white border-[hsl(var(--jr-primary))]' : 'border-[hsl(var(--jr-border))]'}`}>Send Reset Email</button>
              </div>
              {resetMode === 'set' ? (
                <Field label="New Password *" type="password" value={newPassword} onChange={setNewPassword} hint="At least 6 characters" />
              ) : (
                <p className="text-sm text-[hsl(var(--jr-muted))]">A password reset email will be sent to <span className="font-semibold text-foreground">{resetTarget.email}</span>.</p>
              )}
            </div>
            <div className="border-t border-[hsl(var(--jr-border))] px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setResetTarget(null)} disabled={resetting} className="px-4 py-2 rounded-xl font-semibold hover:bg-[hsl(var(--jr-primary)/0.08)]">Cancel</button>
              <button onClick={submitReset} disabled={resetting} className="jr-btn">
                {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
                {resetMode === 'set' ? 'Update Password' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean; hint?: string }> = ({ label, value, onChange, type = 'text', disabled, hint }) => (
  <div>
    <label className="text-xs font-bold text-[hsl(var(--jr-muted))] uppercase tracking-wider">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[hsl(var(--jr-border))] bg-white text-sm disabled:bg-gray-50 disabled:text-[hsl(var(--jr-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--jr-primary)/0.3)]" />
    {hint && <p className="text-xs text-[hsl(var(--jr-muted))] mt-1">{hint}</p>}
  </div>
);
