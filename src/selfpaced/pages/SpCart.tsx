import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { removeFromCart, formatPrice } from '@/selfpaced/lib/cart';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

const SpCart: React.FC = () => {
  const { user } = useSpAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('selfpaced_cart_items')
      .select('id, course_id, selfpaced_courses(id,title,slug,thumbnail_url,price,original_price,currency)')
      .eq('user_id', user.id);
    setItems(data ?? []); setLoading(false);
  };
  useEffect(() => { void load(); }, [user?.id]);

  const remove = async (courseId: string) => {
    await removeFromCart(user!.id, courseId); load();
  };

  const subtotal = items.reduce((s, i) => s + Number(i.selfpaced_courses?.price ?? 0), 0);
  const original = items.reduce((s, i) => s + Number(i.selfpaced_courses?.original_price ?? i.selfpaced_courses?.price ?? 0), 0);
  const savings = original - subtotal;

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '2rem 1.25rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Your Cart</h1>
      {items.length === 0
        ? <div className="sp-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <ShoppingBag size={48} style={{ color: 'hsl(var(--sp-muted))', margin: '0 auto 1rem' }} />
            <h3>Your cart is empty</h3>
            <p style={{ color: 'hsl(var(--sp-muted))' }}>Browse our catalog and add courses.</p>
            <Link to="/selfpaced/courses" className="sp-btn" style={{ marginTop: '1rem' }}>Browse courses</Link>
          </div>
        : <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }} className="sp-cart-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {items.map(it => {
                const c = it.selfpaced_courses;
                return (
                  <div key={it.id} className="sp-card" style={{ padding: '1rem', display: 'flex', gap: '1rem' }}>
                    <Link to={`/selfpaced/courses/${c.slug}`} style={{ flexShrink: 0 }}>
                      <img src={c.thumbnail_url || '/placeholder.svg'} alt={c.title} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6, background: 'hsl(var(--sp-bg))' }} />
                    </Link>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Link to={`/selfpaced/courses/${c.slug}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>{c.title}</Link>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 700 }}>{formatPrice(c.price, c.currency)}</span>
                          {c.original_price > c.price && <span style={{ marginLeft: 8, color: 'hsl(var(--sp-muted))', textDecoration: 'line-through', fontSize: '.85rem' }}>{formatPrice(c.original_price, c.currency)}</span>}
                        </div>
                        <button className="sp-btn sp-btn-ghost" onClick={() => remove(c.id)} title="Remove"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <aside className="sp-card" style={{ padding: '1.25rem', height: 'fit-content', position: 'sticky', top: 80 }}>
              <h3 style={{ marginTop: 0 }}>Order summary</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0' }}>
                <span>Items ({items.length})</span><span>{formatPrice(original)}</span>
              </div>
              {savings > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', color: 'hsl(var(--sp-success))' }}>
                  <span>Savings</span><span>-{formatPrice(savings)}</span>
                </div>
              )}
              <hr style={{ border: 0, borderTop: '1px solid hsl(var(--sp-border))', margin: '.5rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', fontWeight: 700, fontSize: '1.1rem' }}>
                <span>Total</span><span>{formatPrice(subtotal)}</span>
              </div>
              <button className="sp-btn" style={{ width: '100%', marginTop: '1rem' }} onClick={() => nav('/selfpaced/checkout')}>
                Checkout <ArrowRight size={16} />
              </button>
            </aside>
          </div>}
      <style>{`@media(max-width:800px){.sp-cart-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
};

export default SpCart;
