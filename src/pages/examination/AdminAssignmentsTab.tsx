import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Eye, X, CheckCircle, Download, FileText, Loader2, Save, Radio } from 'lucide-react';
import { toast } from 'sonner';

const MAX_ADMIN_FILE_MB = 5;

type ExamAssignment = {
  id: string; title: string; description: string | null; instructions: string | null;
  due_date: string | null; max_score: number;
  file_url?: string | null; file_name?: string | null;
  is_live?: boolean;
  created_by: string;
};
type TaskAssign = {
  id: string; assignment_id: string; assignment_type: string;
  target_id: string | null; is_active: boolean; due_date: string | null;
};

export default function AdminAssignmentsTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [taskMap, setTaskMap] = useState<Record<string, TaskAssign[]>>({});
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExamAssignment | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [subsOpenId, setSubsOpenId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: 0, feedback: '', status: 'graded' });

  const [form, setForm] = useState({
    title: '', description: '', instructions: '',
    max_score: 100, due_date: '',
    assign_type: 'all', target_id: '',
  });

  const load = async () => {
    setLoading(true);
    const [{ data: qs }, { data: ts }, { data: bs }, { data: cs }] = await Promise.all([
      supabase.from('exam_assignments').select('*').order('created_at', { ascending: false }),
      supabase.from('exam_task_assignments').select('*'),
      supabase.from('batches').select('id, name').order('name'),
      supabase.from('courses').select('id, title').order('title'),
    ]);
    setItems(qs ?? []);
    const map: Record<string, TaskAssign[]> = {};
    (ts ?? []).forEach((t: any) => { (map[t.assignment_id] = map[t.assignment_id] || []).push(t); });
    setTaskMap(map);
    setBatches(bs ?? []);
    setCourses(cs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', instructions: '', max_score: 100, due_date: '', assign_type: 'all', target_id: '' });
    setFile(null);
    setShowForm(true);
  };
  const openEdit = (a: any) => {
    setEditing(a);
    const t = (taskMap[a.id] || [])[0];
    setForm({
      title: a.title, description: a.description ?? '', instructions: a.instructions ?? '',
      max_score: a.max_score ?? 100, due_date: a.due_date ? a.due_date.slice(0, 16) : '',
      assign_type: t?.assignment_type ?? 'all',
      target_id: t?.target_id ?? '',
    });
    setFile(null);
    setShowForm(true);
  };

  const uploadFile = async () => {
    if (!file || !user) return null;
    if (file.size > MAX_ADMIN_FILE_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_ADMIN_FILE_MB}MB`);
      throw new Error('file too big');
    }
    const path = `exam-assignments/${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('course-media').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('course-media').getPublicUrl(path);
    return { url: data.publicUrl, name: file.name };
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title required');
    if (form.assign_type !== 'all' && !form.target_id) return toast.error(`Please select a ${form.assign_type}`);

    try {
      const fileInfo = await uploadFile();
      const payload: any = {
        title: form.title.trim(),
        description: form.description || null,
        instructions: form.instructions || null,
        max_score: Number(form.max_score) || 100,
        due_date: form.due_date || null,
      };
      if (fileInfo) {
        payload.file_url = fileInfo.url;
        payload.file_name = fileInfo.name;
      }

      let assignmentId = editing?.id;
      if (editing) {
        const { error } = await supabase.from('exam_assignments').update(payload).eq('id', editing.id);
        if (error) return toast.error(error.message);
      } else {
        const { data, error } = await supabase.from('exam_assignments').insert({ ...payload, created_by: user!.id }).select('id').single();
        if (error) return toast.error(error.message);
        assignmentId = data.id;
      }

      await supabase.from('exam_task_assignments').delete().eq('assignment_id', assignmentId!);
      const tPayload: any = {
        assignment_id: assignmentId,
        assignment_type: form.assign_type,
        target_id: form.assign_type === 'all' ? null : form.target_id,
        is_active: true,
        due_date: form.due_date || null,
        created_by: user!.id,
      };
      const { error: tErr } = await supabase.from('exam_task_assignments').insert(tPayload);
      if (tErr) return toast.error(tErr.message);

      toast.success(editing ? 'Assignment updated' : 'Assignment created');
      setShowForm(false);
      load();
    } catch (err: any) {
      if (err?.message && err.message !== 'file too big') toast.error(err.message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this assignment?')) return;
    await supabase.from('exam_task_assignments').delete().eq('assignment_id', id);
    await supabase.from('exam_assignment_submissions').delete().eq('assignment_id', id);
    const { error } = await supabase.from('exam_assignments').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const toggleLive = async (a: any) => {
    const next = !a.is_live;
    const { error } = await supabase.from('exam_assignments').update({ is_live: next } as any).eq('id', a.id);
    if (error) return toast.error(error.message);
    toast.success(next ? 'Assignment is now LIVE 🎉' : 'Assignment set to draft');
    load();
  };

  const viewSubs = async (id: string) => {
    setSubsOpenId(id);
    const { data } = await supabase.from('exam_assignment_submissions').select('*').eq('assignment_id', id).order('submitted_at', { ascending: false });
    const userIds = [...new Set((data || []).map((s: any) => s.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds)
      : { data: [] as any[] };
    const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setSubmissions((data || []).map((s: any) => ({ ...s, profile: map.get(s.user_id) })));
  };

  const grade = async () => {
    if (!gradingId) return;
    const { error } = await supabase.from('exam_assignment_submissions').update({
      score: gradeForm.score, feedback: gradeForm.feedback || null, status: gradeForm.status,
      graded_by: user!.id, graded_at: new Date().toISOString(),
    }).eq('id', gradingId);
    if (error) return toast.error(error.message);
    toast.success('Graded');
    setGradingId(null);
    if (subsOpenId) viewSubs(subsOpenId);
  };

  const targetLabel = (t?: TaskAssign) => {
    if (!t) return 'Unassigned';
    if (t.assignment_type === 'all') return 'All students';
    if (t.assignment_type === 'batch') return `Batch: ${batches.find(b => b.id === t.target_id)?.name ?? '—'}`;
    if (t.assignment_type === 'course') return `Course: ${courses.find(c => c.id === t.target_id)?.title ?? '—'}`;
    return t.assignment_type;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">All Assignments</h2>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Assignment</Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Assignment' : 'Create Assignment'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div><Label>Title *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Instructions (visible to students)</Label><Textarea rows={3} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></div>

            <div>
              <Label>Attach File (PDF / DOC / ZIP, max {MAX_ADMIN_FILE_MB}MB)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.zip,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                {file && <Button type="button" variant="ghost" size="icon" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}><X className="w-4 h-4" /></Button>}
              </div>
              {file && <div className="text-xs text-muted-foreground mt-1">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</div>}
              {editing && !file && editing.file_url && <div className="text-xs text-muted-foreground mt-1">Existing: {editing.file_name}</div>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max score</Label><Input type="number" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: Number(e.target.value) })} /></div>
              <div><Label>Due date</Label><Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>

            <div className="rounded-lg border p-3 bg-secondary/30 space-y-3">
              <Label className="text-sm font-bold">Assign To</Label>
              <Select value={form.assign_type} onValueChange={(v) => setForm({ ...form, assign_type: v, target_id: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="batch">Specific Batch</SelectItem>
                  <SelectItem value="course">Specific Course</SelectItem>
                </SelectContent>
              </Select>
              {form.assign_type === 'batch' && (
                <Select value={form.target_id} onValueChange={(v) => setForm({ ...form, target_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select batch…" /></SelectTrigger>
                  <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {form.assign_type === 'course' && (
                <Select value={form.target_id} onValueChange={(v) => setForm({ ...form, target_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select course…" /></SelectTrigger>
                  <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit"><Save className="w-4 h-4 mr-2" />{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((a) => {
            const t = (taskMap[a.id] || [])[0];
            return (
              <Card key={a.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="text-2xl">📝</div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge variant={a.is_live ? 'default' : 'secondary'} className={a.is_live ? 'bg-success/15 text-success border-success/30' : ''}>
                        {a.is_live ? '🟢 LIVE' : 'DRAFT'}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">{targetLabel(t)}</Badge>
                    </div>
                  </div>
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString()} • ` : ''}Max: {a.max_score}
                  </div>
                  {a.description && <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.description}</div>}
                  {a.file_url && (
                    <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <FileText className="w-3.5 h-3.5" /> {a.file_name || 'File'}
                    </a>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => viewSubs(a.id)}><Eye className="w-3.5 h-3.5 mr-1" /> Submissions</Button>
                    <Button size="sm" variant={a.is_live ? 'outline' : 'default'} onClick={() => toggleLive(a)}>
                      <Radio className="w-3.5 h-3.5 mr-1" /> {a.is_live ? 'Set Draft' : 'Mark Live'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(a.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {items.length === 0 && <div className="col-span-full text-center text-muted-foreground py-8">No assignments yet.</div>}
        </div>
      )}

      <Dialog open={!!subsOpenId} onOpenChange={(o) => !o && setSubsOpenId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submissions ({submissions.length})</DialogTitle></DialogHeader>
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No submissions yet</div>
          ) : (
            <div className="space-y-3">
              {submissions.map((s: any) => (
                <div key={s.id} className="border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">{s.profile?.full_name || s.profile?.email || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">Submitted: {new Date(s.submitted_at).toLocaleString()}</div>
                    </div>
                    <Badge variant={s.status === 'graded' ? 'default' : 'secondary'}>
                      {s.status === 'graded' ? `✅ ${s.score}pts` : '⏳ Pending'}
                    </Badge>
                  </div>
                  {s.content && <div className="mt-2 text-sm bg-secondary/50 p-2 rounded">{s.content}</div>}
                  {s.file_url && (
                    <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <Download className="w-3.5 h-3.5" /> {s.file_name || 'Download file'}
                    </a>
                  )}
                  {s.feedback && <div className="mt-2 text-sm text-success bg-success/10 p-2 rounded">Feedback: {s.feedback}</div>}

                  {gradingId === s.id ? (
                    <div className="mt-3 p-3 bg-secondary/30 rounded-xl space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>Score</Label><Input type="number" value={gradeForm.score} onChange={(e) => setGradeForm({ ...gradeForm, score: Number(e.target.value) })} /></div>
                        <div>
                          <Label>Status</Label>
                          <Select value={gradeForm.status} onValueChange={(v) => setGradeForm({ ...gradeForm, status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="graded">Graded</SelectItem>
                              <SelectItem value="returned">Returned</SelectItem>
                              <SelectItem value="resubmit">Resubmit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div><Label>Feedback</Label><Textarea value={gradeForm.feedback} onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })} /></div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={grade}><CheckCircle className="w-4 h-4 mr-1" /> Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setGradingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="link" size="sm" className="mt-2" onClick={() => { setGradingId(s.id); setGradeForm({ score: s.score || 0, feedback: s.feedback || '', status: 'graded' }); }}>
                      {s.status === 'graded' ? 'Re-grade' : 'Grade'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
