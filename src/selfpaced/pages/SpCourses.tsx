import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SpCourseCard, SpCourseCardData } from '@/selfpaced/components/SpCourseCard';
import { Search } from 'lucide-react';

const SpCourses: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [courses, setCourses] = useState<SpCourseCardData[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const q = params.get('q') || '';
  const cat = params.get('category') || '';
  const level = params.get('level') || '';

  useEffect(() => {
    supabase.from('selfpaced_categories').select('id,name,slug').eq('is_active', true).order('display_order')
      .then(({ data }) => setCats(data ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    (async () => {
      let catId: string | null = null;
      if (cat) {
        const { data: catRow } = await supabase.from('selfpaced_categories').select('id').eq('slug', cat).maybeSingle();
        catId = catRow?.id ?? null;
      }
      let query: any = supabase.from('selfpaced_courses')
        .select('id,title,slug,short_description,thumbnail_url,level,duration_hours,price,original_price,currency,is_featured,category_id')
        .eq('is_published', true);
      if (q) query = query.ilike('title', `%${q}%`);
      if (catId) query = query.eq('category_id', catId);
      if (level) query = query.eq('level', level);
      const { data } = await query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
      setCourses((data as any) ?? []); setLoading(false);
    })();
  }, [q, cat, level]);

  const setP = (k: string, v: string) => {
    const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n);
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.25rem', display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem' }}>
      <aside className="sp-card" style={{ padding: '1rem', height: 'fit-content', position: 'sticky', top: 80 }}>
        <h4 style={{ margin: '0 0 .75rem' }}>Filters</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '1rem' }}>
          <label style={{ fontSize: '.75rem', color: 'hsl(var(--sp-muted))', textTransform: 'uppercase' }}>Category</label>
          <button className="sp-btn sp-btn-ghost" style={{ justifyContent: 'flex-start', padding: '.4rem .5rem', fontWeight: cat ? 400 : 700 }} onClick={() => setP('category', '')}>All</button>
          {cats.map(c => (
            <button key={c.id} className="sp-btn sp-btn-ghost"
              style={{ justifyContent: 'flex-start', padding: '.4rem .5rem', fontWeight: cat === c.slug ? 700 : 400 }}
              onClick={() => setP('category', c.slug)}>{c.name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
          <label style={{ fontSize: '.75rem', color: 'hsl(var(--sp-muted))', textTransform: 'uppercase' }}>Level</label>
          {['', 'beginner', 'intermediate', 'advanced'].map(l => (
            <button key={l || 'all'} className="sp-btn sp-btn-ghost"
              style={{ justifyContent: 'flex-start', padding: '.4rem .5rem', fontWeight: level === l ? 700 : 400, textTransform: 'capitalize' }}
              onClick={() => setP('level', l)}>{l || 'All levels'}</button>
          ))}
        </div>
      </aside>

      <div>
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--sp-muted))' }} />
            <input className="sp-input" placeholder="Search courses..." value={q} onChange={e => setP('q', e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
        </div>
        <p style={{ color: 'hsl(var(--sp-muted))', fontSize: '.85rem' }}>{loading ? 'Loading...' : `${courses.length} course${courses.length !== 1 ? 's' : ''}`}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {courses.map(c => <SpCourseCard key={c.id} course={c} />)}
        </div>
        {!loading && courses.length === 0 && <div className="sp-card" style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--sp-muted))' }}>No courses match your filters.</div>}
      </div>

      <style>{`@media(max-width:800px){.sp-scope aside{display:none}[data-page-courses]{grid-template-columns:1fr}}`}</style>
    </div>
  );
};

export default SpCourses;
