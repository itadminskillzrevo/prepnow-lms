import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { JrLayout } from '@/jr/components/JrLayout';
import { supabase } from '@/integrations/supabase/client';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Lock, PlayCircle, FileText, Paperclip, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Lesson {
  id: string; title: string; content: string | null; video_url: string | null;
  duration_minutes: number | null; order_index: number; is_free: boolean;
  module_id: string | null; sub_module_id: string | null;
}

export default function JrLessonViewer() {
  const { courseId, lessonId } = useParams();
  const nav = useNavigate();
  const { user } = useJrAuth();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    if (!courseId || !lessonId) return;
    (async () => {
      setLoading(true);
      const [{ data: c }, { data: e }] = await Promise.all([
        supabase.from('jr_courses').select('id, title').eq('id', courseId).maybeSingle(),
        user ? supabase.from('jr_enrollments').select('id, approval_status').eq('course_id', courseId).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null } as any),
      ]);
      setCourse(c);
      const isApproved = e?.approval_status === 'approved';
      setEnrolled(isApproved);

      // Get all lessons for this course (for prev/next navigation)
      const { data: mods } = await supabase.from('jr_modules').select('id').eq('course_id', courseId).order('order_index');
      const moduleIds = (mods ?? []).map((m: any) => m.id);
      const { data: subs } = moduleIds.length
        ? await supabase.from('jr_sub_modules').select('id, module_id, order_index').in('module_id', moduleIds).order('order_index')
        : { data: [] } as any;
      const subIds = (subs ?? []).map((s: any) => s.id);
      const [{ data: directLessons }, { data: subLessons }] = await Promise.all([
        moduleIds.length ? supabase.from('jr_lessons').select('*').in('module_id', moduleIds).order('order_index') : Promise.resolve({ data: [] } as any),
        subIds.length ? supabase.from('jr_lessons').select('*').in('sub_module_id', subIds).order('order_index') : Promise.resolve({ data: [] } as any),
      ]);

      // Flatten in module → sub-module → lesson order
      const flat: Lesson[] = [];
      (mods ?? []).forEach((m: any) => {
        const subsOf = (subs ?? []).filter((s: any) => s.module_id === m.id);
        const direct = (directLessons ?? []).filter((l: any) => l.module_id === m.id && !l.sub_module_id);
        subsOf.forEach((sm: any) => {
          const ls = (subLessons ?? []).filter((l: any) => l.sub_module_id === sm.id);
          flat.push(...ls);
        });
        flat.push(...direct);
      });
      setAllLessons(flat);

      const current = flat.find((l) => l.id === lessonId) ?? null;
      setLesson(current);

      if (current) {
        const { data: mats } = await supabase.from('jr_course_materials').select('*').eq('lesson_id', current.id);
        setMaterials(mats ?? []);
      }
      setLoading(false);
    })();
  }, [courseId, lessonId, user]);

  const { prev, next } = useMemo(() => {
    const idx = allLessons.findIndex((l) => l.id === lessonId);
    return {
      prev: idx > 0 ? allLessons[idx - 1] : null,
      next: idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null,
    };
  }, [allLessons, lessonId]);

  if (loading) {
    return <JrLayout><div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--jr-primary))]" /></div></JrLayout>;
  }
  if (!lesson) {
    return <JrLayout><div className="py-20 text-center">Lesson not found.</div></JrLayout>;
  }

  const canAccess = enrolled || lesson.is_free;
  if (!canAccess) {
    return (
      <JrLayout>
        <div className="max-w-2xl mx-auto py-16 px-4 text-center">
          <Lock className="w-14 h-14 text-[hsl(var(--jr-muted))] mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold mb-2">This lesson is locked 🔒</h2>
          <p className="text-[hsl(var(--jr-muted))] mb-6">Please enroll in the course to access this lesson.</p>
          <button onClick={() => nav(`/jr/courses/${courseId}`)} className="jr-btn">Go to Course</button>
        </div>
      </JrLayout>
    );
  }

  return (
    <JrLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Link to={`/jr/courses/${courseId}`} className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--jr-primary))] mb-4 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to {course?.title ?? 'Course'}
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="jr-card overflow-hidden">
              {lesson.video_url ? (
                <VideoPlayer url={lesson.video_url} className="rounded-none" />
              ) : (
                <div className="aspect-video bg-gradient-to-br from-[hsl(var(--jr-primary)/0.2)] to-[hsl(var(--jr-pink)/0.1)] flex items-center justify-center">
                  <div className="text-center">
                    <PlayCircle className="w-20 h-20 text-[hsl(var(--jr-primary)/0.4)] mx-auto mb-2" />
                    <p className="text-[hsl(var(--jr-muted))]">No video for this lesson</p>
                  </div>
                </div>
              )}
            </div>

            <div className="jr-card p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h1 className="text-2xl md:text-3xl font-extrabold">{lesson.title}</h1>
                {lesson.is_free && <span className="jr-chip !bg-[hsl(var(--jr-green)/0.15)] !text-[hsl(var(--jr-green))] !border-[hsl(var(--jr-green)/0.3)]">Free Preview</span>}
              </div>
              {lesson.duration_minutes ? (
                <div className="text-sm text-[hsl(var(--jr-muted))] mb-4">⏱️ {lesson.duration_minutes} min</div>
              ) : null}

              {lesson.content ? (
                <div
                  className="prose prose-sm max-w-none whitespace-pre-line text-[hsl(var(--jr-text))]"
                  dangerouslySetInnerHTML={{ __html: lesson.content }}
                />
              ) : (
                <p className="text-[hsl(var(--jr-muted))] italic">No notes added for this lesson.</p>
              )}
            </div>

            {/* Materials */}
            {materials.length > 0 && (
              <div className="jr-card p-6">
                <h2 className="text-xl font-extrabold mb-3 flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-[hsl(var(--jr-primary))]" /> Course Materials
                </h2>
                <ul className="space-y-2">
                  {materials.map((m: any) => (
                    <li key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--jr-border))] hover:bg-[hsl(var(--jr-primary)/0.04)] transition">
                      <FileText className="w-5 h-5 text-[hsl(var(--jr-primary))]" />
                      <span className="flex-1 font-medium text-sm">{m.title}</span>
                      <a href={m.file_url} target="_blank" rel="noreferrer" className="jr-btn jr-btn-secondary !py-1.5 !px-3 text-xs"><Download className="w-3.5 h-3.5" /> Open</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prev / Next */}
            <div className="flex items-center justify-between gap-2">
              <button
                disabled={!prev}
                onClick={() => prev && nav(`/jr/courses/${courseId}/lessons/${prev.id}`)}
                className="jr-btn jr-btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                disabled={!next}
                onClick={() => next && nav(`/jr/courses/${courseId}/lessons/${next.id}`)}
                className="jr-btn disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sidebar: lessons list */}
          <aside className="jr-card p-4 h-fit lg:sticky lg:top-20">
            <h3 className="font-extrabold mb-3">All Lessons</h3>
            <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
              {allLessons.map((l, i) => {
                const active = l.id === lesson.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => nav(`/jr/courses/${courseId}/lessons/${l.id}`)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${active ? 'bg-[hsl(var(--jr-primary))] text-white font-bold' : 'hover:bg-[hsl(var(--jr-primary)/0.08)]'}`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${active ? 'bg-white/20' : 'bg-[hsl(var(--jr-primary)/0.1)] text-[hsl(var(--jr-primary))]'}`}>{i + 1}</span>
                    <span className="flex-1 truncate">{l.title}</span>
                    {active && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                );
              })}
              {allLessons.length === 0 && <div className="text-sm text-[hsl(var(--jr-muted))] py-2">No lessons yet.</div>}
            </div>
          </aside>
        </div>
      </div>
    </JrLayout>
  );
}
