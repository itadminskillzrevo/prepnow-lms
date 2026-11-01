import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Calendar, Upload, CheckCircle, Clock, AlertCircle, FileText, X, Loader2, Download, Info } from 'lucide-react';
import { toast } from 'sonner';

const MAX_FILE_MB = 5;
const ALLOWED = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/png', 'image/jpeg'];

export default function StudentAssignmentsTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<Record<string, File | null>>({});
  const [text, setText] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    // RLS-filtered via exam_task_assignments
    const { data: tasks } = await supabase
      .from('exam_task_assignments')
      .select('assignment_id, exam_assignments(*)')
      .eq('is_active', true);
    const seen = new Set<string>();
    const assignments: any[] = [];
    (tasks ?? []).forEach((t: any) => {
      if (t.exam_assignments && t.exam_assignments.is_live && !seen.has(t.exam_assignments.id)) {
        seen.add(t.exam_assignments.id);
        assignments.push(t.exam_assignments);
      }
    });
    const { data: subs } = await supabase.from('exam_assignment_submissions').select('*').eq('user_id', user.id);
    setItems(assignments);
    setSubmissions(subs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const getSubmission = (id: string) => submissions.find((s) => s.assignment_id === id);
  const getStatus = (a: any) => {
    const s = getSubmission(a.id);
    if (s?.status === 'graded') return 'graded';
    if (s) return 'submitted';
    if (a.due_date && new Date(a.due_date) < new Date()) return 'overdue';
    return 'pending';
  };

  const onFile = (id: string, f: File | null) => {
    if (f && f.size > MAX_FILE_MB * 1024 * 1024) return toast.error(`File must be under ${MAX_FILE_MB}MB`);
    if (f && !ALLOWED.includes(f.type)) return toast.error('PDF/DOC/DOCX/TXT/PNG/JPG only');
    setSelectedFile((p) => ({ ...p, [id]: f }));
  };

  const submit = async (id: string) => {
    if (!user) return;
    const f = selectedFile[id];
    const content = text[id];
    if (!f && !content?.trim()) return toast.error('Upload a file or enter text');

    setSubmitting(id);
    try {
      let fileUrl: string | null = null, fileName: string | null = null;
      if (f) {
        const path = `${user.id}/${id}/${f.name}`;
        const { error } = await supabase.storage.from('assignments').upload(path, f, { upsert: true });
        if (error) throw error;
        const { data } = await supabase.storage.from('assignments').createSignedUrl(path, 60 * 60 * 24 * 365);
        fileUrl = data?.signedUrl ?? null;
        fileName = f.name;
      }
      const existing = getSubmission(id);
      if (existing) {
        const { error } = await supabase.from('exam_assignment_submissions').update({
          content: content?.trim() || null, file_url: fileUrl, file_name: fileName,
          status: 'pending', submitted_at: new Date().toISOString(),
        }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('exam_assignment_submissions').insert({
          assignment_id: id, user_id: user.id, content: content?.trim() || null,
          file_url: fileUrl, file_name: fileName, status: 'pending',
        });
        if (error) throw error;
      }
      toast.success('Submitted! 🎉');
      setSelectedFile((p) => ({ ...p, [id]: null }));
      setText((p) => ({ ...p, [id]: '' }));
      setExpandedId(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Submit failed');
    } finally {
      setSubmitting(null);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
      graded: { label: 'Graded', cls: 'bg-success/15 text-success', icon: <CheckCircle className="w-3.5 h-3.5" /> },
      submitted: { label: 'Submitted', cls: 'bg-primary/15 text-primary', icon: <Clock className="w-3.5 h-3.5" /> },
      overdue: { label: 'Overdue', cls: 'bg-destructive/15 text-destructive', icon: <AlertCircle className="w-3.5 h-3.5" /> },
      pending: { label: 'Pending', cls: 'bg-warning/15 text-warning-foreground', icon: <Clock className="w-3.5 h-3.5" /> },
    };
    const x = map[s] || map.pending;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${x.cls}`}>{x.icon} {x.label}</span>;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (items.length === 0) {
    return (
      <Card><CardContent className="p-12 text-center">
        <div className="text-6xl mb-3">📭</div>
        <p className="text-muted-foreground">No assignments assigned to you yet.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((a) => {
        const status = getStatus(a);
        const sub = getSubmission(a.id);
        const isExpanded = expandedId === a.id;

        return (
          <Card key={a.id}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-bold text-lg">{a.title}</div>
                    {statusBadge(status)}
                  </div>
                  {a.description && <div className="text-sm text-muted-foreground mt-1">{a.description}</div>}

                  {a.instructions && (
                    <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-1 text-xs font-bold text-primary mb-1"><Info className="w-3.5 h-3.5" /> Instructions</div>
                      <div className="text-sm whitespace-pre-wrap">{a.instructions}</div>
                    </div>
                  )}

                  {a.file_url && (
                    <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
                      <Download className="w-4 h-4" /> {a.file_name || 'Assignment File'}
                    </a>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {a.due_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Due {new Date(a.due_date).toLocaleDateString()}</span>}
                    <span>Max: {a.max_score || 100}</span>
                  </div>

                  {sub?.status === 'graded' && (
                    <div className="mt-3 p-3 rounded-xl bg-success/10 border border-success/30">
                      <div className="font-bold text-success">Score: {sub.score}/{a.max_score || 100}</div>
                      {sub.feedback && <div className="text-sm text-success/80 mt-1">{sub.feedback}</div>}
                    </div>
                  )}

                  {sub?.file_url && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{sub.file_name || 'View file'}</a>
                    </div>
                  )}

                  {status !== 'graded' && (
                    <div className="mt-3">
                      {!isExpanded ? (
                        <Button size="sm" onClick={() => setExpandedId(a.id)}><Upload className="w-4 h-4 mr-1" /> {sub ? 'Resubmit' : 'Submit'}</Button>
                      ) : (
                        <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border">
                          <div>
                            <label className="text-xs font-bold block mb-1">Upload Document (max {MAX_FILE_MB}MB)</label>
                            <div className="flex items-center gap-2">
                              <Input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                                onChange={(e) => onFile(a.id, e.target.files?.[0] || null)} />
                              {selectedFile[a.id] && <Button size="icon" variant="ghost" onClick={() => onFile(a.id, null)}><X className="w-4 h-4" /></Button>}
                            </div>
                            {selectedFile[a.id] && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {selectedFile[a.id]!.name} ({(selectedFile[a.id]!.size / 1024 / 1024).toFixed(2)} MB)
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-xs font-bold block mb-1">Or write your answer</label>
                            <Textarea rows={3} placeholder="Type your answer here…" value={text[a.id] || ''} onChange={(e) => setText((p) => ({ ...p, [a.id]: e.target.value }))} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" disabled={submitting === a.id} onClick={() => submit(a.id)}>
                              {submitting === a.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                              {submitting === a.id ? 'Submitting…' : 'Submit'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setExpandedId(null)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
