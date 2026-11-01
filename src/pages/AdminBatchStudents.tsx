import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Search, Loader2, Users, ExternalLink } from 'lucide-react';

interface BatchEnrollment {
  id: string;
  user_id: string;
  status: string | null;
  enrolled_at: string;
  profiles?: { full_name: string | null; email: string | null; phone: string | null } | null;
}

const AdminBatchStudents: React.FC = () => {
  const { batchId } = useParams();
  const { user } = useAuth();
  const [batch, setBatch] = useState<any>(null);
  const [rows, setRows] = useState<BatchEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    if (!batchId) return;
    setLoading(true);
    const { data: b } = await supabase.from('batches').select('id, name, course_id, courses:course_id(title)').eq('id', batchId).maybeSingle();
    setBatch(b);
    const { data: enr } = await supabase
      .from('batch_enrollments')
      .select('id, user_id, status, enrolled_at')
      .eq('batch_id', batchId)
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

  useEffect(() => { void load(); }, [batchId]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const p = r.profiles;
    return [p?.full_name, p?.email, p?.phone].some((v) => v?.toLowerCase().includes(q));
  }), [rows, search]);

  const remove = async (r: BatchEnrollment) => {
    if (!confirm(`Remove ${r.profiles?.full_name || r.profiles?.email || 'this student'} from the batch?`)) return;
    const { error } = await supabase.from('batch_enrollments').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('Student removed from batch');
    load();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link to="/admin/batches" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Batches
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Batch Students
            </h1>
            <p className="text-muted-foreground mt-1">{batch?.name ?? 'Batch'} — {(batch as any)?.courses?.title ?? ''}</p>
          </div>
          <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Student</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Students</div><div className="text-3xl font-bold">{rows.length}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Active</div><div className="text-3xl font-bold text-green-600">{rows.filter(r => r.status === 'active').length}</div></CardContent></Card>
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
                      <TableCell><Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status || 'active'}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(r.enrolled_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" title="Open student dashboard" onClick={() => window.open(`/admin/user-dashboard/${r.user_id}`, '_blank')}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(r)} title="Remove">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      {search ? 'No students match your search.' : 'No students in this batch yet.'}
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {addOpen && batchId && (
          <AddStudentDialog batchId={batchId} courseId={batch?.course_id} existingUserIds={rows.map((r) => r.user_id)} onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); load(); }} />
        )}
      </div>
    </DashboardLayout>
  );
};

function AddStudentDialog({ batchId, courseId, existingUserIds, onClose, onAdded }: { batchId: string; courseId?: string; existingUserIds: string[]; onClose: () => void; onAdded: () => void }) {
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
    const { error } = await supabase.from('batch_enrollments').insert({
      user_id: s.user_id,
      batch_id: batchId,
      status: 'active',
    });
    setEnrolling(null);
    if (error) return toast.error(error.message);
    toast.success(`Added ${s.full_name || s.email} to batch`);
    onAdded();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader><DialogTitle>Add Student to Batch</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} autoFocus placeholder="Search by name, email..." className="pl-9" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 mt-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{students.length === 0 ? 'All students are already in this batch.' : 'No students match.'}</div>
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
                  {enrolling === s.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3 mr-1" /> Add</>}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdminBatchStudents;
