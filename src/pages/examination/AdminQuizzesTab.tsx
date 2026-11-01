import React, { useEffect, useState } from 'react';
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
import { Plus, Trash2, Pencil, ListChecks, ArrowLeft, Save, X, Loader2, Radio, Eye } from 'lucide-react';
import { toast } from 'sonner';

type Quiz = {
  id: string; title: string; description: string | null;
  passing_score: number; time_limit_minutes: number | null;
  max_attempts: number; created_by: string; is_live?: boolean;
};
type Assignment = {
  id: string; quiz_id: string; assignment_type: string;
  target_id: string | null; is_active: boolean; due_date: string | null;
};
type Question = {
  id: string; quiz_id: string; question: string; question_type: string;
  options: any; correct_answer: string; points: number; order_index: number;
};

export default function AdminQuizzesTab() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, Assignment[]>>({});
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorQuiz, setEditorQuiz] = useState<Quiz | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', passing_score: 70, time_limit_minutes: '',
    max_attempts: 3,
    assign_type: 'all', // all | batch | course
    target_id: '',
    due_date: '',
  });

  const load = async () => {
    setLoading(true);
    const [{ data: qs }, { data: assn }, { data: bs }, { data: cs }] = await Promise.all([
      supabase.from('exam_quizzes').select('*').order('created_at', { ascending: false }),
      supabase.from('exam_quiz_assignments').select('*'),
      supabase.from('batches').select('id, name, course_id').order('name'),
      supabase.from('courses').select('id, title').order('title'),
    ]);
    setQuizzes((qs ?? []) as any);
    const map: Record<string, Assignment[]> = {};
    (assn ?? []).forEach((a: any) => { (map[a.quiz_id] = map[a.quiz_id] || []).push(a); });
    setAssignmentsMap(map);
    setBatches(bs ?? []);
    setCourses(cs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingQuiz(null);
    setForm({ title: '', description: '', passing_score: 70, time_limit_minutes: '', max_attempts: 3, assign_type: 'all', target_id: '', due_date: '' });
    setShowForm(true);
  };
  const openEdit = (q: Quiz) => {
    setEditingQuiz(q);
    const a = (assignmentsMap[q.id] || [])[0];
    setForm({
      title: q.title, description: q.description ?? '',
      passing_score: q.passing_score ?? 70,
      time_limit_minutes: q.time_limit_minutes?.toString() ?? '',
      max_attempts: q.max_attempts ?? 3,
      assign_type: a?.assignment_type ?? 'all',
      target_id: a?.target_id ?? '',
      due_date: a?.due_date ? a.due_date.slice(0, 16) : '',
    });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (form.assign_type !== 'all' && !form.target_id) return toast.error(`Please select a ${form.assign_type}`);

    const quizPayload: any = {
      title: form.title.trim(),
      description: form.description || null,
      passing_score: Number(form.passing_score) || 70,
      time_limit_minutes: form.time_limit_minutes ? Number(form.time_limit_minutes) : null,
      max_attempts: Number(form.max_attempts) || 3,
    };
    let quizId = editingQuiz?.id;
    if (editingQuiz) {
      const { error } = await supabase.from('exam_quizzes').update(quizPayload).eq('id', editingQuiz.id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from('exam_quizzes').insert({ ...quizPayload, created_by: user!.id }).select('id').single();
      if (error) return toast.error(error.message);
      quizId = data.id;
    }

    await supabase.from('exam_quiz_assignments').delete().eq('quiz_id', quizId!);
    const assnPayload: any = {
      quiz_id: quizId,
      assignment_type: form.assign_type,
      target_id: form.assign_type === 'all' ? null : form.target_id,
      due_date: form.due_date || null,
      is_active: true,
      created_by: user!.id,
    };
    const { error: aErr } = await supabase.from('exam_quiz_assignments').insert(assnPayload);
    if (aErr) return toast.error(aErr.message);

    toast.success(editingQuiz ? 'Quiz updated' : 'Quiz created');
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this quiz and all its questions?')) return;
    await supabase.from('exam_quiz_assignments').delete().eq('quiz_id', id);
    await supabase.from('exam_quiz_questions').delete().eq('quiz_id', id);
    const { error } = await supabase.from('exam_quizzes').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Quiz deleted');
    load();
  };

  const toggleLive = async (q: Quiz) => {
    const next = !q.is_live;
    const { error } = await supabase.from('exam_quizzes').update({ is_live: next } as any).eq('id', q.id);
    if (error) return toast.error(error.message);
    toast.success(next ? 'Quiz is now LIVE 🎉' : 'Quiz set to draft');
    load();
  };

  const [attemptsOpenId, setAttemptsOpenId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const viewAttempts = async (q: Quiz) => {
    setAttemptsOpenId(q.id);
    const { data } = await supabase.from('exam_quiz_attempts').select('*').eq('quiz_id', q.id).order('completed_at', { ascending: false });
    const userIds = [...new Set((data ?? []).map((a: any) => a.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds)
      : { data: [] as any[] };
    const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setAttempts((data ?? []).map((a: any) => ({ ...a, profile: map.get(a.user_id) })));
  };

  const targetLabel = (a?: Assignment) => {
    if (!a) return 'Unassigned';
    if (a.assignment_type === 'all') return 'All students';
    if (a.assignment_type === 'batch') return `Batch: ${batches.find(b => b.id === a.target_id)?.name ?? '—'}`;
    if (a.assignment_type === 'course') return `Course: ${courses.find(c => c.id === a.target_id)?.title ?? '—'}`;
    return a.assignment_type;
  };

  if (editorQuiz) return <QuestionsEditor quiz={editorQuiz} onBack={() => { setEditorQuiz(null); load(); }} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">All Quizzes</h2>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Quiz</Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingQuiz ? 'Edit Quiz' : 'Create Quiz'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Passing %</Label>
                <Input type="number" min={0} max={100} value={form.passing_score}
                  onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Time (min)</Label>
                <Input type="number" min={0} value={form.time_limit_minutes}
                  onChange={(e) => setForm({ ...form, time_limit_minutes: e.target.value })} />
              </div>
              <div>
                <Label>Max attempts</Label>
                <Input type="number" min={1} value={form.max_attempts}
                  onChange={(e) => setForm({ ...form, max_attempts: Number(e.target.value) })} />
              </div>
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
                  <SelectContent>
                    {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {form.assign_type === 'course' && (
                <Select value={form.target_id} onValueChange={(v) => setForm({ ...form, target_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select course…" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <div>
                <Label>Due date (optional)</Label>
                <Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit"><Save className="w-4 h-4 mr-2" />{editingQuiz ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((q) => {
            const a = (assignmentsMap[q.id] || [])[0];
            return (
              <Card key={q.id} className="hover:shadow-md transition">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="text-3xl">🏆</div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge variant={q.is_live ? 'default' : 'secondary'} className={q.is_live ? 'bg-success/15 text-success border-success/30' : ''}>
                        {q.is_live ? '🟢 LIVE' : 'DRAFT'}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">{targetLabel(a)}</Badge>
                    </div>
                  </div>
                  <div className="font-semibold mb-1">{q.title}</div>
                  <div className="text-xs text-muted-foreground mb-3">
                    Pass {q.passing_score}%
                    {q.time_limit_minutes ? ` • ${q.time_limit_minutes} min` : ''}
                    {` • ${q.max_attempts} attempts`}
                  </div>
                  {q.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{q.description}</p>}
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setEditorQuiz(q)}><ListChecks className="w-3.5 h-3.5 mr-1" /> Questions</Button>
                    <Button size="sm" variant={q.is_live ? 'outline' : 'default'} onClick={() => toggleLive(q)}>
                      <Radio className="w-3.5 h-3.5 mr-1" /> {q.is_live ? 'Set Draft' : 'Mark Live'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => viewAttempts(q)}><Eye className="w-3.5 h-3.5 mr-1" /> Attempts</Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(q)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(q.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {quizzes.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No quizzes yet. Click "New Quiz" to create one!</div>}
        </div>
      )}

      <Dialog open={!!attemptsOpenId} onOpenChange={(o) => !o && setAttemptsOpenId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Attempts ({attempts.length})</DialogTitle></DialogHeader>
          {attempts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No attempts yet</div>
          ) : (
            <div className="space-y-2">
              {attempts.map((a: any) => {
                const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0;
                return (
                  <div key={a.id} className="border rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold">{a.profile?.full_name || a.profile?.email || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{a.completed_at ? new Date(a.completed_at).toLocaleString() : '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{a.score}/{a.max_score} <span className="text-xs text-muted-foreground">({pct}%)</span></div>
                      <Badge variant={a.passed ? 'default' : 'secondary'} className={a.passed ? 'bg-success/15 text-success border-success/30' : 'bg-warning/15 text-warning-foreground'}>
                        {a.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionsEditor({ quiz, onBack }: { quiz: Quiz; onBack: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    question: '', question_type: 'single_choice',
    options: ['', '', '', ''], correct_answer: '', points: 1,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('exam_quiz_questions').select('*').eq('quiz_id', quiz.id).order('order_index');
    setQuestions((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [quiz.id]);

  const openAdd = () => {
    setEditing(null);
    setForm({ question: '', question_type: 'single_choice', options: ['', '', '', ''], correct_answer: '', points: 1 });
    setShowForm(true);
  };
  const openEdit = (q: Question) => {
    setEditing(q);
    const opts = Array.isArray(q.options) ? q.options : (q.options?.choices ?? ['', '', '', '']);
    setForm({
      question: q.question,
      question_type: q.question_type || 'single_choice',
      options: q.question_type === 'true_false' ? ['True', 'False'] : (opts.length ? opts : ['', '', '', '']),
      correct_answer: q.correct_answer ?? '',
      points: q.points ?? 1,
    });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question.trim()) return toast.error('Question is required');
    if (!form.correct_answer.trim()) return toast.error('Please select the correct answer');
    let opts = form.options.map((o) => o.trim()).filter(Boolean);
    if (form.question_type === 'true_false') opts = ['True', 'False'];
    if (form.question_type !== 'short_answer' && opts.length < 2) return toast.error('Provide at least 2 options');

    const payload: any = {
      quiz_id: quiz.id,
      question: form.question.trim(),
      question_type: form.question_type,
      options: form.question_type === 'short_answer' ? [] : opts,
      correct_answer: form.correct_answer.trim(),
      points: Number(form.points) || 1,
      order_index: editing ? editing.order_index : questions.length,
    };
    if (editing) {
      const { error } = await supabase.from('exam_quiz_questions').update(payload).eq('id', editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from('exam_quiz_questions').insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success(editing ? 'Question updated' : 'Question added');
    setShowForm(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    const { error } = await supabase.from('exam_quiz_questions').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Quizzes</Button>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">📝 {quiz.title}</h2>
          <p className="text-sm text-muted-foreground">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add Question</Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Question' : 'Add Question'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>Question *</Label>
              <Textarea required rows={2} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.question_type} onValueChange={(v) => {
                  setForm({ ...form, question_type: v,
                    options: v === 'true_false' ? ['True', 'False'] : v === 'short_answer' ? [] : ['', '', '', ''],
                    correct_answer: '' });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_choice">Single Choice (MCQ)</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Points</Label>
                <Input type="number" min={1} value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
              </div>
            </div>

            {form.question_type === 'short_answer' ? (
              <div>
                <Label>Correct Answer (case-insensitive)</Label>
                <Input value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} placeholder="Expected answer text" />
              </div>
            ) : (
              <div>
                <Label>Options (select the correct one)</Label>
                <div className="space-y-2 mt-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correct" checked={form.correct_answer === opt && opt !== ''} onChange={() => setForm({ ...form, correct_answer: opt })} />
                      <Input className="flex-1" value={opt} disabled={form.question_type === 'true_false'}
                        onChange={(e) => {
                          const next = [...form.options]; next[i] = e.target.value;
                          const newCorrect = form.correct_answer === opt ? e.target.value : form.correct_answer;
                          setForm({ ...form, options: next, correct_answer: newCorrect });
                        }} placeholder={`Option ${i + 1}`} />
                      {form.question_type === 'single_choice' && form.options.length > 2 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                          const next = form.options.filter((_, idx) => idx !== i);
                          setForm({ ...form, options: next, correct_answer: form.correct_answer === opt ? '' : form.correct_answer });
                        }} className="text-destructive"><X className="w-4 h-4" /></Button>
                      )}
                    </div>
                  ))}
                  {form.question_type === 'single_choice' && form.options.length < 6 && (
                    <Button type="button" variant="link" size="sm" onClick={() => setForm({ ...form, options: [...form.options, ''] })}>+ Add option</Button>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit"><Save className="w-4 h-4 mr-2" /> {editing ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Q{i + 1} • {q.question_type.replace('_', ' ')} • {q.points} pt
                    </div>
                    <div className="font-bold mb-2">{q.question}</div>
                    {q.question_type !== 'short_answer' && Array.isArray(q.options) && (
                      <ul className="text-sm space-y-0.5">
                        {q.options.map((o: string, idx: number) => (
                          <li key={idx} className={o === q.correct_answer ? 'text-success font-semibold' : 'text-muted-foreground'}>
                            {o === q.correct_answer ? '✅' : '◦'} {o}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.question_type === 'short_answer' && (
                      <div className="text-sm text-success font-semibold">✅ {q.correct_answer}</div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(q)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(q.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {questions.length === 0 && <div className="text-center text-muted-foreground py-12">No questions yet.</div>}
        </div>
      )}
    </div>
  );
}
