import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JrLayout } from '@/jr/components/JrLayout';
import { supabase } from '@/integrations/supabase/client';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import {
  CheckCircle2, PlayCircle, Loader2, Sparkles, BookOpen, Clock, Users, Star, Award, Lock,
  Target, Wrench, Zap, GraduationCap, ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';

export default function JrCourseDetail() {
  const { courseId: id } = useParams();
  const nav = useNavigate();
  const { user } = useJrAuth();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'highlights' | 'others'>('overview');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: c }, { data: mods }, { data: e }, { count }] = await Promise.all([
        supabase.from('jr_courses').select('*, jr_categories(name)').eq('id', id).maybeSingle(),
        supabase.from('jr_modules').select('*').eq('course_id', id).order('order_index'),
        user ? supabase.from('jr_enrollments').select('id, approval_status').eq('course_id', id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null } as any),
        supabase.from('jr_enrollments').select('id', { count: 'exact', head: true }).eq('course_id', id),
      ]);
      const moduleIds = (mods ?? []).map((m: any) => m.id);
      const [{ data: subs }, { data: directLessons }] = await Promise.all([
        moduleIds.length ? supabase.from('jr_sub_modules').select('*').in('module_id', moduleIds).order('order_index') : Promise.resolve({ data: [] } as any),
        moduleIds.length ? supabase.from('jr_lessons').select('*').in('module_id', moduleIds).order('order_index') : Promise.resolve({ data: [] } as any),
      ]);
      const subIds = (subs ?? []).map((s: any) => s.id);
      const { data: subLessons } = subIds.length
        ? await supabase.from('jr_lessons').select('*').in('sub_module_id', subIds).order('order_index')
        : { data: [] } as any;
      const normalized = (mods ?? []).map((m: any) => ({
        ...m,
        jr_sub_modules: (subs ?? []).filter((s: any) => s.module_id === m.id).map((sm: any) => ({
          ...sm,
          jr_lessons: (subLessons ?? []).filter((l: any) => l.sub_module_id === sm.id),
        })),
        jr_lessons: (directLessons ?? []).filter((l: any) => l.module_id === m.id && !l.sub_module_id),
      }));
      setCourse(c); setModules(normalized); setEnrolled(!!e); setApprovalStatus(e?.approval_status ?? null); setEnrolledCount(count ?? 0);
      if (mods && mods[0]) setOpenModules(new Set([mods[0].id]));
      setLoading(false);
    })();
  }, [id, user]);

  const enroll = async () => {
    if (!user) { nav('/jr/auth?mode=signup'); return; }
    // Route to payment page (handles free + paid)
    nav(`/jr/courses/${id}/payment`);
  };

  const toggleModule = (mid: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      next.has(mid) ? next.delete(mid) : next.add(mid);
      return next;
    });
  };

  if (loading) return <JrLayout><div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--jr-primary))]" /></div></JrLayout>;
  if (!course) return <JrLayout><div className="py-20 text-center">Course not found.</div></JrLayout>;

  const flatLessons = (m: any) => [...(m.jr_lessons ?? []), ...((m.jr_sub_modules ?? []).flatMap((sm: any) => sm.jr_lessons ?? []))];
  const totalLessons = modules.reduce((acc, m) => acc + flatLessons(m).length, 0);
  const totalMinutes = modules.reduce(
    (acc, m) => acc + flatLessons(m).reduce((s: number, l: any) => s + (l.duration_minutes ?? 0), 0), 0
  );
  const isFree = !course.price || course.price === 0;
  const programOverview = course.program_overview || course.description;

  const Section = ({ icon: Icon, title, color, children }: any) => (
    <div className="jr-card p-6">
      <h2 className="text-2xl font-extrabold mb-4 flex items-center gap-2">
        <Icon className={`w-6 h-6 ${color}`} /> {title}
      </h2>
      {children}
    </div>
  );

  return (
    <JrLayout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-[hsl(var(--jr-primary))] to-[hsl(var(--jr-pink))] text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-14 grid lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap gap-2">
              {course.jr_categories?.name && <span className="jr-chip !bg-white/20 !text-white !border-white/30">{course.jr_categories.name}</span>}
              {course.difficulty && <span className="jr-chip !bg-white/20 !text-white !border-white/30 capitalize">{course.difficulty}</span>}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold">{course.title}</h1>
            {course.description && <p className="text-white/85 text-base md:text-lg max-w-2xl">{course.description}</p>}
            <div className="flex flex-wrap items-center gap-5 text-sm pt-2">
              <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {enrolledCount.toLocaleString('en-IN')} learners</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {course.duration_hours ?? 0} hours</span>
              <span className="inline-flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {totalLessons} lessons</span>
              <span className="inline-flex items-center gap-1.5"><Star className="w-4 h-4 fill-yellow-300 text-yellow-300" /> Kid-friendly</span>
            </div>
            <div className="pt-2">
              {!enrolled ? (
                <button
                  onClick={enroll}
                  disabled={enrolling}
                  className="inline-flex items-center gap-2 rounded-full bg-white text-[hsl(var(--jr-primary))] font-extrabold px-7 py-3 shadow-xl ring-2 ring-white/50 hover:bg-yellow-300 hover:text-[hsl(var(--jr-primary))] hover:ring-yellow-300 transition disabled:opacity-70"
                >
                  {enrolling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isFree ? 'Join This Course — Free' : `Enroll Now • ₹${course.price}`}
                </button>
              ) : approvalStatus === 'approved' ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/95 text-[hsl(var(--jr-primary))] font-extrabold px-6 py-3 shadow-lg"><CheckCircle2 className="w-5 h-5" /> You're enrolled!</div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 text-yellow-800 font-extrabold px-6 py-3 shadow-lg"><Clock className="w-5 h-5" /> Enrollment Pending Approval</div>
              )}
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="rounded-3xl overflow-hidden shadow-2xl aspect-video bg-black/20">
              {course.thumbnail_url
                ? <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-7xl">📘</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="jr-card p-2 flex flex-wrap gap-1 sticky top-16 z-10">
            {[
              { k: 'overview', label: 'Program Overview', icon: Target },
              { k: 'content', label: 'Course Content', icon: BookOpen },
              { k: 'highlights', label: 'Highlights, Tools & Skills', icon: Sparkles },
              { k: 'others', label: 'Others', icon: ListChecks },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === (t.k as any);
              return (
                <button
                  key={t.k}
                  onClick={() => setActiveTab(t.k as any)}
                  className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition ${
                    active
                      ? 'bg-[hsl(var(--jr-primary))] text-white shadow-md'
                      : 'text-[hsl(var(--jr-muted))] hover:bg-[hsl(var(--jr-primary)/0.08)] hover:text-[hsl(var(--jr-primary))]'
                  }`}
                >
                  <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Tab: Program Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {programOverview ? (
                <Section icon={Target} title="Program Overview" color="text-[hsl(var(--jr-primary))]">
                  <p className="text-[hsl(var(--jr-muted))] leading-relaxed whitespace-pre-line">{programOverview}</p>
                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-xl bg-[hsl(var(--jr-primary)/0.08)]">
                      <p className="text-2xl font-extrabold text-[hsl(var(--jr-primary))]">{course.duration_hours || 0}+</p>
                      <p className="text-xs text-[hsl(var(--jr-muted))]">Hours</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-[hsl(var(--jr-pink)/0.08)]">
                      <p className="text-2xl font-extrabold text-[hsl(var(--jr-pink))]">{modules.length}</p>
                      <p className="text-xs text-[hsl(var(--jr-muted))]">Chapters</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-[hsl(var(--jr-green)/0.08)]">
                      <p className="text-2xl font-extrabold text-[hsl(var(--jr-green))]">{totalLessons}</p>
                      <p className="text-xs text-[hsl(var(--jr-muted))]">Lessons</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-[hsl(var(--jr-accent)/0.15)]">
                      <p className="text-2xl font-extrabold" style={{ color: 'hsl(35 90% 40%)' }}>100%</p>
                      <p className="text-xs text-[hsl(var(--jr-muted))]">Fun</p>
                    </div>
                  </div>
                </Section>
              ) : (
                <div className="jr-card p-8 text-center text-[hsl(var(--jr-muted))]">No overview added yet.</div>
              )}

              {course.what_you_will_learn?.length > 0 && (
                <Section icon={GraduationCap} title="What you'll learn 🎯" color="text-[hsl(var(--jr-primary))]">
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {course.what_you_will_learn.map((x: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[hsl(var(--jr-primary)/0.05)]">
                        <CheckCircle2 className="w-5 h-5 text-[hsl(var(--jr-green))] flex-shrink-0 mt-0.5" /> {x}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          )}

          {/* Tab: Course Content */}
          {activeTab === 'content' && (
            <div className="jr-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-extrabold flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-[hsl(var(--jr-primary))]" /> Course Curriculum 📚
                </h2>
                <span className="text-sm text-[hsl(var(--jr-muted))]">{modules.length} chapters • {totalLessons} lessons</span>
              </div>
              <div className="space-y-3">
                {modules.map((m, i) => {
                  const isOpen = openModules.has(m.id);
                  const directLessons = (m.jr_lessons ?? []).slice().sort((a: any, b: any) => a.order_index - b.order_index);
                  const subModules = (m.jr_sub_modules ?? []).slice().sort((a: any, b: any) => a.order_index - b.order_index);
                  const allLessons = flatLessons(m);
                  const moduleMins = allLessons.reduce((s: number, l: any) => s + (l.duration_minutes ?? 0), 0);

                  const renderLesson = (l: any) => {
                    const canAccess = (enrolled && approvalStatus === 'approved') || l.is_free;
                    return (
                      <div
                        key={l.id}
                        onClick={() => { if (canAccess) nav(`/jr/courses/${id}/lessons/${l.id}`); }}
                        className={`flex items-center gap-3 px-4 py-3 ${canAccess ? 'hover:bg-[hsl(var(--jr-primary)/0.06)] cursor-pointer' : 'opacity-60'}`}
                      >
                        {canAccess
                          ? <PlayCircle className="w-5 h-5 text-[hsl(var(--jr-primary))]" />
                          : <Lock className="w-4 h-4 text-[hsl(var(--jr-muted))]" />}
                        <span className="flex-1 text-sm font-medium">{l.title}</span>
                        {l.is_free && !enrolled && <span className="jr-chip !py-0.5 !px-2 text-[10px]">Free</span>}
                        <span className="text-xs text-[hsl(var(--jr-muted))]">{l.duration_minutes || 0} min</span>
                      </div>
                    );
                  };

                  return (
                    <div key={m.id} className="rounded-2xl border-2 border-[hsl(var(--jr-border))] overflow-hidden">
                      <button onClick={() => toggleModule(m.id)} className="w-full flex items-center gap-3 px-4 py-3 bg-[hsl(var(--jr-primary)/0.05)] hover:bg-[hsl(var(--jr-primary)/0.1)] transition text-left">
                        <span className="w-8 h-8 rounded-full bg-[hsl(var(--jr-primary))] text-white font-extrabold flex items-center justify-center text-sm">{i + 1}</span>
                        <div className="flex-1">
                          <div className="font-extrabold">{m.title}</div>
                          {m.description && <div className="text-xs text-[hsl(var(--jr-muted))] mt-0.5">{m.description}</div>}
                        </div>
                        <span className="text-xs text-[hsl(var(--jr-muted))] hidden sm:inline">{allLessons.length} lessons • {moduleMins} min</span>
                        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                      </button>
                      {isOpen && (
                        <div className="divide-y divide-[hsl(var(--jr-border))]">
                          {/* Sub-modules */}
                          {subModules.map((sm: any) => (
                            <div key={sm.id}>
                              <div className="px-4 py-2 bg-[hsl(var(--jr-pink)/0.06)] border-l-4 border-[hsl(var(--jr-pink))]">
                                <div className="font-bold text-sm">📑 {sm.title}</div>
                                {sm.description && <div className="text-xs text-[hsl(var(--jr-muted))]">{sm.description}</div>}
                              </div>
                              <div className="divide-y divide-[hsl(var(--jr-border))]">
                                {(sm.jr_lessons ?? []).map(renderLesson)}
                              </div>
                            </div>
                          ))}
                          {/* Direct lessons */}
                          {directLessons.map(renderLesson)}
                          {allLessons.length === 0 && (
                            <div className="px-4 py-3 text-sm text-[hsl(var(--jr-muted))]">No lessons yet.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {modules.length === 0 && <div className="text-center text-[hsl(var(--jr-muted))] py-8">Content coming soon!</div>}
              </div>
            </div>
          )}

          {/* Tab: Highlights, Tools & Skills */}
          {activeTab === 'highlights' && (
            <div className="space-y-6">
              {course.key_highlights?.length > 0 ? (
                <Section icon={Award} title="Key Highlights ✨" color="text-[hsl(var(--jr-pink))]">
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {course.key_highlights.map((x: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[hsl(var(--jr-pink)/0.05)]">
                        <CheckCircle2 className="w-5 h-5 text-[hsl(var(--jr-green))] flex-shrink-0 mt-0.5" /> {x}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {course.tools_covered?.length > 0 ? (
                <Section icon={Wrench} title="Tools Covered 🛠️" color="text-[hsl(var(--jr-purple))]">
                  <div className="flex flex-wrap gap-2">
                    {course.tools_covered.map((t: string, i: number) => (
                      <span key={i} className="jr-chip !bg-[hsl(var(--jr-purple)/0.15)] !text-[hsl(var(--jr-purple))]">{t}</span>
                    ))}
                  </div>
                </Section>
              ) : null}

              {course.skills_developed?.length > 0 ? (
                <Section icon={Zap} title="Skills You'll Develop 🚀" color="text-[hsl(var(--jr-green))]">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {course.skills_developed.map((s: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-3 rounded-xl border-2 border-[hsl(var(--jr-border))] hover:border-[hsl(var(--jr-green))] hover:bg-[hsl(var(--jr-green)/0.05)] transition">
                        <Zap className="w-4 h-4 text-[hsl(var(--jr-green))] flex-shrink-0" />
                        <span className="text-sm font-medium">{s}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              {!course.key_highlights?.length && !course.tools_covered?.length && !course.skills_developed?.length && (
                <div className="jr-card p-8 text-center text-[hsl(var(--jr-muted))]">Nothing added here yet.</div>
              )}
            </div>
          )}

          {/* Tab: Others */}
          {activeTab === 'others' && (
            <div className="space-y-6">
              {course.requirements?.length > 0 ? (
                <Section icon={ListChecks} title="Requirements 📋" color="text-[hsl(var(--jr-secondary))]">
                  <ul className="space-y-2">
                    {course.requirements.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-[hsl(var(--jr-secondary))] mt-2 flex-shrink-0" /> {r}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              <Section icon={GraduationCap} title="Course Author 👩‍🏫" color="text-[hsl(var(--jr-primary))]">
                <p className="text-[hsl(var(--jr-muted))]">Curated by the Prepnow Junior team — passionate educators creating fun, kid-friendly learning experiences.</p>
              </Section>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="jr-card p-6 lg:sticky lg:top-24">
            <div className="aspect-video rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-[hsl(var(--jr-primary)/0.25)] to-[hsl(var(--jr-pink)/0.25)] flex items-center justify-center text-6xl lg:hidden">
              {course.thumbnail_url ? <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" /> : '📘'}
            </div>
            <div className="text-3xl font-extrabold mb-1">
              {isFree ? 'Free' : `₹${course.price}`}
            </div>
            <p className="text-sm text-[hsl(var(--jr-muted))] mb-4">Lifetime access to all lessons</p>
            {!enrolled ? (
              <button onClick={enroll} disabled={enrolling} className="jr-btn w-full !py-3">
                {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isFree ? 'Join Now' : 'Enroll Now'}
              </button>
            ) : (
              <div className="jr-chip w-full justify-center"><CheckCircle2 className="w-4 h-4" /> Enrolled</div>
            )}
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-[hsl(var(--jr-primary))]" /> {totalLessons} lessons</li>
              <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-[hsl(var(--jr-primary))]" /> {course.duration_hours ?? 0} hours of content</li>
              <li className="flex items-center gap-2"><Users className="w-4 h-4 text-[hsl(var(--jr-primary))]" /> {enrolledCount.toLocaleString('en-IN')} students</li>
              <li className="flex items-center gap-2"><Award className="w-4 h-4 text-[hsl(var(--jr-primary))]" /> Certificate on completion</li>
              {totalMinutes > 0 && <li className="flex items-center gap-2"><PlayCircle className="w-4 h-4 text-[hsl(var(--jr-primary))]" /> {totalMinutes} min of video</li>}
            </ul>
          </div>
        </aside>
      </section>
    </JrLayout>
  );
}
