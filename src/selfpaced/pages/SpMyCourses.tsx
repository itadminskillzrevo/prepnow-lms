import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { computeSpProgress, type CourseProgress } from '@/selfpaced/lib/spProgress';

const SpMyCourses: React.FC = () => {
  const { user } = useSpAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [prog, setProg] = useState<Record<string, CourseProgress>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('selfpaced_enrollments')
        .select('*, selfpaced_courses(id,title,slug,thumbnail_url,duration_hours)')
        .eq('user_id', user.id).order('enrolled_at', { ascending: false });
      const list = data ?? [];
      setRows(list);
      const p = await computeSpProgress(user.id, list.map((r: any) => r.course_id));
      setProg(p);
    })();
  }, [user?.id]);

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '2rem 1.25rem' }}>
      <h1>My Courses</h1>
      {rows.length === 0
        ? <div className="sp-card" style={{ padding: '2rem', textAlign: 'center' }}>No courses yet. <Link to="/selfpaced/courses" style={{ color: 'hsl(var(--sp-primary))' }}>Browse</Link></div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {rows.map(r => {
              const cp = prog[r.course_id];
              const pct = cp ? cp.percent : (r.progress_percentage ?? 0);
              const done = cp ? cp.percent === 100 && cp.total > 0 : !!r.completed_at;
              return (
                <Link key={r.id} to={`/selfpaced/learn/${r.course_id}`} className="sp-card sp-card-hover" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <img src={r.selfpaced_courses?.thumbnail_url || '/placeholder.svg'} style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', borderRadius: '8px 8px 0 0' }} />
                  <div style={{ padding: '.85rem' }}>
                    <div style={{ fontWeight: 600 }}>{r.selfpaced_courses?.title}</div>
                    <div style={{ marginTop: 6, height: 6, background: 'hsl(var(--sp-border))', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'hsl(var(--sp-primary))' }} />
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'hsl(var(--sp-muted))', marginTop: 4 }}>
                      {pct}% complete{cp ? ` · ${cp.completed}/${cp.total} lessons` : ''}{done ? ' · ✓ Completed' : ''}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>}
    </div>
  );
};

export default SpMyCourses;
