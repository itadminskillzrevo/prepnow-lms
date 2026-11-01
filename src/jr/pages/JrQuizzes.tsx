import React, { useEffect, useState } from 'react';
import { JrLayout } from '@/jr/components/JrLayout';
import { JrStudentLayout } from '@/jr/components/JrStudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { Trophy, Clock, RadioTower, Loader2, ArrowLeft, CheckCircle2, XCircle, Award, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

type Quiz = { id: string; title: string; description: string | null; passing_score: number; time_limit_minutes: number | null; is_live: boolean; course_id: string | null };
type Question = { id: string; question: string; question_type: string; options: any; points: number; order_index: number };
type Attempt = { id: string; score: number; max_score: number; passed: boolean; completed_at: string };

export default function JrQuizzes() {
  const { user } = useJrAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt[]>>({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Quiz | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('jr_quizzes').select('*').eq('is_live', true).order('created_at', { ascending: false });
    setQuizzes((data ?? []) as any);
    if (user && data && data.length > 0) {
      const { data: at } = await supabase.from('jr_quiz_attempts').select('*').eq('user_id', user.id).in('quiz_id', data.map((q) => q.id));
      const grouped: Record<string, Attempt[]> = {};
      (at ?? []).forEach((a: any) => { (grouped[a.quiz_id] = grouped[a.quiz_id] || []).push(a); });
      setAttempts(grouped);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  if (active) return <QuizAttempt quiz={active} onBack={() => { setActive(null); load(); }} />;

  return (
    <JrStudentLayout title="Quizzes">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold flex items-center gap-2">
          <RadioTower className="w-7 h-7 text-[hsl(var(--jr-primary))]" /> Live Quizzes by Admin
        </h1>
        <p className="text-[hsl(var(--jr-muted))] mt-1">Test what you've learned and earn points! 🏆</p>
      </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--jr-primary))]" /></div>
        ) : quizzes.length === 0 ? (
          <div className="jr-card p-12 text-center">
            <div className="text-6xl mb-3">🎲</div>
            <p className="text-[hsl(var(--jr-muted))]">No live quizzes right now — check back soon!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {quizzes.map((q) => {
              const myAttempts = attempts[q.id] ?? [];
              const best = myAttempts.reduce<Attempt | null>((best, a) => !best || a.score > best.score ? a : best, null);
              return (
                <div key={q.id} className="jr-card p-6 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--jr-accent)/0.2)] flex items-center justify-center text-3xl">🏆</div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                      <RadioTower className="w-3 h-3" /> LIVE
                    </span>
                  </div>
                  <div className="font-extrabold text-lg mb-1">{q.title}</div>
                  {q.description && <div className="text-sm text-[hsl(var(--jr-muted))] mb-3 line-clamp-2">{q.description}</div>}
                  <div className="flex items-center gap-3 text-xs text-[hsl(var(--jr-muted))] mb-3">
                    <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Pass {q.passing_score}%</span>
                    {q.time_limit_minutes && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {q.time_limit_minutes} min</span>}
                  </div>
                  {best && (
                    <div className={`text-xs font-bold mb-3 px-3 py-1.5 rounded-lg ${best.passed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      Best: {best.score}/{best.max_score} {best.passed ? '✅ Passed' : '❌ Try again'}
                    </div>
                  )}
                  <button onClick={() => { if (!user) { toast.error('Please log in to attempt'); return; } setActive(q); }} className="jr-btn mt-auto">
                    {myAttempts.length > 0 ? <><RotateCcw className="w-4 h-4" /> Re-attempt</> : <>Start Quiz →</>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
    </JrStudentLayout>
  );
}

void JrLayout;


// ============== Attempt View ==============
function QuizAttempt({ quiz, onBack }: { quiz: Quiz; onBack: () => void }) {
  const { user } = useJrAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; max: number; passed: boolean; details: { qid: string; correct: string; got: string; isCorrect: boolean }[] } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('jr_quiz_questions').select('id, quiz_id, question, question_type, options, points, order_index').eq('quiz_id', quiz.id).order('order_index');
      setQuestions((data ?? []) as any);
      setLoading(false);
    })();
  }, [quiz.id]);

  useEffect(() => {
    if (timeLeft === null || result) return;
    if (timeLeft <= 0) { void submit(); return; }
    const t = setTimeout(() => setTimeLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, result]);

  const submit = async () => {
    if (!user || submitting || result) return;
    setSubmitting(true);
    const { data: corrects, error } = await supabase.rpc('check_jr_quiz_answers', { p_quiz_id: quiz.id, p_answers: answers });
    if (error) { setSubmitting(false); return toast.error(error.message); }
    let score = 0, max = 0;
    const details: any[] = [];
    questions.forEach((q) => {
      max += q.points;
      const row = (corrects ?? []).find((r: any) => r.question_id === q.id);
      const isCorrect = !!row?.is_correct;
      if (isCorrect) score += q.points;
      details.push({ qid: q.id, correct: row?.correct_answer ?? '', got: answers[q.id] ?? '', isCorrect });
    });
    const passed = max > 0 && (score / max) * 100 >= quiz.passing_score;
    await supabase.from('jr_quiz_attempts').insert({
      quiz_id: quiz.id, user_id: user.id, answers, score, max_score: max, passed,
      completed_at: new Date().toISOString(),
    });
    setResult({ score, max, passed, details });
    setSubmitting(false);
  };

  if (loading) return <JrLayout><div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin" /></div></JrLayout>;

  if (result) {
    const pct = result.max > 0 ? Math.round((result.score / result.max) * 100) : 0;
    return (
      <JrLayout>
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className={`jr-card p-8 text-center mb-6 ${result.passed ? 'border-green-300' : 'border-orange-300'}`}>
            <div className="text-6xl mb-3">{result.passed ? '🎉' : '💪'}</div>
            <h1 className="text-3xl font-extrabold mb-2">{result.passed ? 'Congratulations!' : 'Keep going!'}</h1>
            <p className="text-[hsl(var(--jr-muted))] mb-4">{result.passed ? 'You passed the quiz!' : 'You can try again to improve your score.'}</p>
            <div className="inline-flex items-center gap-3 bg-[hsl(var(--jr-primary)/0.08)] px-6 py-3 rounded-2xl">
              <Award className="w-8 h-8 text-[hsl(var(--jr-primary))]" />
              <div>
                <div className="text-2xl font-extrabold">{result.score} / {result.max} points</div>
                <div className="text-sm text-[hsl(var(--jr-muted))]">{pct}% • Pass at {quiz.passing_score}%</div>
              </div>
            </div>
          </div>

          <div className="jr-card p-6 mb-6">
            <h2 className="text-xl font-extrabold mb-4">Review your answers</h2>
            <div className="space-y-4">
              {questions.map((q, i) => {
                const d = result.details.find((x) => x.qid === q.id);
                const ok = d?.isCorrect;
                return (
                  <div key={q.id} className={`p-4 rounded-xl border-2 ${ok ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                    <div className="flex items-start gap-2">
                      {ok ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <div className="font-bold mb-2">Q{i + 1}. {q.question}</div>
                        <div className="text-sm">Your answer: <span className={ok ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>{d?.got || '— no answer —'}</span></div>
                        {!ok && <div className="text-sm">Correct answer: <span className="font-semibold text-green-700">{d?.correct}</span></div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onBack} className="jr-btn"><ArrowLeft className="w-4 h-4" /> Back to Quizzes</button>
          </div>
        </div>
      </JrLayout>
    );
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <JrLayout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--jr-primary))] mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="jr-card p-6 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">🏆 {quiz.title}</h1>
            <p className="text-sm text-[hsl(var(--jr-muted))]">{questions.length} question{questions.length !== 1 ? 's' : ''} • Pass at {quiz.passing_score}%</p>
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-700' : 'bg-[hsl(var(--jr-primary)/0.1)] text-[hsl(var(--jr-primary))]'}`}>
              <Clock className="w-5 h-5" /> {fmt(timeLeft)}
            </div>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="jr-card p-10 text-center">
            <p className="text-[hsl(var(--jr-muted))]">This quiz has no questions yet.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={q.id} className="jr-card p-5">
                  <div className="font-bold mb-3">Q{i + 1}. {q.question} <span className="text-xs font-normal text-[hsl(var(--jr-muted))]">({q.points} pt)</span></div>
                  {q.question_type === 'short_answer' ? (
                    <input className="jr-input" placeholder="Type your answer…" value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                  ) : (
                    <div className="space-y-2">
                      {(Array.isArray(q.options) ? q.options : []).map((opt: string, idx: number) => (
                        <label key={idx} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${answers[q.id] === opt ? 'border-[hsl(var(--jr-primary))] bg-[hsl(var(--jr-primary)/0.06)]' : 'border-[hsl(var(--jr-border))] hover:border-[hsl(var(--jr-primary)/0.4)]'}`}>
                          <input type="radio" name={q.id} checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} />
                          <span className="font-medium">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={submit} disabled={submitting} className="jr-btn">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Submit Quiz</>}
              </button>
            </div>
          </>
        )}
      </div>
    </JrLayout>
  );
}
