import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { addToCart, addToWishlist, formatPrice } from '@/selfpaced/lib/cart';
import { Heart, ShoppingCart, Clock, BookOpen, Star } from 'lucide-react';

export interface SpCourseCardData {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  level: string | null;
  duration_hours: number | null;
  price: number;
  original_price: number | null;
  currency: string;
  is_featured?: boolean;
}

export const SpCourseCard: React.FC<{ course: SpCourseCardData }> = ({ course }) => {
  const { user } = useSpAuth();
  const [owned, setOwned] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('selfpaced_enrollments')
        .select('id,progress_percentage').eq('user_id', user.id).eq('course_id', course.id).maybeSingle();
      if (!data) { setOwned(false); setProgress(0); return; }
      setOwned(true);
      const { computeSpProgress } = await import('@/selfpaced/lib/spProgress');
      const p = await computeSpProgress(user.id, [course.id]);
      const live = p[course.id];
      setProgress(live && live.total > 0 ? live.percent : Number((data as any).progress_percentage ?? 0));
    })();
  }, [user?.id, course.id]);

  const discount = course.original_price && course.original_price > course.price
    ? Math.round(((course.original_price - course.price) / course.original_price) * 100) : 0;

  const handleCart = async () => {
    if (!user) { window.location.href = '/selfpaced/auth?redirect=/selfpaced/courses/' + course.slug; return; }
    setBusy(true); await addToCart(user.id, course.id); setBusy(false);
  };
  const handleWish = async () => {
    if (!user) { window.location.href = '/selfpaced/auth'; return; }
    setBusy(true); await addToWishlist(user.id, course.id); setBusy(false);
  };

  return (
    <div className="sp-card sp-card-hover" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <Link to={`/selfpaced/courses/${course.slug}`} style={{ display: 'block', position: 'relative', aspectRatio: '16/10', overflow: 'hidden' }}>
        <div style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(135deg, hsl(var(--sp-primary)/.15), hsl(var(--sp-bg)))',
        }}>
          {course.thumbnail_url
            ? <img
                src={course.thumbnail_url}
                alt={course.title}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            : <div style={{ color: 'hsl(var(--sp-muted))' }}><BookOpen size={40} /></div>}
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 45%)', pointerEvents: 'none' }} />
        {course.is_featured && <span className="sp-badge sp-badge-accent" style={{ position: 'absolute', top: 10, left: 10, boxShadow: '0 2px 8px rgba(0,0,0,.25)' }}>Featured</span>}
        {discount > 0 && <span className="sp-badge sp-badge-danger" style={{ position: 'absolute', top: 10, right: 10, boxShadow: '0 2px 8px rgba(0,0,0,.25)' }}>-{discount}%</span>}
        {owned && <span className="sp-badge sp-badge-success" style={{ position: 'absolute', bottom: 10, left: 10, boxShadow: '0 2px 8px rgba(0,0,0,.25)' }}>Enrolled</span>}
      </Link>
      <div style={{ padding: '.9rem', display: 'flex', flexDirection: 'column', gap: '.55rem', flex: 1 }}>
        <Link to={`/selfpaced/courses/${course.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          <h3 style={{ margin: 0, fontSize: '.98rem', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.title}</h3>
        </Link>
        {course.short_description && <p style={{ margin: 0, color: 'hsl(var(--sp-muted))', fontSize: '.82rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.short_description}</p>}
        <div style={{ display: 'flex', gap: '.5rem', color: 'hsl(var(--sp-muted))', fontSize: '.78rem' }}>
          {course.level && <span className="sp-badge">{course.level}</span>}
          {course.duration_hours ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Clock size={12} /> {course.duration_hours}h</span> : null}
        </div>
        {owned && (
          <div>
            <div style={{ height: 6, background: 'hsl(var(--sp-border))', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'hsl(var(--sp-success))' }} />
            </div>
            <div style={{ fontSize: '.72rem', color: 'hsl(var(--sp-muted))', marginTop: 3 }}>{progress}% complete</div>
          </div>
        )}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{formatPrice(course.price, course.currency)}</div>
            {course.original_price && course.original_price > course.price &&
              <div style={{ fontSize: '.78rem', color: 'hsl(var(--sp-muted))', textDecoration: 'line-through' }}>{formatPrice(course.original_price, course.currency)}</div>}
          </div>
          {owned
            ? <Link to={`/selfpaced/learn/${course.id}`} className="sp-btn">Continue</Link>
            : <div style={{ display: 'flex', gap: 4 }}>
                <button className="sp-btn sp-btn-outline" title="Wishlist" onClick={handleWish} disabled={busy} style={{ padding: '.55rem .7rem' }}><Heart size={16} /></button>
                <button className="sp-btn" title="Add to cart" onClick={handleCart} disabled={busy} style={{ padding: '.55rem .7rem' }}><ShoppingCart size={16} /></button>
              </div>}
        </div>
      </div>
    </div>
  );
};