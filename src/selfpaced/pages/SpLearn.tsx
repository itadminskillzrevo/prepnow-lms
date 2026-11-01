import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { downloadSpInvoice } from '@/selfpaced/lib/spInvoice';
import { CheckCircle2, PlayCircle, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { toast } from 'sonner';

const SpLearn: React.FC = () => {
  const { courseId } = useParams();
  const nav = useNavigate();
  const { user, profile } = useSpAuth();
  const [course, setCourse] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [enrolled, setEnrolled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || !courseId) return;
    (async () => {
      const { data: enr } = await supabase.from('selfpaced_enrollments').select('*').eq('user_id', user.id).eq('course_id', courseId).maybeSingle();
      setEnrolled(!!enr);
      setEnrollment(enr);
      if (!enr) return;
      const [{ data: c }, { data: mods }] = await Promise.all([
        supabase.from('selfpaced_courses').select('*').eq('id', courseId).maybeSingle(),
        supabase.from('selfpaced_modules').select('*, selfpaced_sub_modules(*, selfpaced_lessons(*)), selfpaced_lessons(*)').eq('course_id', courseId).order('order_index'),
      ]);
      setCourse(c); setModules(mods ?? []);
      const { data: prog } = await supabase.from('selfpaced_lesson_progress').select('lesson_id,is_completed').eq('user_id', user.id);
      const map: Record<string, boolean> = {};
      (prog ?? []).forEach((p: any) => { map[p.lesson_id] = p.is_completed; });
      setProgress(map);
      // Resume: prefer last_watched_lesson_id, else first incomplete, else first
      const flat = flatLessons(mods ?? []);
      if (flat.length) {
        const last = (enr as any).last_watched_lesson_id ? flat.find((l: any) => l.id === (enr as any).last_watched_lesson_id) : null;
        const firstIncomplete = flat.find((l: any) => !map[l.id]);
        setActiveLesson(last || firstIncomplete || flat[0]);
      }
    })();
  }, [user?.id, courseId]);

  const flatLessons = (mods: any[]) => {
    const out: any[] = [];
    mods.forEach(m => {
      (m.selfpaced_lessons ?? []).slice().sort((a: any, b: any) => a.order_index - b.order_index).forEach((l: any) => out.push(l));
      (m.selfpaced_sub_modules ?? []).forEach((sm: any) => {
        (sm.selfpaced_lessons ?? []).slice().sort((a: any, b: any) => a.order_index - b.order_index).forEach((l: any) => out.push(l));
      });
    });
    return out;
  };

  const allLessons = useMemo(() => flatLessons(modules), [modules]);
  const completedCount = allLessons.filter(l => progress[l.id]).length;
  const percent = allLessons.length ? Math.round((completedCount / allLessons.length) * 100) : 0;
  const currentIdx = activeLesson ? allLessons.findIndex(l => l.id === activeLesson.id) : -1;

  // Persist last-watched when active lesson changes
  useEffect(() => {
    if (!user || !courseId || !activeLesson) return;
    supabase.from('selfpaced_enrollments').update({
      last_watched_lesson_id: activeLesson.id,
      last_watched_at: new Date().toISOString(),
    }).eq('user_id', user.id).eq('course_id', courseId).then(() => {});
  }, [activeLesson?.id, user?.id, courseId]);

  const goTo = (idx: number) => { if (idx >= 0 && idx < allLessons.length) setActiveLesson(allLessons[idx]); };

  const markComplete = async () => {
    if (!activeLesson || !user) return;
    await supabase.from('selfpaced_lesson_progress').upsert({
      user_id: user.id, lesson_id: activeLesson.id, is_completed: true, completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' });
    const np = { ...progress, [activeLesson.id]: true };
    setProgress(np);
    const newCompleted = allLessons.filter(l => np[l.id]).length;
    const newPct = allLessons.length ? Math.round((newCompleted / allLessons.length) * 100) : 0;
    await supabase.from('selfpaced_enrollments').update({
      progress_percentage: newPct,
      completed_at: newPct === 100 ? new Date().toISOString() : null,
    }).eq('user_id', user.id).eq('course_id', courseId!);
    // auto-advance
    if (currentIdx >= 0 && currentIdx < allLessons.length - 1) setActiveLesson(allLessons[currentIdx + 1]);
  };

  const downloadInvoice = () => {
    if (!course || !user) return;
    downloadSpInvoice({
      invoiceNumber: `SP-${(enrollment?.id || '').slice(0, 8).toUpperCase() || Date.now()}`,
      date: enrollment?.enrolled_at || new Date(),
      studentName: profile?.full_name || user.email || 'Student',
      studentEmail: user.email || '',
      courseTitle: course.title,
      amount: Number(course.price || 0),
      currency: course.currency || 'INR',
      status: Number(course.price || 0) === 0 ? 'enrolled (free)' : 'paid',
    });
    toast.success('Invoice downloaded');
  };

  if (!user) return <Navigate to={`/selfpaced/auth?redirect=${encodeURIComponent(`/selfpaced/learn/${courseId}`)}`} replace />;
  if (enrolled === false) return <Navigate to={`/selfpaced/courses/${courseId}`} replace />;
  if (enrolled === null || !course) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: 'calc(100vh - 70px)' }} className="sp-learn-grid">
      <aside style={{ borderRight: '1px solid hsl(var(--sp-border))', background: 'hsl(var(--sp-surface))', overflowY: 'auto', maxHeight: 'calc(100vh - 70px)' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--sp-border))' }}>
          <button className="sp-btn sp-btn-ghost" style={{ padding: 0, marginBottom: 8, fontSize: '.85rem' }} onClick={() => nav(-1)}><ChevronLeft size={16} /> Back</button>
          <div style={{ fontWeight: 700 }}>{course.title}</div>
          <div style={{ height: 5, background: 'hsl(var(--sp-border))', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', width: `${percent}%`, background: 'hsl(var(--sp-primary))' }} />
          </div>
          <div style={{ fontSize: '.75rem', color: 'hsl(var(--sp-muted))', marginTop: 4 }}>{completedCount}/{allLessons.length} lessons · {percent}%</div>
          <button className="sp-btn sp-btn-outline" onClick={downloadInvoice} style={{ marginTop: 10, width: '100%', fontSize: '.8rem' }}>
            <FileDown size={14} /> Download invoice
          </button>
        </div>
        {modules.map(m => (
          <div key={m.id} style={{ padding: '.6rem 1rem', borderBottom: '1px solid hsl(var(--sp-border))' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.title}</div>
            {(m.selfpaced_lessons ?? []).slice().sort((a: any, b: any) => a.order_index - b.order_index).map((l: any) => (
              <LessonRow key={l.id} lesson={l} active={activeLesson?.id === l.id} done={!!progress[l.id]} onClick={() => setActiveLesson(l)} />
            ))}
            {(m.selfpaced_sub_modules ?? []).map((sm: any) => (
              <div key={sm.id} style={{ marginLeft: 8 }}>
                <div style={{ fontSize: '.82rem', fontWeight: 600, margin: '.4rem 0' }}>{sm.title}</div>
                {(sm.selfpaced_lessons ?? []).slice().sort((a: any, b: any) => a.order_index - b.order_index).map((l: any) => (
                  <LessonRow key={l.id} lesson={l} active={activeLesson?.id === l.id} done={!!progress[l.id]} onClick={() => setActiveLesson(l)} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </aside>
      <div style={{ padding: '1.5rem', maxWidth: 900, width: '100%', margin: '0 auto' }}>
        {activeLesson ? (
          <>
            <h2 style={{ marginTop: 0 }}>{activeLesson.title}</h2>
            {activeLesson.video_url && (
              <div style={{ aspectRatio: '16/9', background: '#000', borderRadius: 8, overflow: 'hidden', marginBottom: '1rem' }}>
                {(() => {
                  const url: string = activeLesson.video_url;
                  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
                  if (yt) return <iframe src={`https://www.youtube.com/embed/${yt[1]}`} style={{ width: '100%', height: '100%', border: 0 }} referrerPolicy="no-referrer-when-downgrade" frameBorder={0} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
                  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
                  if (vm) return <iframe src={`https://player.vimeo.com/video/${vm[1]}`} style={{ width: '100%', height: '100%', border: 0 }} referrerPolicy="no-referrer-when-downgrade" frameBorder={0} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
                  if (/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url)) return <video src={url} controls style={{ width: '100%', height: '100%' }} />;
                  return <iframe src={url} style={{ width: '100%', height: '100%', border: 0 }} referrerPolicy="no-referrer-when-downgrade" frameBorder={0} allowFullScreen />;
                })()}
              </div>
            )}
            {activeLesson.content && <div style={{ whiteSpace: 'pre-wrap', color: 'hsl(var(--sp-foreground))', lineHeight: 1.7 }}>{activeLesson.content}</div>}

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <button className="sp-btn sp-btn-outline" onClick={() => goTo(currentIdx - 1)} disabled={currentIdx <= 0}>
                <ChevronLeft size={16} /> Previous
              </button>
              <button className="sp-btn" onClick={markComplete} disabled={progress[activeLesson.id]}>
                <CheckCircle2 size={16} /> {progress[activeLesson.id] ? 'Completed' : 'Mark complete & continue'}
              </button>
              <button className="sp-btn sp-btn-outline" onClick={() => goTo(currentIdx + 1)} disabled={currentIdx < 0 || currentIdx >= allLessons.length - 1}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </>
        ) : <div style={{ color: 'hsl(var(--sp-muted))' }}>Select a lesson to begin.</div>}
      </div>
      <style>{`@media(max-width:820px){.sp-learn-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
};

const LessonRow: React.FC<{ lesson: any; active: boolean; done: boolean; onClick: () => void }> = ({ lesson, active, done, onClick }) => (
  <button onClick={onClick} className="sp-btn sp-btn-ghost"
    style={{ width: '100%', justifyContent: 'flex-start', padding: '.4rem .5rem', background: active ? 'hsl(var(--sp-primary) / 0.1)' : done ? 'hsl(var(--sp-success) / 0.06)' : 'transparent', fontSize: '.85rem', fontWeight: active ? 700 : 400, opacity: done && !active ? 0.85 : 1 }}>
    {done ? <CheckCircle2 size={14} style={{ color: 'hsl(var(--sp-success))', flexShrink: 0 }} /> : <PlayCircle size={14} style={{ flexShrink: 0 }} />}
    <span style={{ textAlign: 'left', textDecoration: done ? 'line-through' : 'none' }}>{lesson.title}</span>
  </button>
);

export default SpLearn;
