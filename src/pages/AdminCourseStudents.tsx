import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Search, Loader2, Users, CheckCircle, Clock, XCircle, ExternalLink } from 'lucide-react';

interface Enrollment {
  id: string;
  user_id: string;
  status: string | null;
  approval_status: string | null;
  enrolled_at: string;
  payment_status: string | null;
  payment_amount: number | null;
  profiles?: { full_name: string | null; email: string | null; phone: string | null } | null;
}

const AdminCourseStudents: React.FC = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    const { data: c } = await supabase.from('courses').select('id, title, thumbnail_url').eq('id', courseId).maybeSingle();
    setCourse(c);
    const { data: enr } = await supabase
      .from('enrollments')
      .select('id, user_id, status, approval_status, enrolled_at, payment_status, payment_amount')
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });
    const userIds = (enr ?? []).map((e: any) => e.user_id);
    const { data: profs } = userIds.length
      ? await supabase.from('profiles').select('user_id, full_name, email, phone').in('user_id', userIds)
      : { data: [] } as any;
    const byUser: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { byUser[p.user_id] = p; });
    setRows((enr ?? []).map((e: any) => ({ ...e, profiles: byUser[e.user_id] ?? null })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [courseId]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const p = r.profiles;
    return [p?.full_name, p?.email, p?.phone].some((v) => v?.toLowerCase().includes(q));
  }), [rows, search]);

  const remove = async (r: Enrollment) => {
    if (!confirm(`Remove ${r.profiles?.full_name || r.profiles?.email || 'this student'} from the course?`)) return;
    const { error } = await supabase.from('enrollments').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('Student removed');
    load();
  };

  const updateApproval = async (r: Enrollment, approval_status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('enrollments').update({
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
    <DashboardLayout>
      <div className="space-y-6">
        <Link to="/courses" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Enrolled Students
            </h1>
            <p className="text-muted-foreground mt-1">{course?.title ?? 'Course'}</p>
          </div>
          <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Student</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total</div><div className="text-3xl font-bold">{counts.total}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Approved</div><div className="text-3xl font-bold text-green-600">{counts.approved}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Pending</div><div className="text-3xl font-bold text-amber-600">{counts.pending}</div></CardContent></Card>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone..." className="pl-9" />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.profiles?.full_name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.profiles?.email || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.profiles?.phone || '—'}</TableCell>
                      <TableCell><StatusBadge status={r.approval_status} /></TableCell>
                      <TableCell>
                        <Badge variant={r.payment_status === 'completed' ? 'default' : 'outline'}>
                          {r.payment_status || 'none'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(r.enrolled_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" title="Open student dashboard" onClick={() => window.open(`/admin/user-dashboard/${r.user_id}`, '_blank')}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          {r.approval_status !== 'approved' && (
                            <Button variant="outline" size="sm" onClick={() => updateApproval(r, 'approved')} className="text-green-600">Approve</Button>
                          )}
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(r)} title="Remove">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {search ? 'No students match your search.' : 'No students enrolled yet.'}
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {addOpen && courseId && (
          <AddStudentDialog courseId={courseId} existingUserIds={rows.map((r) => r.user_id)} onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); load(); }} adminId={user?.id} />
        )}
      </div>
    </DashboardLayout>
  );
};

function StatusBadge({ status }: { status: string | null }) {
  const s = status || 'pending';
  if (s === 'approved') return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
  if (s === 'rejected') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
  return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
}

function AddStudentDialog({ courseId, existingUserIds, onClose, onAdded, adminId }: { courseId: string; existingUserIds: string[]; onClose: () => void; onAdded: () => void; adminId?: string }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name, email, phone').order('full_name');
      setStudents((data ?? []).filter((s: any) => !existingUserIds.includes(s.user_id)));
      setLoading(false);
    })();
  }, []);

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [s.full_name, s.email, s.phone].some((v: any) => v?.toLowerCase().includes(q));
  });

  const enroll = async (s: any) => {
    setEnrolling(s.user_id);
    const { error } = await supabase.from('enrollments').insert({
      user_id: s.user_id,
      course_id: courseId,
      status: 'active',
      approval_status: 'approved',
      payment_status: 'none',
      payment_amount: 0,
      approved_by: adminId ?? null,
      approved_at: new Date().toISOString(),
    });
    setEnrolling(null);
    if (error) return toast.error(error.message);
    toast.success(`Enrolled ${s.full_name || s.email}`);
    onAdded();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader><DialogTitle>Add Student to Course</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} autoFocus placeholder="Search by name, email..." className="pl-9" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 mt-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{students.length === 0 ? 'All students are already enrolled.' : 'No students match your search.'}</div>
          ) : (
            filtered.map((s) => (
              <div key={s.user_id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {(s.full_name || s.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.full_name || '—'}</div>
                  <div className="text-xs text-muted-foreground">{s.email}</div>
                </div>
                <Button size="sm" onClick={() => enroll(s)} disabled={enrolling === s.user_id}>
                  {enrolling === s.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3 mr-1" /> Enroll</>}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdminCourseStudents;
