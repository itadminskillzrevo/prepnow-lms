import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Trash2, Search, Loader2, Users, X, Mail, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

interface Enrollment {
  id: string;
  user_id: string;
  status: string | null;
  approval_status: string | null;
  enrolled_at: string;
  payment_status: string | null;
  jr_profiles?: { full_name: string | null; email: string; grade: string | null; school_name: string | null } | null;
}

export default function JrAdminCourseStudents() {
  const { courseId } = useParams();
  const [course, setCourse] = useState<any>(null);
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    const { data: c } = await supabase.from('jr_courses').select('id, title, thumbnail_url').eq('id', courseId).maybeSingle();
    setCourse(c);
    const { data: enr } = await supabase
      .from('jr_enrollments')
      .select('id, user_id, status, approval_status, enrolled_at, payment_status')
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });
    const userIds = (enr ?? []).map((e: any) => e.user_id);
    const { data: profs } = userIds.length
      ? await supabase.from('jr_profiles').select('user_id, full_name, email, grade, school_name').in('user_id', userIds)
      : { data: [] } as any;
    const byUser: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { byUser[p.user_id] = p; });
    setRows((enr ?? []).map((e: any) => ({ ...e, jr_profiles: byUser[e.user_id] ?? null })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [courseId]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const p = r.jr_profiles;
    return [p?.full_name, p?.email, p?.grade, p?.school_name].some((v) => v?.toLowerCase().includes(q));
  }), [rows, search]);

  const remove = async (r: Enrollment) => {
    if (!confirm(`Remove ${r.jr_profiles?.full_name || r.jr_profiles?.email || 'this student'} from the course?`)) return;
    const { error } = await supabase.from('jr_enrollments').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('Student removed');
    load();
  };

  const updateApproval = async (r: Enrollment, approval_status: 'approved' | 'rejected') => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('jr_enrollments').update({
      approval_status,
      approved_by: user?.id ?? null,
      approved_at: new Date().toISOString(),
      status: approval_status === 'approved' ? 'active' : 'rejected',
    }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success(`Enrollment ${approval_status}`);
    load();
  };

  const counts = useMemo(() => ({
    total: rows.length,
    approved: rows.filter((r) => r.approval_status === 'approved').length,
    pending: rows.filter((r) => r.approval_status === 'pending').length,
  }), [rows]);

  return (
    <div>
      <Link to="/jr/admin/courses" className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--jr-primary))] mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <Users className="w-7 h-7 text-[hsl(var(--jr-primary))]" /> Enrolled Students
          </h1>
          <p className="text-[hsl(var(--jr-muted))] mt-1">{course?.title ?? 'Course'}</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="jr-btn"><Plus className="w-4 h-4" /> Add Student</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Total" value={counts.total} emoji="👥" />
        <Stat label="Approved" value={counts.approved} emoji="✅" />
        <Stat label="Pending" value={counts.pending} emoji="⏳" />
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--jr-muted))]" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, grade, school..."
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
                  <th className="text-left p-3 font-bold">Enrolled</th>
                  <th className="text-left p-3 font-bold">Status</th>
                  <th className="text-right p-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-[hsl(var(--jr-border))] hover:bg-[hsl(var(--jr-primary)/0.04)]">
                    <td className="p-3 font-semibold">{r.jr_profiles?.full_name || '—'}</td>
                    <td className="p-3 text-[hsl(var(--jr-muted))]">{r.jr_profiles?.email || '—'}</td>
                    <td className="p-3">{r.jr_profiles?.grade || '—'}</td>
                    <td className="p-3">{r.jr_profiles?.school_name || '—'}</td>
                    <td className="p-3 text-xs text-[hsl(var(--jr-muted))]">{new Date(r.enrolled_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <StatusPill status={r.approval_status} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        {r.approval_status !== 'approved' && (
                          <button onClick={() => updateApproval(r, 'approved')} className="px-2 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200">Approve</button>
                        )}
                        <button onClick={() => remove(r)} className="p-2 rounded-lg hover:bg-red-50 text-red-600" title="Remove from course">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center p-12 text-[hsl(var(--jr-muted))]">
                    {search ? 'No students match your search.' : 'No students enrolled yet. Click "Add Student" to enroll someone.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {addOpen && courseId && (
        <AddStudentDialog courseId={courseId} existingUserIds={rows.map((r) => r.user_id)} onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); load(); }} />
      )}
    </div>
  );
}

function Stat({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="jr-card p-4">
      <div className="text-2xl">{emoji}</div>
      <div className="text-xs text-[hsl(var(--jr-muted))] mt-1">{label}</div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const s = status || 'pending';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${map[s] || 'bg-gray-100 text-gray-700'}`}>{s}</span>;
}

function AddStudentDialog({ courseId, existingUserIds, onClose, onAdded }: { courseId: string; existingUserIds: string[]; onClose: () => void; onAdded: () => void }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('jr_profiles').select('user_id, full_name, email, grade, school_name').order('full_name');
      setStudents((data ?? []).filter((s: any) => !existingUserIds.includes(s.user_id)));
      setLoading(false);
    })();
  }, []);

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [s.full_name, s.email, s.grade, s.school_name].some((v: any) => v?.toLowerCase().includes(q));
  });

  const enroll = async (s: any) => {
    setEnrolling(s.user_id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('jr_enrollments').insert({
      user_id: s.user_id,
      course_id: courseId,
      status: 'active',
      approval_status: 'approved',
      payment_status: 'admin_added',
      approved_by: user?.id ?? null,
      approved_at: new Date().toISOString(),
    });
    setEnrolling(null);
    if (error) return toast.error(error.message);
    toast.success(`Enrolled ${s.full_name || s.email}`);
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[hsl(var(--jr-border))] flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Add Student to Course</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 border-b border-[hsl(var(--jr-border))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--jr-muted))]" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              autoFocus placeholder="Search students by name, email, grade..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[hsl(var(--jr-border))] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--jr-primary)/0.3)]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-[hsl(var(--jr-muted))]">
              {students.length === 0 ? 'All students are already enrolled.' : 'No students match your search.'}
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((s) => (
                <li key={s.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--jr-border))] hover:bg-[hsl(var(--jr-primary)/0.04)]">
                  <div className="w-10 h-10 rounded-full bg-[hsl(var(--jr-primary)/0.12)] flex items-center justify-center font-bold text-[hsl(var(--jr-primary))]">
                    {(s.full_name || s.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{s.full_name || '—'}</div>
                    <div className="text-xs text-[hsl(var(--jr-muted))] flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>
                      {s.grade && <span className="inline-flex items-center gap-1"><GraduationCap className="w-3 h-3" />{s.grade}</span>}
                      {s.school_name && <span className="truncate">🏫 {s.school_name}</span>}
                    </div>
                  </div>
                  <button onClick={() => enroll(s)} disabled={enrolling === s.user_id} className="jr-btn !py-1.5 !px-3 text-xs">
                    {enrolling === s.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" /> Enroll</>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
