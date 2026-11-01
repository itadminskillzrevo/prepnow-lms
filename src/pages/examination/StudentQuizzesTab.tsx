import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, RadioTower, Loader2, ArrowLeft, CheckCircle2, XCircle, Award, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

type Quiz = { id: string; title: string; description: string | null; passing_score: number; time_limit_minutes: number | null; max_attempts: number };
type Question = { id: string; question: string; question_type: string; options: any; points: number; order_index: number };
type Attempt = { id: string; quiz_id: string; score: number; max_score: number; passed: boolean; completed_at: string };

export default function StudentQuizzesTab() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt[]>>({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Quiz | null>(null);

  const load = async () => {
    setLoading(true);
    // RLS filters to only quizzes the user has access to
    const { data: assn } = await supabase
      .from('exam_quiz_assignments')
      .select('quiz_id, exam_quizzes(id, title, description, passing_score, time_limit_minutes, max_attempts, is_live)')
      .eq('is_active', true);

    const quizzesData: Quiz[] = [];
    const seen = new Set<string>();
    (assn ?? []).forEach((a: any) => {
      if (a.exam_quizzes && a.exam_quizzes.is_live && !seen.has(a.exam_quizzes.id)) {
        seen.add(a.exam_quizzes.id);
        quizzesData.push(a.exam_quizzes);
      }
    });
    setQuizzes(quizzesData);

    if (user && quizzesData.length > 0) {
      const { data: at } = await supabase.from('exam_quiz_attempts').select('*').eq('user_id', user.id).in('quiz_id', quizzesData.map((q) => q.id));
      const grouped: Record<string, Attempt[]> = {};
      (at ?? []).forEach((a: any) => { (grouped[a.quiz_id] = grouped[a.quiz_id] || []).push(a); });
      setAttempts(grouped);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  if (active) return <QuizAttempt quiz={active} onBack={() => { setActive(null); load(); }} />;

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (quizzes.length === 0) {
    return (
      <Card><CardContent className="p-12 text-center">
        <div className="text-6xl mb-3">🎲</div>
        <p className="text-muted-foreground">No quizzes assigned to you right now.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {quizzes.map((q) => {
        const my = attempts[q.id] ?? [];
        const best = my.reduce<Attempt | null>((b, a) => !b || a.score > b.score ? a : b, null);
        const remaining = q.max_attempts - my.length;
        return (
          <Card key={q.id} className="hover:shadow-md transition">
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">🏆</div>
                <Badge variant="default" className="bg-success/15 text-success border-success/30"><RadioTower className="w-3 h-3 mr-1" /> LIVE</Badge>
              </div>
              <div className="font-bold text-lg mb-1">{q.title}</div>
              {q.description && <div className="text-sm text-muted-foreground mb-3 line-clamp-2">{q.description}</div>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Pass {q.passing_score}%</span>
                {q.time_limit_minutes && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {q.time_limit_minutes}m</span>}
              </div>
              {best && (
                <div className={`text-xs font-bold mb-3 px-3 py-1.5 rounded-lg ${best.passed ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning-foreground'}`}>
                  Best: {best.score}/{best.max_score} {best.passed ? '✅ Passed' : '❌ Try again'}
                </div>
              )}
              <Button
                disabled={remaining <= 0}
                className="mt-auto"
                onClick={() => { if (!user) { toast.error('Please log in'); return; } setActive(q); }}
              >
                {remaining <= 0 ? 'No attempts left' : my.length > 0 ? <><RotateCcw className="w-4 h-4 mr-1" /> Re-attempt ({remaining} left)</> : 'Start Quiz →'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function QuizAttempt({ quiz, onBack }: { quiz: Quiz; onBack: () => void }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; max: number; passed: boolean; details: { qid: string; correct: string; got: string; isCorrect: boolean }[] } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('exam_quiz_questions').select('id, quiz_id, question, question_type, options, points, order_index').eq('quiz_id', quiz.id).order('order_index');
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
    const { data: corrects, error } = await supabase.rpc('check_exam_quiz_answers', { p_quiz_id: quiz.id, p_answers: answers });
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
    await supabase.from('exam_quiz_attempts').insert({
      quiz_id: quiz.id, user_id: user.id, answers, score, max_score: max, passed,
      completed_at: new Date().toISOString(),
    });
    setResult({ score, max, passed, details });
    setSubmitting(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin" /></div>;

  if (result) {
    const pct = result.max > 0 ? Math.round((result.score / result.max) * 100) : 0;
    return (
      <div className="max-w-3xl mx-auto">
        <Card className={result.passed ? 'border-success' : 'border-warning'}>
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-3">{result.passed ? '🎉' : '💪'}</div>
            <h2 className="text-3xl font-bold mb-2">{result.passed ? 'Congratulations!' : 'Keep going!'}</h2>
            <p className="text-muted-foreground mb-4">{result.passed ? 'You passed the quiz!' : 'You can try again to improve.'}</p>
            <div className="inline-flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-2xl">
              <Award className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-extrabold">{result.score} / {result.max} pts</div>
                <div className="text-sm text-muted-foreground">{pct}% • Pass at {quiz.passing_score}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4">Review</h3>
            <div className="space-y-4">
              {questions.map((q, i) => {
                const d = result.details.find((x) => x.qid === q.id);
                const ok = d?.isCorrect;
                return (
                  <div key={q.id} className={`p-4 rounded-xl border-2 ${ok ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5'}`}>
                    <div className="flex items-start gap-2">
                      {ok ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <div className="font-bold mb-2">Q{i + 1}. {q.question}</div>
                        <div className="text-sm">Your answer: <span className={ok ? 'font-semibold text-success' : 'font-semibold text-destructive'}>{d?.got || '— no answer —'}</span></div>
                        {!ok && <div className="text-sm">Correct: <span className="font-semibold text-success">{d?.correct}</span></div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="mt-4">
          <Button onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Quizzes</Button>
        </div>
      </div>
    );
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-3xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
      <Card className="mb-4">
        <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold">🏆 {quiz.title}</h2>
            <p className="text-sm text-muted-foreground">{questions.length} question{questions.length !== 1 ? 's' : ''} • Pass {quiz.passing_score}%</p>
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${timeLeft < 60 ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary'}`}>
              <Clock className="w-5 h-5" /> {fmt(timeLeft)}
            </div>
          )}
        </CardContent>
      </Card>

      {questions.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">This quiz has no questions yet.</CardContent></Card>
      ) : (
        <>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <Card key={q.id}>
                <CardContent className="p-5">
                  <div className="font-bold mb-3">Q{i + 1}. {q.question} <span className="text-xs font-normal text-muted-foreground">({q.points} pt)</span></div>
                  {q.question_type === 'short_answer' ? (
                    <Input placeholder="Type your answer…" value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                  ) : (
                    <div className="space-y-2">
                      {(Array.isArray(q.options) ? q.options : []).map((opt: string, idx: number) => (
                        <label key={idx} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${answers[q.id] === opt ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                          <input type="radio" name={q.id} checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} />
                          <span className="font-medium">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : 'Submit Quiz'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
