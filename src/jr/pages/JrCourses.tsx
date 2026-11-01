import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { JrLayout } from '@/jr/components/JrLayout';
import { supabase } from '@/integrations/supabase/client';
import { Search, BookOpen } from 'lucide-react';

export default function JrCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState<string | 'all'>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: ks }] = await Promise.all([
        supabase.from('jr_courses').select('*, jr_categories(name, color, icon)').eq('is_published', true),
        supabase.from('jr_categories').select('*').eq('is_active', true).order('order_index'),
      ]);
      setCourses(cs ?? []);
      setCats(ks ?? []);
    })();
  }, []);

  const filtered = courses.filter((c) => {
    const matchCat = activeCat === 'all' || c.category_id === activeCat;
    const matchQ = !q || c.title?.toLowerCase().includes(q.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <JrLayout>
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Cool Courses for You 🚀</h1>
          <p className="text-[hsl(var(--jr-muted))]">Pick a subject and start your adventure</p>
        </div>

        <div className="relative max-w-xl mx-auto mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--jr-muted))]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses..."
            className="jr-input !pl-12" />
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button onClick={() => setActiveCat('all')}
            className={`px-5 py-2 rounded-full font-bold ${activeCat === 'all' ? 'bg-[hsl(var(--jr-primary))] text-white' : 'bg-white border-2 border-[hsl(var(--jr-border))]'}`}>
            All
          </button>
          {cats.map((c) => (
            <button key={c.id} onClick={() => setActiveCat(c.id)}
              className={`px-5 py-2 rounded-full font-bold ${activeCat === c.id ? 'bg-[hsl(var(--jr-primary))] text-white' : 'bg-white border-2 border-[hsl(var(--jr-border))]'}`}>
              {c.icon ?? '✨'} {c.name}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="jr-card p-12 text-center">
            <div className="text-6xl mb-3">🔍</div>
            <p className="text-[hsl(var(--jr-muted))]">No courses found yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filtered.map((c) => (
              <Link key={c.id} to={`/jr/courses/${c.id}`} className="jr-card overflow-hidden group">
                <div className="aspect-video bg-gradient-to-br from-[hsl(var(--jr-primary)/0.2)] to-[hsl(var(--jr-pink)/0.2)] flex items-center justify-center text-6xl">
                  {c.thumbnail_url ? <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" /> : '📘'}
                </div>
                <div className="p-5">
                  {c.grade_level && <span className="jr-chip mb-2">{c.grade_level}</span>}
                  <div className="text-lg font-extrabold mb-1">{c.title}</div>
                  <div className="text-sm text-[hsl(var(--jr-muted))] line-clamp-2">{c.description}</div>
                  <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[hsl(var(--jr-primary))] group-hover:gap-3 transition-all">
                    Start Learning <BookOpen className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </JrLayout>
  );
}
