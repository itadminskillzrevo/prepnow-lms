import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Plus, Trash2, X, Search } from 'lucide-react';
import { toast } from 'sonner';

const SpAdminCourseStudents: React.FC = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: enr }] = await Promise.all([
      supabase.from('selfpaced_courses').select('id,title').eq('id', courseId!).maybeSingle(),
      supabase.from('selfpaced_enrollments').select('*, selfpaced_profiles!inner(email,full_name,phone)').eq('course_id', courseId!),
    ]);
    setCourse(c); setRows(enr ?? []);
  };
  useEffect(() => { void load(); }, [courseId]);

  const remove = async (enrollmentId: string, name: string) => {
    if (!confirm(`Remove ${name} from this course?`)) return;
    const { error } = await supabase.from('selfpaced_enrollments').delete().eq('id', enrollmentId);
    if (error) toast.error(error.message); else { toast.success('Student removed'); load(); }
  };

  return (
    <div>
      <Link to="/selfpaced/admin/courses" className="sp-btn sp-btn-ghost" style={{ padding: 0, marginBottom: 8 }}><ChevronLeft size={14} /> Back</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: 8 }}>
        <h1 style={{ margin: 0 }}>Students — {course?.title}</h1>
        <button className="sp-btn" onClick={() => setShowAdd(true)}><Plus size={14} /> Add student</button>
      </div>
      <div className="sp-card" style={{ padding: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid hsl(var(--sp-border))' }}>
            <th style={{ padding: '.5rem' }}>Student</th><th>Email</th><th>Progress</th><th>Enrolled</th><th />
          </tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--sp-border))' }}>
                <td style={{ padding: '.5rem' }}>{r.selfpaced_profiles?.full_name || '—'}</td>
                <td>{r.selfpaced_profiles?.email}</td>
                <td>{r.progress_percentage ?? 0}%</td>
                <td>{new Date(r.enrolled_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <button className="sp-btn sp-btn-ghost" style={{ color: '#dc2626' }} onClick={() => remove(r.id, r.selfpaced_profiles?.full_name || r.selfpaced_profiles?.email || 'student')}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--sp-muted))' }}>No enrollments yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddStudentDialog
          courseId={courseId!}
          existingIds={rows.map((r) => r.user_id)}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load(); }}
        />
      )}
    </div>
  );
};

const AddStudentDialog: React.FC<{ courseId: string; existingIds: string[]; onClose: () => void; onAdded: () => void }> = ({ courseId, existingIds, onClose, onAdded }) => {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('selfpaced_profiles').select('user_id,email,full_name').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (existingIds.includes(r.user_id)) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.full_name || '').toLowerCase().includes(s) || (r.email || '').toLowerCase().includes(s);
  }), [rows, q, existingIds]);

  const add = async (userId: string) => {
    setBusy(userId);
    const { error } = await supabase.from('selfpaced_enrollments').insert({ user_id: userId, course_id: courseId, source: 'admin' });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Student enrolled');
    onAdded();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 16 }}>
      <div className="sp-card" style={{ width: '100%', maxWidth: 560, background: 'hsl(var(--sp-surface))', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Add student to course</h3>
          <button className="sp-btn sp-btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--sp-muted))' }} />
          <input className="sp-input" placeholder="Search name or email..." value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid hsl(var(--sp-border))', borderRadius: 8 }}>
          {filtered.map(r => (
            <div key={r.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.6rem .75rem', borderTop: '1px solid hsl(var(--sp-border))' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{r.full_name || '—'}</div>
                <div style={{ fontSize: '.78rem', color: 'hsl(var(--sp-muted))' }}>{r.email}</div>
              </div>
              <button className="sp-btn" style={{ padding: '.3rem .7rem', fontSize: '.8rem' }} disabled={busy === r.user_id} onClick={() => add(r.user_id)}>
                {busy === r.user_id ? 'Adding…' : 'Add'}
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--sp-muted))', fontSize: '.85rem' }}>
              No matching students. Create them from the Users page first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpAdminCourseStudents;
