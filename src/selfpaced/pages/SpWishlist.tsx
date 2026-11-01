import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { removeFromWishlist, moveWishlistToCart, formatPrice } from '@/selfpaced/lib/cart';
import { Trash2, ShoppingCart, Heart } from 'lucide-react';

const SpWishlist: React.FC = () => {
  const { user } = useSpAuth();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('selfpaced_wishlist')
      .select('id, course_id, selfpaced_courses(id,title,slug,thumbnail_url,price,original_price,currency)').eq('user_id', user.id);
    setItems(data ?? []);
  };
  useEffect(() => { void load(); }, [user?.id]);

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '2rem 1.25rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>My Wishlist</h1>
      {items.length === 0
        ? <div className="sp-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <Heart size={48} style={{ color: 'hsl(var(--sp-muted))', margin: '0 auto 1rem' }} />
            <h3>No wishlist items yet</h3>
            <Link to="/selfpaced/courses" className="sp-btn" style={{ marginTop: '1rem' }}>Browse courses</Link>
          </div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {items.map(it => {
              const c = it.selfpaced_courses;
              return (
                <div key={it.id} className="sp-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  <Link to={`/selfpaced/courses/${c.slug}`}><img src={c.thumbnail_url || '/placeholder.svg'} alt={c.title} style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', borderRadius: 6 }} /></Link>
                  <Link to={`/selfpaced/courses/${c.slug}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>{c.title}</Link>
                  <div style={{ fontWeight: 700 }}>{formatPrice(c.price, c.currency)}</div>
                  <div style={{ display: 'flex', gap: '.5rem', marginTop: 'auto' }}>
                    <button className="sp-btn" style={{ flex: 1 }} onClick={async () => { await moveWishlistToCart(user!.id, c.id); load(); }}><ShoppingCart size={14} /> Move to cart</button>
                    <button className="sp-btn sp-btn-outline" onClick={async () => { await removeFromWishlist(user!.id, c.id); load(); }}><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>}
    </div>
  );
};

export default SpWishlist;
