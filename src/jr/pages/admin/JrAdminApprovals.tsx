import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { Loader2, CheckCircle, XCircle, Clock, BookOpen, User, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Tab = 'courses' | 'enrollments';
type Status = 'pending' | 'approved' | 'rejected';

export default function JrAdminApprovals() {
  const { user } = useJrAuth();
  const [tab, setTab] = useState<Tab>('courses');
  const [status, setStatus] = useState<Status>('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: cs }, { data: es }] = await Promise.all([
      supabase.from('jr_courses').select('*, jr_categories(name)').order('created_at', { ascending: false }),
      supabase.from('jr_enrollments').select('*, jr_courses(id, title, thumbnail_url, price)').order('enrolled_at', { ascending: false }),
    ]);
    let enriched = es ?? [];
    if (enriched.length) {
      const ids = [...new Set(enriched.map((e: any) => e.user_id))];
      const { data: profs } = await supabase.from('jr_profiles').select('user_id, full_name, email').in('user_id', ids);
      enriched = enriched.map((e: any) => ({ ...e, profile: profs?.find((p: any) => p.user_id === e.user_id) }));
    }
    setCourses(cs ?? []);
    setEnrollments(enriched);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateCourse = async (id: string, newStatus: 'approved' | 'rejected') => {
    const note = notes[id] || '';
    if (newStatus === 'rejected' && !note.trim()) { toast.error('Rejection feedback required'); return; }
    const { error } = await supabase.from('jr_courses').update({
      approval_status: newStatus,
      approval_notes: note || null,
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
      is_published: newStatus === 'approved',
    }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success(`Course ${newStatus}`);
    setNotes({ ...notes, [id]: '' });
    load();
  };

  const updateEnrollment = async (id: string, newStatus: 'approved' | 'rejected') => {
    const note = notes[id] || '';
    if (newStatus === 'rejected' && !note.trim()) { toast.error('Rejection feedback required'); return; }
    const { error } = await supabase.from('jr_enrollments').update({
      approval_status: newStatus,
      approval_notes: note || null,
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
      status: newStatus === 'approved' ? 'active' : 'cancelled',
    }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success(`Enrollment ${newStatus}`);
    setNotes({ ...notes, [id]: '' });
    load();
  };

  const filteredCourses = courses.filter((c) => c.approval_status === status &&
    (!search || c.title?.toLowerCase().includes(search.toLowerCase())));
  const filteredEnrollments = enrollments.filter((e) => (e.approval_status || 'pending') === status &&
    (!search || e.jr_courses?.title?.toLowerCase().includes(search.toLowerCase()) ||
     e.profile?.full_name?.toLowerCase().includes(search.toLowerCase())));

  const courseCounts = {
    pending: courses.filter((c) => c.approval_status === 'pending').length,
    approved: courses.filter((c) => c.approval_status === 'approved').length,
    rejected: courses.filter((c) => c.approval_status === 'rejected').length,
  };
  const enrollCounts = {
    pending: enrollments.filter((e) => (e.approval_status || 'pending') === 'pending').length,
    approved: enrollments.filter((e) => e.approval_status === 'approved').length,
    rejected: enrollments.filter((e) => e.approval_status === 'rejected').length,
  };
  const counts = tab === 'courses' ? courseCounts : enrollCounts;

  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-2">Approvals</h1>
      <p className="text-[hsl(var(--jr-muted))] mb-6">Review and approve jr courses and paid enrollments</p>

      <div className="flex gap-2 mb-4">
        {(['courses', 'enrollments'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setStatus('pending'); }}
            className={`px-4 py-2 rounded-xl font-semibold capitalize ${tab === t ? 'bg-[hsl(var(--jr-primary))] text-white' : 'jr-card'}`}>
            {t === 'courses' ? <><BookOpen className="inline w-4 h-4 mr-1" />Course Approvals</> : <><User className="inline w-4 h-4 mr-1" />Enrollment Approvals</>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {(['pending', 'approved', 'rejected'] as Status[]).map((s) => {
          const Icon = s === 'pending' ? Clock : s === 'approved' ? CheckCircle : XCircle;
          return (
            <button key={s} onClick={() => setStatus(s)}
              className={`jr-card p-4 text-left ${status === s ? 'ring-2 ring-[hsl(var(--jr-primary))]' : ''}`}>
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--jr-muted))] capitalize"><Icon className="w-4 h-4" />{s}</div>
              <div className="text-2xl font-extrabold mt-1">{counts[s]}</div>
            </button>
          );
        })}
      </div>

      <div className="jr-card p-3 mb-4 flex items-center gap-2">
        <Search className="w-4 h-4 text-[hsl(var(--jr-muted))]" />
        <input className="flex-1 bg-transparent outline-none" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div> : (
        <div className="space-y-3">
          {tab === 'courses' && filteredCourses.length === 0 && <div className="jr-card p-8 text-center text-[hsl(var(--jr-muted))]">No {status} courses</div>}
          {tab === 'courses' && filteredCourses.map((c) => (
            <div key={c.id} className="jr-card p-4">
              <div className="flex gap-4">
                {c.thumbnail_url ? <img src={c.thumbnail_url} className="w-28 h-20 object-cover rounded-lg" /> :
                  <div className="w-28 h-20 bg-[hsl(var(--jr-primary)/0.1)] rounded-lg flex items-center justify-center"><BookOpen className="w-6 h-6" /></div>}
                <div className="flex-1">
                  <div className="font-bold">{c.title}</div>
                  <div className="text-sm text-[hsl(var(--jr-muted))]">{c.jr_categories?.name || 'Uncategorized'} • {c.difficulty} • ₹{c.price}</div>
                  <div className="text-xs text-[hsl(var(--jr-muted))] mt-1">Submitted {format(new Date(c.created_at), 'MMM d, yyyy')}</div>
                  {c.approval_notes && <div className="text-xs mt-2 p-2 bg-[hsl(var(--jr-primary)/0.05)] rounded">📝 {c.approval_notes}</div>}
                </div>
              </div>
              {status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <input className="flex-1 jr-card px-3 py-2 text-sm" placeholder="Notes / rejection reason"
                    value={notes[c.id] || ''} onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} />
                  <button onClick={() => updateCourse(c.id, 'approved')} className="px-3 py-2 rounded-xl bg-green-600 text-white font-semibold text-sm"><CheckCircle className="inline w-4 h-4 mr-1" />Approve</button>
                  <button onClick={() => updateCourse(c.id, 'rejected')} className="px-3 py-2 rounded-xl bg-red-600 text-white font-semibold text-sm"><XCircle className="inline w-4 h-4 mr-1" />Reject</button>
                </div>
              )}
            </div>
          ))}

          {tab === 'enrollments' && filteredEnrollments.length === 0 && <div className="jr-card p-8 text-center text-[hsl(var(--jr-muted))]">No {status} enrollments</div>}
          {tab === 'enrollments' && filteredEnrollments.map((e) => (
            <div key={e.id} className="jr-card p-4">
              <div className="flex justify-between gap-4">
                <div className="flex-1">
                  <div className="font-bold">{e.jr_courses?.title || 'Course'}</div>
                  <div className="text-sm text-[hsl(var(--jr-muted))]">Student: {e.profile?.full_name || 'Unknown'} ({e.profile?.email})</div>
                  <div className="text-sm">₹{e.payment_amount} • {e.payment_method || 'razorpay'} • {e.payment_date ? format(new Date(e.payment_date), 'MMM d, yyyy') : '—'}</div>
                  {e.payment_id && <div className="text-xs text-[hsl(var(--jr-muted))]">Payment ID: {e.payment_id}</div>}
                  {e.approval_notes && <div className="text-xs mt-2 p-2 bg-[hsl(var(--jr-primary)/0.05)] rounded">📝 {e.approval_notes}</div>}
                </div>
              </div>
              {status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <input className="flex-1 jr-card px-3 py-2 text-sm" placeholder="Notes / rejection reason"
                    value={notes[e.id] || ''} onChange={(ev) => setNotes({ ...notes, [e.id]: ev.target.value })} />
                  <button onClick={() => updateEnrollment(e.id, 'approved')} className="px-3 py-2 rounded-xl bg-green-600 text-white font-semibold text-sm"><CheckCircle className="inline w-4 h-4 mr-1" />Approve</button>
                  <button onClick={() => updateEnrollment(e.id, 'rejected')} className="px-3 py-2 rounded-xl bg-red-600 text-white font-semibold text-sm"><XCircle className="inline w-4 h-4 mr-1" />Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
