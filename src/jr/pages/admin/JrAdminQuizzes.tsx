import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { Plus, Trash2, Loader2, Pencil, X, ListChecks, Radio, RadioTower, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

type Quiz = {
  id: string; title: string; description: string | null; course_id: string | null;
  passing_score: number; time_limit_minutes: number | null; is_live: boolean;
  jr_courses?: { title: string } | null;
};
type Question = {
  id: string; quiz_id: string; question: string; question_type: string;
  options: any; correct_answer: string; points: number; order_index: number;
};

export default function JrAdminQuizzes() {
  const { user } = useJrAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorQuiz, setEditorQuiz] = useState<Quiz | null>(null); // when set → questions editor view

  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [qForm, setQForm] = useState({ title: '', description: '', course_id: '', passing_score: 70, time_limit_minutes: '' });

  const load = async () => {
    setLoading(true);
    const [{ data: qs }, { data: cs }] = await Promise.all([
      supabase.from('jr_quizzes').select('*, jr_courses(title)').order('created_at', { ascending: false }),
      supabase.from('jr_courses').select('id, title'),
    ]);
    setQuizzes((qs ?? []) as any);
    setCourses(cs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingQuiz(null);
    setQForm({ title: '', description: '', course_id: '', passing_score: 70, time_limit_minutes: '' });
    setShowQuizForm(true);
  };
  const openEdit = (q: Quiz) => {
    setEditingQuiz(q);
    setQForm({
      title: q.title, description: q.description ?? '',
      course_id: q.course_id ?? '',
      passing_score: q.passing_score ?? 70,
      time_limit_minutes: q.time_limit_minutes?.toString() ?? '',
    });
    setShowQuizForm(true);
  };

  const saveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qForm.title.trim()) return toast.error('Title is required');
    const payload: any = {
      title: qForm.title.trim(),
      description: qForm.description || null,
      course_id: qForm.course_id || null,
      passing_score: Number(qForm.passing_score) || 70,
      time_limit_minutes: qForm.time_limit_minutes ? Number(qForm.time_limit_minutes) : null,
    };
    if (editingQuiz) {
      const { error } = await supabase.from('jr_quizzes').update(payload).eq('id', editingQuiz.id);
      if (error) return toast.error(error.message);
      toast.success('Quiz updated');
    } else {
      const { error } = await supabase.from('jr_quizzes').insert({ ...payload, created_by: user?.id, is_live: false });
      if (error) return toast.error(error.message);
      toast.success('Quiz created');
    }
    setShowQuizForm(false); load();
  };

  const removeQuiz = async (id: string) => {
    if (!confirm('Delete this quiz and all its questions?')) return;
    const { error } = await supabase.from('jr_quizzes').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Quiz deleted'); load();
  };

  const toggleLive = async (q: Quiz) => {
    const { error } = await supabase.from('jr_quizzes').update({ is_live: !q.is_live }).eq('id', q.id);
    if (error) return toast.error(error.message);
    toast.success(!q.is_live ? '✅ Quiz is now LIVE for students' : 'Quiz unpublished');
    load();
  };

  if (editorQuiz) {
    return <QuestionsEditor quiz={editorQuiz} onBack={() => { setEditorQuiz(null); load(); }} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold flex items-center gap-2">🏆 Quizzes</h1>
        <button onClick={openCreate} className="jr-btn"><Plus className="w-4 h-4" /> New Quiz</button>
      </div>

      {showQuizForm && (
        <form onSubmit={saveQuiz} className="jr-card p-5 mb-6 grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 flex items-center justify-between">
            <h2 className="text-xl font-extrabold">{editingQuiz ? 'Edit Quiz' : 'Create Quiz'}</h2>
            <button type="button" onClick={() => setShowQuizForm(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
          <div className="sm:col-span-2"><label className="text-xs font-bold">Title *</label>
            <input required className="jr-input" value={qForm.title} onChange={(e) => setQForm({ ...qForm, title: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="text-xs font-bold">Description</label>
            <textarea className="jr-input" rows={2} value={qForm.description} onChange={(e) => setQForm({ ...qForm, description: e.target.value })} /></div>
          <div><label className="text-xs font-bold">Linked Course (optional)</label>
            <select className="jr-input" value={qForm.course_id} onChange={(e) => setQForm({ ...qForm, course_id: e.target.value })}>
              <option value="">— Standalone quiz —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select></div>
          <div><label className="text-xs font-bold">Passing Score (%)</label>
            <input type="number" min={0} max={100} className="jr-input" value={qForm.passing_score} onChange={(e) => setQForm({ ...qForm, passing_score: Number(e.target.value) })} /></div>
          <div><label className="text-xs font-bold">Time Limit (minutes, optional)</label>
            <input type="number" min={0} className="jr-input" value={qForm.time_limit_minutes} onChange={(e) => setQForm({ ...qForm, time_limit_minutes: e.target.value })} /></div>
          <div className="sm:col-span-2 flex gap-2">
            <button className="jr-btn"><Save className="w-4 h-4" /> {editingQuiz ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setShowQuizForm(false)} className="jr-btn jr-btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--jr-primary))]" /></div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map((q) => (
            <div key={q.id} className="jr-card p-5 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="text-3xl">🏆</div>
                {q.is_live ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                    <RadioTower className="w-3 h-3" /> LIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                    Draft
                  </span>
                )}
              </div>
              <div className="font-extrabold mb-1">{q.title}</div>
              <div className="text-xs text-[hsl(var(--jr-muted))] mb-3">
                {q.jr_courses?.title ?? 'Standalone'} • Pass {q.passing_score}%
                {q.time_limit_minutes ? ` • ${q.time_limit_minutes} min` : ''}
              </div>
              {q.description && <p className="text-sm text-[hsl(var(--jr-muted))] mb-3 line-clamp-2">{q.description}</p>}
              <div className="mt-auto flex flex-wrap gap-2">
                <button onClick={() => setEditorQuiz(q)} className="jr-btn !py-1.5 !px-3 text-xs"><ListChecks className="w-3.5 h-3.5" /> Questions</button>
                <button onClick={() => toggleLive(q)} className="jr-btn jr-btn-secondary !py-1.5 !px-3 text-xs">
                  <Radio className="w-3.5 h-3.5" /> {q.is_live ? 'Unpublish' : 'Mark Live'}
                </button>
                <button onClick={() => openEdit(q)} className="p-2 rounded-full hover:bg-[hsl(var(--jr-primary)/0.1)]"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => removeQuiz(q.id)} className="p-2 rounded-full hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {quizzes.length === 0 && <div className="col-span-full text-center text-[hsl(var(--jr-muted))] py-12">No quizzes yet. Click "New Quiz" to create one!</div>}
        </div>
      )}
    </div>
  );
}

// ====================== Questions Editor ======================
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
    const { data } = await supabase.from('jr_quiz_questions').select('*').eq('quiz_id', quiz.id).order('order_index');
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
      const { error } = await supabase.from('jr_quiz_questions').update(payload).eq('id', editing.id);
      if (error) return toast.error(error.message);
      toast.success('Question updated');
    } else {
      const { error } = await supabase.from('jr_quiz_questions').insert(payload);
      if (error) return toast.error(error.message);
      toast.success('Question added');
    }
    setShowForm(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    const { error } = await supabase.from('jr_quiz_questions').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--jr-primary))] mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Quizzes
      </button>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">📝 {quiz.title}</h1>
          <p className="text-sm text-[hsl(var(--jr-muted))]">{questions.length} question{questions.length !== 1 ? 's' : ''}{quiz.is_live && ' • 🔴 LIVE'}</p>
        </div>
        <button onClick={openAdd} className="jr-btn"><Plus className="w-4 h-4" /> Add Question</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="jr-card p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">{editing ? 'Edit Question' : 'Add Question'}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
          <div><label className="text-xs font-bold">Question *</label>
            <textarea required rows={2} className="jr-input" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs font-bold">Type</label>
              <select className="jr-input" value={form.question_type}
                onChange={(e) => {
                  const t = e.target.value;
                  setForm({ ...form, question_type: t,
                    options: t === 'true_false' ? ['True', 'False'] : t === 'short_answer' ? [] : ['', '', '', ''],
                    correct_answer: '' });
                }}>
                <option value="single_choice">Single Choice (MCQ)</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
              </select></div>
            <div><label className="text-xs font-bold">Points</label>
              <input type="number" min={1} className="jr-input" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} /></div>
          </div>

          {form.question_type === 'short_answer' ? (
            <div><label className="text-xs font-bold">Correct Answer (case-insensitive)</label>
              <input className="jr-input" value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} placeholder="Expected answer text" /></div>
          ) : (
            <div>
              <label className="text-xs font-bold">Options (select the correct one)</label>
              <div className="space-y-2 mt-1">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={form.correct_answer === opt && opt !== ''} onChange={() => setForm({ ...form, correct_answer: opt })} />
                    <input className="jr-input flex-1" value={opt} disabled={form.question_type === 'true_false'}
                      onChange={(e) => {
                        const next = [...form.options]; next[i] = e.target.value;
                        const newCorrect = form.correct_answer === opt ? e.target.value : form.correct_answer;
                        setForm({ ...form, options: next, correct_answer: newCorrect });
                      }} placeholder={`Option ${i + 1}`} />
                    {form.question_type === 'single_choice' && form.options.length > 2 && (
                      <button type="button" onClick={() => {
                        const next = form.options.filter((_, idx) => idx !== i);
                        setForm({ ...form, options: next, correct_answer: form.correct_answer === opt ? '' : form.correct_answer });
                      }} className="p-2 rounded hover:bg-red-50 text-red-500"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
                {form.question_type === 'single_choice' && form.options.length < 6 && (
                  <button type="button" onClick={() => setForm({ ...form, options: [...form.options, ''] })} className="text-xs font-bold text-[hsl(var(--jr-primary))]">+ Add option</button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button className="jr-btn"><Save className="w-4 h-4" /> {editing ? 'Update' : 'Add'} Question</button>
            <button type="button" onClick={() => setShowForm(false)} className="jr-btn jr-btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div> : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="jr-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[hsl(var(--jr-muted))] uppercase tracking-wider mb-1">Q{i + 1} • {q.question_type.replace('_', ' ')} • {q.points} pt</div>
                  <div className="font-bold mb-2">{q.question}</div>
                  {q.question_type !== 'short_answer' && Array.isArray(q.options) && (
                    <ul className="text-sm space-y-0.5">
                      {q.options.map((o: string, idx: number) => (
                        <li key={idx} className={o === q.correct_answer ? 'text-green-700 font-semibold' : 'text-[hsl(var(--jr-muted))]'}>
                          {o === q.correct_answer ? '✅' : '◦'} {o}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.question_type === 'short_answer' && (
                    <div className="text-sm text-green-700 font-semibold">✅ {q.correct_answer}</div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(q)} className="p-2 rounded hover:bg-[hsl(var(--jr-primary)/0.1)]"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(q.id)} className="p-2 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {questions.length === 0 && <div className="text-center text-[hsl(var(--jr-muted))] py-12">No questions yet. Add your first question!</div>}
        </div>
      )}
    </div>
  );
}
