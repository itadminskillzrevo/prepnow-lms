import React, { useEffect, useMemo, useState } from 'react';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { JrLayout } from '@/jr/components/JrLayout';
import { JrStudentLayout } from '@/jr/components/JrStudentLayout';
void JrLayout;
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, MapPin, GraduationCap, Users as UsersIcon, Lock, Camera, Loader2, Pencil, Save, X, Shield } from 'lucide-react';

const GRADES = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

const NAV = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'parent', label: 'Parent / Guardian', icon: UsersIcon },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'security', label: 'Password', icon: Lock },
];

export default function JrProfile() {
  const { profile, user, refresh } = useJrAuth();
  const [active, setActive] = useState('profile');
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: '', grade: '', school_name: '', date_of_birth: '',
    parent_name: '', parent_phone: '', parent_email: '',
    city: '', state: '',
  });
  const [pwd, setPwd] = useState({ next: '', confirm: '' });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '', grade: profile.grade || '', school_name: profile.school_name || '',
        date_of_birth: (profile as any).date_of_birth || '',
        parent_name: profile.parent_name || '', parent_phone: profile.parent_phone || '', parent_email: profile.parent_email || '',
        city: profile.city || '', state: profile.state || '',
      });
    }
  }, [profile]);

  const completion = useMemo(() => {
    if (!profile) return 0;
    const fields = [profile.full_name, profile.grade, profile.school_name, profile.parent_name, profile.parent_phone, profile.city, profile.state, (profile as any).date_of_birth];
    return Math.round((fields.filter((f) => f && String(f).trim()).length / fields.length) * 100);
  }, [profile]);

  const save = async (section: string) => {
    if (!user) return;
    setSaving(true);
    let payload: any = {};
    if (section === 'profile') payload = { full_name: form.full_name, date_of_birth: form.date_of_birth || null };
    if (section === 'education') payload = { grade: form.grade || null, school_name: form.school_name || null };
    if (section === 'parent') payload = { parent_name: form.parent_name || null, parent_phone: form.parent_phone || null, parent_email: form.parent_email || null };
    if (section === 'location') payload = { city: form.city || null, state: form.state || null };

    const { error } = await supabase.from('jr_profiles').update(payload).eq('user_id', user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Profile updated!');
    setEditing(null);
    await refresh();
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB');
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from('course-media').upload(path, file, { upsert: true });
    if (upErr) return toast.error('Upload failed');
    const { data } = supabase.storage.from('course-media').getPublicUrl(path);
    await supabase.from('jr_profiles').update({ avatar_url: data.publicUrl }).eq('user_id', user.id);
    toast.success('Avatar updated!');
    await refresh();
  };

  const changePassword = async () => {
    if (pwd.next.length < 6) return toast.error('Password must be at least 6 characters');
    if (pwd.next !== pwd.confirm) return toast.error('Passwords do not match');
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Password updated!');
    setPwd({ next: '', confirm: '' });
  };

  return (
    <JrStudentLayout title="Profile">
      <div className="max-w-5xl">
        {/* Header card */}
        <div className="jr-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(var(--jr-primary))] to-[hsl(var(--jr-pink))] flex items-center justify-center text-white text-3xl font-extrabold overflow-hidden border-4 border-white shadow-lg">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile?.full_name?.charAt(0) || 'S')}
              </div>
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center cursor-pointer hover:bg-[hsl(var(--jr-primary)/0.1)]">
                <Camera className="w-4 h-4 text-[hsl(var(--jr-primary))]" />
                <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
              </label>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold">{profile?.full_name || 'Junior Learner'}</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[hsl(var(--jr-secondary)/0.15)] text-[hsl(var(--jr-secondary))]">
                  <Shield className="w-3 h-3" /> Junior Student
                </span>
              </div>
              <p className="text-sm text-[hsl(var(--jr-muted))] mt-0.5">{profile?.email}</p>
              <div className="mt-3 max-w-xs mx-auto sm:mx-0">
                <div className="flex justify-between mb-1 text-xs">
                  <span className="text-[hsl(var(--jr-muted))]">Profile Completion</span>
                  <span className="font-bold text-[hsl(var(--jr-primary))]">{completion}%</span>
                </div>
                <div className="h-2 rounded-full bg-[hsl(var(--jr-primary)/0.15)] overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[hsl(var(--jr-primary))] to-[hsl(var(--jr-pink))] transition-all" style={{ width: `${completion}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="jr-card p-2 md:w-56 shrink-0 h-fit">
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {NAV.map((n) => {
                const Icon = n.icon;
                const isActive = active === n.id;
                return (
                  <button key={n.id} onClick={() => { setActive(n.id); setEditing(null); }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap w-full text-left ${
                      isActive ? 'bg-[hsl(var(--jr-primary))] text-white' : 'hover:bg-[hsl(var(--jr-primary)/0.08)]'
                    }`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden md:inline">{n.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="jr-card p-6 flex-1 min-w-0">
            {active === 'profile' && (
              <Section title="Personal Information" icon={User} editing={editing === 'profile'} onEdit={() => setEditing('profile')} onCancel={() => setEditing(null)} onSave={() => save('profile')} saving={saving}
                view={
                  <Grid>
                    <Read label="Full Name" value={profile?.full_name} />
                    <Read label="Email" value={profile?.email} />
                    <Read label="Date of Birth" value={(profile as any)?.date_of_birth} />
                  </Grid>
                }
                edit={
                  <div className="space-y-4">
                    <FieldGrid>
                      <Field label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
                      <Field label="Email" value={profile?.email || ''} onChange={() => {}} disabled />
                    </FieldGrid>
                    <Field label="Date of Birth" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} />
                  </div>
                }
              />
            )}

            {active === 'education' && (
              <Section title="Education" icon={GraduationCap} editing={editing === 'education'} onEdit={() => setEditing('education')} onCancel={() => setEditing(null)} onSave={() => save('education')} saving={saving}
                view={<Grid><Read label="Grade" value={profile?.grade} /><Read label="School Name" value={profile?.school_name} /></Grid>}
                edit={
                  <FieldGrid>
                    <div>
                      <label className="text-xs font-bold text-[hsl(var(--jr-muted))] uppercase tracking-wider">Grade</label>
                      <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}
                        className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[hsl(var(--jr-border))] bg-white text-sm">
                        <option value="">Select grade</option>
                        {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <Field label="School Name" value={form.school_name} onChange={(v) => setForm({ ...form, school_name: v })} />
                  </FieldGrid>
                }
              />
            )}

            {active === 'parent' && (
              <Section title="Parent / Guardian" icon={UsersIcon} editing={editing === 'parent'} onEdit={() => setEditing('parent')} onCancel={() => setEditing(null)} onSave={() => save('parent')} saving={saving}
                view={
                  <Grid>
                    <Read label="Parent Name" value={profile?.parent_name} />
                    <Read label="Parent Phone" value={profile?.parent_phone} />
                    <Read label="Parent Email" value={profile?.parent_email} />
                  </Grid>
                }
                edit={
                  <div className="space-y-4">
                    <FieldGrid>
                      <Field label="Parent Name" value={form.parent_name} onChange={(v) => setForm({ ...form, parent_name: v })} />
                      <Field label="Parent Phone" value={form.parent_phone} onChange={(v) => setForm({ ...form, parent_phone: v })} />
                    </FieldGrid>
                    <Field label="Parent Email" type="email" value={form.parent_email} onChange={(v) => setForm({ ...form, parent_email: v })} />
                  </div>
                }
              />
            )}

            {active === 'location' && (
              <Section title="Location" icon={MapPin} editing={editing === 'location'} onEdit={() => setEditing('location')} onCancel={() => setEditing(null)} onSave={() => save('location')} saving={saving}
                view={<Grid><Read label="City" value={profile?.city} /><Read label="State" value={profile?.state} /></Grid>}
                edit={
                  <FieldGrid>
                    <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                    <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
                  </FieldGrid>
                }
              />
            )}

            {active === 'security' && (
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <Lock className="w-5 h-5 text-[hsl(var(--jr-primary))]" />
                  <h2 className="text-lg font-bold">Password & Security</h2>
                </div>
                <div className="space-y-4 max-w-md">
                  <Field label="New Password" type="password" value={pwd.next} onChange={(v) => setPwd({ ...pwd, next: v })} hint="At least 6 characters" />
                  <Field label="Confirm Password" type="password" value={pwd.confirm} onChange={(v) => setPwd({ ...pwd, confirm: v })} />
                  <button onClick={changePassword} disabled={saving} className="jr-btn">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Update Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </JrStudentLayout>
  );
}

const Section: React.FC<{
  title: string; icon: any; editing: boolean; saving: boolean;
  onEdit: () => void; onCancel: () => void; onSave: () => void;
  view: React.ReactNode; edit: React.ReactNode;
}> = ({ title, icon: Icon, editing, saving, onEdit, onCancel, onSave, view, edit }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <Icon className="w-5 h-5 text-[hsl(var(--jr-primary))]" />
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {!editing ? (
        <button onClick={onEdit} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold text-[hsl(var(--jr-primary))] hover:bg-[hsl(var(--jr-primary)/0.08)]">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={saving} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-100">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button onClick={onSave} disabled={saving} className="jr-btn !py-1.5 !px-3 text-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
          </button>
        </div>
      )}
    </div>
    {editing ? edit : view}
  </div>
);

const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">{children}</div>
);
const FieldGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
);
const Read: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="space-y-1">
    <p className="text-xs font-bold text-[hsl(var(--jr-muted))] uppercase tracking-wider">{label}</p>
    <p className="text-sm font-semibold">{value || <span className="text-[hsl(var(--jr-muted))] italic font-normal">Not provided</span>}</p>
  </div>
);
const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean; hint?: string }> = ({ label, value, onChange, type = 'text', disabled, hint }) => (
  <div>
    <label className="text-xs font-bold text-[hsl(var(--jr-muted))] uppercase tracking-wider">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      className="mt-1 w-full px-3 py-2.5 rounded-xl border border-[hsl(var(--jr-border))] bg-white text-sm disabled:bg-gray-50 disabled:text-[hsl(var(--jr-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--jr-primary)/0.3)]" />
    {hint && <p className="text-xs text-[hsl(var(--jr-muted))] mt-1">{hint}</p>}
  </div>
);
