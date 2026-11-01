import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { computeSpProgress, type CourseProgress } from '@/selfpaced/lib/spProgress';
import { BookOpen, ShoppingBag, Award, TrendingUp, PlayCircle, ArrowRight } from 'lucide-react';

const SpDashboard: React.FC = () => {
  const { user, profile } = useSpAuth();
  const [enrolls, setEnrolls] = useState<any[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [prog, setProg] = useState<Record<string, CourseProgress>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: en } = await supabase.from('selfpaced_enrollments')
        .select('*, selfpaced_courses(id,title,slug,thumbnail_url)')
        .eq('user_id', user.id).order('enrolled_at', { ascending: false });
      const list = en ?? [];
      setEnrolls(list);
      const p = await computeSpProgress(user.id, list.map((e: any) => e.course_id));
      setProg(p);
    })();
    supabase.from('selfpaced_orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => setOrderCount(count ?? 0));
    supabase.from('selfpaced_orders').select('id,order_number,total,currency,status,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(4)
      .then(({ data }) => setRecentOrders(data ?? []));
  }, [user?.id]);

  const pctFor = (e: any) => {
    const cp = prog[e.course_id];
    return cp ? cp.percent : (e.progress_percentage ?? 0);
  };
  const avg = enrolls.length ? Math.round(enrolls.reduce((s, e) => s + pctFor(e), 0) / enrolls.length) : 0;
  const completed = enrolls.filter(e => {
    const cp = prog[e.course_id];
    return cp ? (cp.total > 0 && cp.percent === 100) : !!e.completed_at;
  }).length;

  const stats = [
    { i: <BookOpen size={20} />, l: 'Enrolled courses', v: enrolls.length },
    { i: <ShoppingBag size={20} />, l: 'Total orders', v: orderCount },
    { i: <TrendingUp size={20} />, l: 'Avg progress', v: `${avg}%` },
    { i: <Award size={20} />, l: 'Completed', v: completed },
  ];

  const continueList = enrolls.filter(e => {
    const cp = prog[e.course_id];
    return cp ? !(cp.total > 0 && cp.percent === 100) : !e.completed_at;
  }).slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="sp-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, hsl(var(--sp-primary) / 0.08), hsl(var(--sp-accent) / 0.08))' }}>
        <div style={{ fontSize: '.85rem', color: 'hsl(var(--sp-muted))', marginBottom: 4 }}>Welcome back</div>
        <h1 style={{ margin: 0 }}>{profile?.full_name ? profile.full_name.split(' ')[0] : 'Learner'} 👋</h1>
        <p style={{ margin: '.5rem 0 0', color: 'hsl(var(--sp-muted))' }}>Pick up where you left off and keep the momentum going.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' }}>
        {stats.map((s, i) => (
          <div key={i} className="sp-card" style={{ padding: '1rem', display: 'flex', gap: '.75rem', alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'hsl(var(--sp-primary) / 0.1)', color: 'hsl(var(--sp-primary))', display: 'grid', placeItems: 'center' }}>{s.i}</div>
            <div>
              <div style={{ color: 'hsl(var(--sp-muted))', fontSize: '.8rem' }}>{s.l}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{s.v}</div>
            </div>
          </div>
        ))}
      </div>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
          <h2 style={{ margin: 0 }}>Continue learning</h2>
          <Link to="/selfpaced/my-courses" style={{ color: 'hsl(var(--sp-primary))', fontSize: '.85rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>View all <ArrowRight size={14} /></Link>
        </div>
        {continueList.length === 0
          ? <div className="sp-card" style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--sp-muted))' }}>
              No active courses. <Link to="/selfpaced/courses" style={{ color: 'hsl(var(--sp-primary))' }}>Browse the catalog</Link>
            </div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {continueList.map(e => (
                <Link key={e.id} to={`/selfpaced/learn/${e.course_id}`} className="sp-card sp-card-hover" style={{ textDecoration: 'none', color: 'inherit', overflow: 'hidden' }}>
                  <div style={{ position: 'relative', aspectRatio: '16/10', background: 'hsl(var(--sp-bg))' }}>
                    {e.selfpaced_courses?.thumbnail_url
                      ? <img src={e.selfpaced_courses.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'hsl(var(--sp-muted))' }}><BookOpen size={30} /></div>}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.5), transparent 60%)', display: 'flex', alignItems: 'flex-end', padding: 10 }}>
                      <PlayCircle size={26} color="white" />
                    </div>
                  </div>
                  <div style={{ padding: '.85rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.selfpaced_courses?.title}</div>
                    <div style={{ height: 6, background: 'hsl(var(--sp-border))', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pctFor(e)}%`, background: 'hsl(var(--sp-success))' }} />
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'hsl(var(--sp-muted))', marginTop: 4 }}>{pctFor(e)}% complete</div>
                  </div>
                </Link>
              ))}
            </div>}
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
          <h2 style={{ margin: 0 }}>Recent orders</h2>
          <Link to="/selfpaced/orders" style={{ color: 'hsl(var(--sp-primary))', fontSize: '.85rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>View all <ArrowRight size={14} /></Link>
        </div>
        {recentOrders.length === 0
          ? <div className="sp-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'hsl(var(--sp-muted))' }}>No orders yet.</div>
          : <div className="sp-card" style={{ padding: '.5rem 1rem' }}>
              {recentOrders.map(o => (
                <Link key={o.id} to={`/selfpaced/orders/${o.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '.7rem 0', borderBottom: '1px solid hsl(var(--sp-border))', textDecoration: 'none', color: 'inherit' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.9rem' }}>#{o.order_number}</div>
                    <div style={{ fontSize: '.75rem', color: 'hsl(var(--sp-muted))' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{o.currency || 'INR'} {Number(o.total).toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '.72rem', textTransform: 'uppercase', color: o.status === 'paid' ? 'hsl(var(--sp-success))' : 'hsl(var(--sp-muted))' }}>{o.status}</div>
                  </div>
                </Link>
              ))}
            </div>}
      </section>
    </div>
  );
};

export default SpDashboard;
