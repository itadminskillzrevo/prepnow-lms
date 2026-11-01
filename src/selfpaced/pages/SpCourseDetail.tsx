import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { addToCart, addToWishlist, formatPrice } from '@/selfpaced/lib/cart';
import {
  Clock, BookOpen, PlayCircle, CheckCircle2, Heart, ShoppingCart, ShoppingBag,
  Sparkles, Wrench, GraduationCap, Zap, Share2, X, FileText, ListChecks,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

const SpCourseDetail: React.FC = () => {
  const { courseId } = useParams();
  const { user } = useSpAuth();
  const nav = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [videoLesson, setVideoLesson] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let { data: c } = await supabase.from('selfpaced_courses').select('*, selfpaced_categories(name,slug)').eq('slug', courseId!).maybeSingle();
      if (!c) {
        const r = await supabase.from('selfpaced_courses').select('*, selfpaced_categories(name,slug)').eq('id', courseId!).maybeSingle();
        c = r.data;
      }
      if (!c) { setLoading(false); return; }
      setCourse(c);
      const { data: mods } = await supabase.from('selfpaced_modules').select('*, selfpaced_sub_modules(*, selfpaced_lessons(*)), selfpaced_lessons(*)').eq('course_id', c.id).order('order_index');
      setModules(mods ?? []);
      if (user) {
        const { data: enr } = await supabase.from('selfpaced_enrollments').select('id').eq('user_id', user.id).eq('course_id', c.id).maybeSingle();
        setOwned(!!enr);
      }
      setLoading(false);
    })();
  }, [courseId, user?.id]);

  const totalLessons = useMemo(
    () => modules.reduce((n, m) => n + (m.selfpaced_lessons?.length ?? 0) + (m.selfpaced_sub_modules?.reduce((s: number, sm: any) => s + (sm.selfpaced_lessons?.length ?? 0), 0) ?? 0), 0),
    [modules]
  );

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;
  if (!course) return <div style={{ padding: '3rem', textAlign: 'center' }}>Course not found. <Link to="/selfpaced/courses">Back</Link></div>;

  const discount = course.original_price && course.original_price > course.price ? Math.round(((course.original_price - course.price) / course.original_price) * 100) : 0;
  const isFree = Number(course.price) === 0;

  const enrollFree = async () => {
    if (!user) { nav('/selfpaced/auth?redirect=' + encodeURIComponent(window.location.pathname)); return; }
    setBusy(true);
    const { error } = await supabase.from('selfpaced_enrollments').insert({ user_id: user.id, course_id: course.id, source: 'free' });
    setBusy(false);
    if (error && !error.message.toLowerCase().includes('duplicate')) { toast.error(error.message); return; }
    toast.success('Enrolled! Start learning.');
    setOwned(true);
    nav(`/selfpaced/learn/${course.id}`);
  };
  const doCart = async () => {
    if (isFree) return enrollFree();
    if (!user) { nav('/selfpaced/auth?redirect=' + encodeURIComponent(window.location.pathname)); return; }
    setBusy(true); await addToCart(user.id, course.id); setBusy(false);
  };
  const doWish = async () => {
    if (!user) { nav('/selfpaced/auth'); return; }
    setBusy(true); await addToWishlist(user.id, course.id); setBusy(false);
  };
  const doBuyNow = async () => {
    if (isFree) return enrollFree();
    if (!user) { nav('/selfpaced/auth?redirect=' + encodeURIComponent(window.location.pathname)); return; }
    setBusy(true);
    const ok = await addToCart(user.id, course.id);
    setBusy(false);
    if (ok) nav('/selfpaced/checkout');
  };
  const doShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: course.title, text: course.short_description || '', url });
      else { await navigator.clipboard.writeText(url); toast.success('Link copied to clipboard'); }
    } catch { /* dismissed */ }
  };

  const openLessonVideo = (l: any) => {
    if (!l.video_url) { toast.info('No video for this lesson'); return; }
    if (!owned && !l.is_preview) {
      if (!user) {
        nav('/selfpaced/auth?redirect=' + encodeURIComponent(window.location.pathname));
        return;
      }
      toast.info('Enroll to watch this lesson');
      return;
    }
    setVideoLesson(l);
  };

  const wyl: string[] = course.what_you_will_learn ?? [];
  const kh: string[] = course.key_highlights ?? [];
  const tools: string[] = course.tools_covered ?? [];
  const skills: string[] = course.skills_developed ?? [];
  const reqs: string[] = course.requirements ?? [];
  const details: string = course.description || '';

  const sectionCard: React.CSSProperties = { padding: '1.5rem', marginBottom: '1rem', background: 'hsl(var(--sp-surface))', border: '1px solid hsl(var(--sp-border))', borderRadius: 'var(--sp-radius)' };
  const sectionHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '.6rem', margin: '0 0 .9rem', fontSize: '1.15rem' };
  const iconBox = (color: string): React.CSSProperties => ({ width: 36, height: 36, borderRadius: 8, background: color, display: 'grid', placeItems: 'center' });

  return (
    <>
    {/* Dark header */}
    <div style={{ background: 'hsl(var(--sp-foreground))', color: 'white', padding: '2.5rem 1.25rem' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        {course.selfpaced_categories && <span className="sp-badge sp-badge-accent">{course.selfpaced_categories.name}</span>}
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', margin: '.75rem 0' }}>{course.title}</h1>
        {course.short_description && <p style={{ color: 'rgba(255,255,255,.8)', fontSize: '1.05rem', maxWidth: 820 }}>{course.short_description}</p>}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem', color: 'rgba(255,255,255,.8)', fontSize: '.9rem' }}>
          {course.level && <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><BookOpen size={16} /> {course.level}</span>}
          {course.duration_hours ? <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Clock size={16} /> {course.duration_hours}h</span> : null}
          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><PlayCircle size={16} /> {totalLessons} lessons</span>
        </div>
      </div>
    </div>

    {/* Body */}
    <div style={{ maxWidth: 1240, margin: '1.5rem auto', padding: '0 1.25rem', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: '1.5rem', alignItems: 'flex-start' }} className="sp-course-detail">
      {/* Left – scrolls with page */}
      <div style={{ minWidth: 0 }}>
        {wyl.length > 0 && (
          <section style={sectionCard}>
            <h3 style={sectionHead}><span style={iconBox('hsl(var(--sp-accent) / 0.12)')}><GraduationCap size={18} color="hsl(var(--sp-accent))" /></span>What You Will Learn</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '.5rem' }}>
              {wyl.map((x, i) => (
                <div key={i} style={{ display: 'flex', gap: '.5rem', padding: '.55rem .7rem', background: 'hsl(var(--sp-bg))', borderRadius: 8, fontSize: '.9rem' }}>
                  <CheckCircle2 size={16} style={{ color: 'hsl(var(--sp-success))', flexShrink: 0, marginTop: 3 }} /><span>{x}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* This course includes */}
        <section style={sectionCard}>
          <h3 style={sectionHead}><span style={iconBox('hsl(var(--sp-primary) / 0.12)')}><Sparkles size={18} color="hsl(var(--sp-primary))" /></span>This course includes</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '.5rem' }}>
            {[
              { i: <PlayCircle size={16} />, t: `${totalLessons} on-demand lessons` },
              { i: <Clock size={16} />, t: `${course.duration_hours || 0} hours of content` },
              { i: <BookOpen size={16} />, t: 'Full lifetime access' },
              { i: <GraduationCap size={16} />, t: 'Certificate of completion' },
              { i: <Zap size={16} />, t: 'Self-paced learning' },
              { i: <FileText size={16} />, t: 'Downloadable resources' },
            ].map((x, i) => (
              <div key={i} style={{ display: 'flex', gap: '.5rem', alignItems: 'center', padding: '.55rem .7rem', background: 'hsl(var(--sp-bg))', borderRadius: 8, fontSize: '.9rem', color: 'hsl(var(--sp-foreground))' }}>
                <span style={{ color: 'hsl(var(--sp-primary))' }}>{x.i}</span> {x.t}
              </div>
            ))}
          </div>
        </section>

        {/* Course content */}
        <section style={sectionCard}>
          <h3 style={sectionHead}><span style={iconBox('hsl(var(--sp-primary) / 0.12)')}><ListChecks size={18} color="hsl(var(--sp-primary))" /></span>Course content</h3>
          <div style={{ fontSize: '.85rem', color: 'hsl(var(--sp-muted))', marginBottom: '.6rem' }}>
            {modules.length} {modules.length === 1 ? 'module' : 'modules'} · {totalLessons} lessons
            {!owned && <span style={{ marginLeft: 8 }}>· <Lock size={12} style={{ verticalAlign: 'middle' }} /> Enroll to unlock all videos</span>}
          </div>
          {modules.length === 0 && <p style={{ color: 'hsl(var(--sp-muted))' }}>Content is being prepared.</p>}
          {modules.map(m => (
            <details key={m.id} style={{ borderTop: '1px solid hsl(var(--sp-border))', padding: '.6rem 0' }} open>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{m.title}</summary>
              <ul style={{ listStyle: 'none', padding: '.5rem 0 0 .5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                {m.selfpaced_lessons?.sort((a: any, b: any) => a.order_index - b.order_index).map((l: any) => (
                  <LessonItem key={l.id} lesson={l} owned={owned} onPlay={() => openLessonVideo(l)} />
                ))}
                {m.selfpaced_sub_modules?.map((sm: any) => (
                  <li key={sm.id} style={{ marginTop: '.35rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '.9rem', padding: '.35rem .5rem' }}>{sm.title}</div>
                    <ul style={{ listStyle: 'none', paddingLeft: '.75rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                      {sm.selfpaced_lessons?.sort((a: any, b: any) => a.order_index - b.order_index).map((l: any) => (
                        <LessonItem key={l.id} lesson={l} owned={owned} onPlay={() => openLessonVideo(l)} />
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>

        {/* Requirements */}
        {reqs.length > 0 && (
          <section style={sectionCard}>
            <h3 style={sectionHead}><span style={iconBox('hsl(var(--sp-accent) / 0.12)')}><ListChecks size={18} color="hsl(var(--sp-accent))" /></span>Requirements</h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'hsl(var(--sp-muted))', lineHeight: 1.7 }}>
              {reqs.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </section>
        )}

        {/* Course details */}
        {details && (
          <section style={sectionCard}>
            <h3 style={sectionHead}><span style={iconBox('hsl(var(--sp-primary) / 0.12)')}><FileText size={18} color="hsl(var(--sp-primary))" /></span>Course details</h3>
            <p style={{ whiteSpace: 'pre-wrap', color: 'hsl(var(--sp-muted))', lineHeight: 1.7, margin: 0 }}>{details}</p>
          </section>
        )}

        {kh.length > 0 && (
          <section style={sectionCard}>
            <h3 style={sectionHead}><span style={iconBox('hsl(var(--sp-primary) / 0.12)')}><Sparkles size={18} color="hsl(var(--sp-primary))" /></span>Key Highlights</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '.5rem' }}>
              {kh.map((x, i) => (
                <div key={i} style={{ display: 'flex', gap: '.5rem', padding: '.55rem .7rem', background: 'hsl(var(--sp-bg))', borderRadius: 8, fontSize: '.9rem' }}>
                  <CheckCircle2 size={16} style={{ color: 'hsl(var(--sp-success))', flexShrink: 0, marginTop: 3 }} /><span>{x}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tools.length > 0 && (
          <section style={sectionCard}>
            <h3 style={sectionHead}><span style={iconBox('hsl(var(--sp-primary) / 0.12)')}><Wrench size={18} color="hsl(var(--sp-primary))" /></span>Tools Covered</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem' }}>
              {tools.map((t, i) => (
                <span key={i} className="sp-badge" style={{ padding: '.45rem .8rem', fontSize: '.82rem', background: 'hsl(var(--sp-primary) / 0.1)', color: 'hsl(var(--sp-primary))', border: '1px solid hsl(var(--sp-primary) / 0.2)' }}>{t}</span>
              ))}
            </div>
          </section>
        )}

        {skills.length > 0 && (
          <section style={sectionCard}>
            <h3 style={sectionHead}><span style={iconBox('hsl(var(--sp-success) / 0.12)')}><Zap size={18} color="hsl(var(--sp-success))" /></span>Skills Developed After Completion</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '.5rem' }}>
              {skills.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '.5rem', padding: '.55rem .7rem', border: '1px solid hsl(var(--sp-border))', borderRadius: 8, fontSize: '.88rem' }}>
                  <Zap size={14} style={{ color: 'hsl(var(--sp-success))', flexShrink: 0, marginTop: 3 }} /><span>{s}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Right – sticky sidebar */}
      <aside className="sp-course-side">
        <div className="sp-card" style={{ padding: '1rem', position: 'sticky', top: 80 }}>
          {course.thumbnail_url && <img src={course.thumbnail_url} alt={course.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8 }} />}
          <div style={{ marginTop: '1rem', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3 }}>{course.title}</div>
          <div style={{ marginTop: '.5rem', display: 'flex', alignItems: 'baseline', gap: '.5rem', flexWrap: 'wrap' }}>
            {isFree
              ? <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'hsl(var(--sp-success))' }}>Free</span>
              : <>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800 }}>{formatPrice(course.price, course.currency)}</span>
                  {discount > 0 && <>
                    <span style={{ textDecoration: 'line-through', color: 'hsl(var(--sp-muted))' }}>{formatPrice(course.original_price, course.currency)}</span>
                    <span className="sp-badge sp-badge-danger">-{discount}%</span>
                  </>}
                </>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginTop: '.9rem' }}>
            {owned
              ? <Link to={`/selfpaced/learn/${course.id}`} className="sp-btn">Continue learning</Link>
              : isFree
                ? <button className="sp-btn" onClick={enrollFree} disabled={busy}><GraduationCap size={16} /> Enroll for Free</button>
                : <>
                    <button className="sp-btn" onClick={doBuyNow} disabled={busy}><ShoppingBag size={16} /> Buy now</button>
                    <button className="sp-btn sp-btn-accent" onClick={doCart} disabled={busy}><ShoppingCart size={16} /> Add to cart</button>
                  </>}
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="sp-btn sp-btn-outline" onClick={doWish} disabled={busy} style={{ flex: 1 }}><Heart size={16} /> Wishlist</button>
              <button className="sp-btn sp-btn-outline" onClick={doShare} style={{ flex: 1 }}><Share2 size={16} /> Share</button>
            </div>
          </div>
          {(kh.length > 0 || course.duration_hours) && (
            <ul style={{ listStyle: 'none', padding: '1rem 0 0', margin: 0, display: 'flex', flexDirection: 'column', gap: '.35rem', color: 'hsl(var(--sp-muted))', fontSize: '.85rem' }}>
              {course.duration_hours ? <li style={{ display: 'flex', gap: '.4rem' }}><Clock size={14} /> {course.duration_hours} hours</li> : null}
              <li style={{ display: 'flex', gap: '.4rem' }}><PlayCircle size={14} /> {totalLessons} lessons</li>
              <li style={{ display: 'flex', gap: '.4rem' }}><BookOpen size={14} /> Full lifetime access</li>
              <li style={{ display: 'flex', gap: '.4rem' }}><GraduationCap size={14} /> Certificate on completion</li>
              {kh.slice(0, 3).map((h: string, i: number) => (
                <li key={i} style={{ display: 'flex', gap: '.4rem' }}><CheckCircle2 size={14} /> {h}</li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>

    {/* Video popup */}
    {videoLesson && (
      <div onClick={() => setVideoLesson(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '1rem' }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: '#000', borderRadius: 10, overflow: 'hidden', width: '100%', maxWidth: 960, position: 'relative' }}>
          <button onClick={() => setVideoLesson(null)}
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', borderRadius: 999, width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <X size={18} />
          </button>
          <div style={{ padding: '.6rem .9rem', color: '#fff', fontWeight: 600, background: 'rgba(255,255,255,.06)' }}>{videoLesson.title}</div>
          <div style={{ aspectRatio: '16/9', background: '#000' }}>
            <LessonVideo url={videoLesson.video_url} />
          </div>
        </div>
      </div>
    )}

    <style>{`
      @media(max-width:900px){
        .sp-course-detail{grid-template-columns:1fr!important}
        .sp-course-side .sp-card{position:static!important}
      }
    `}</style>
    </>
  );
};

const LessonItem: React.FC<{ lesson: any; owned: boolean; onPlay: () => void }> = ({ lesson, owned, onPlay }) => {
  const canPlay = owned || lesson.is_preview;
  return (
    <li>
      <button type="button" onClick={onPlay}
        style={{ display: 'flex', alignItems: 'center', gap: '.5rem', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '.4rem .5rem', borderRadius: 6, cursor: canPlay ? 'pointer' : 'not-allowed', color: 'hsl(var(--sp-foreground))', fontSize: '.9rem' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--sp-bg))'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
        {canPlay ? <PlayCircle size={14} style={{ color: 'hsl(var(--sp-primary))', flexShrink: 0 }} /> : <Lock size={14} style={{ color: 'hsl(var(--sp-muted))', flexShrink: 0 }} />}
        <span style={{ flex: 1 }}>{lesson.title}</span>
        {lesson.is_preview && <span className="sp-badge" style={{ fontSize: '.68rem' }}>Preview</span>}
        {lesson.duration_minutes ? <span style={{ fontSize: '.75rem', color: 'hsl(var(--sp-muted))' }}>{lesson.duration_minutes}m</span> : null}
      </button>
    </li>
  );
};

const LessonVideo: React.FC<{ url: string }> = ({ url }) => {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return <iframe src={`https://www.youtube.com/embed/${yt[1]}?autoplay=1`} style={{ width: '100%', height: '100%', border: 0 }} referrerPolicy="no-referrer-when-downgrade" frameBorder={0} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return <iframe src={`https://player.vimeo.com/video/${vm[1]}?autoplay=1`} style={{ width: '100%', height: '100%', border: 0 }} referrerPolicy="no-referrer-when-downgrade" frameBorder={0} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  if (/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url)) return <video src={url} controls autoPlay style={{ width: '100%', height: '100%' }} />;
  return <iframe src={url} style={{ width: '100%', height: '100%', border: 0 }} referrerPolicy="no-referrer-when-downgrade" frameBorder={0} allowFullScreen />;
};

export default SpCourseDetail;
