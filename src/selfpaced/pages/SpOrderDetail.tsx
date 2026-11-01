import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { formatPrice } from '@/selfpaced/lib/cart';
import { downloadSpInvoice } from '@/selfpaced/lib/spInvoice';
import { CheckCircle2, FileDown } from 'lucide-react';

const SpOrderDetail: React.FC = () => {
  const { orderId } = useParams();
  const { user, profile } = useSpAuth();
  const [params] = useSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !orderId) return;
    (async () => {
      const { data: o } = await supabase.from('selfpaced_orders').select('*').eq('id', orderId).maybeSingle();
      setOrder(o);
      const { data: is } = await supabase.from('selfpaced_order_items').select('*, selfpaced_courses(id,title,slug,thumbnail_url)').eq('order_id', orderId);
      setItems(is ?? []);
    })();
  }, [user?.id, orderId]);

  if (!order) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.25rem' }}>
      {params.get('success') && (
        <div className="sp-card" style={{ padding: '1.5rem', marginBottom: '1rem', background: 'hsl(var(--sp-success) / 0.08)', border: '1px solid hsl(var(--sp-success) / 0.3)', display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <CheckCircle2 size={32} style={{ color: 'hsl(var(--sp-success))' }} />
          <div><strong>Payment successful!</strong><div style={{ color: 'hsl(var(--sp-muted))', fontSize: '.85rem' }}>Your courses are now available in "My courses".</div></div>
        </div>
      )}
      <div className="sp-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Order #{order.order_number}</h2>
            <div style={{ color: 'hsl(var(--sp-muted))', fontSize: '.85rem' }}>{new Date(order.created_at).toLocaleString('en-IN')}</div>
          </div>
          <span className={`sp-badge ${order.status === 'paid' ? 'sp-badge-success' : order.status === 'pending' ? 'sp-badge-accent' : 'sp-badge-danger'}`}>{order.status}</span>
        </div>
        <h3>Items</h3>
        {items.map(it => (
          <div key={it.id} style={{ display: 'flex', gap: '.75rem', padding: '.75rem 0', borderTop: '1px solid hsl(var(--sp-border))' }}>
            <img src={it.selfpaced_courses?.thumbnail_url || '/placeholder.svg'} style={{ width: 80, height: 55, objectFit: 'cover', borderRadius: 4 }} />
            <div style={{ flex: 1 }}>
              <Link to={`/selfpaced/courses/${it.selfpaced_courses?.slug}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>{it.title}</Link>
              <div style={{ marginTop: '.35rem', display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                {order.status === 'paid' && <Link to={`/selfpaced/learn/${it.course_id}`} className="sp-btn" style={{ padding: '.3rem .7rem', fontSize: '.8rem' }}>Start learning</Link>}
                <button
                  className="sp-btn sp-btn-outline"
                  style={{ padding: '.3rem .7rem', fontSize: '.8rem' }}
                  onClick={() => downloadSpInvoice({
                    invoiceNumber: `INV-${order.order_number}-${(it.id || '').slice(0, 6).toUpperCase()}`,
                    date: order.created_at,
                    studentName: profile?.full_name || user?.email || 'Student',
                    studentEmail: user?.email || '',
                    courseTitle: it.title,
                    amount: Number(it.price || 0),
                    currency: order.currency,
                    status: order.status,
                    orderNumber: order.order_number,
                    paymentMethod: order.payment_method || 'Razorpay',
                  })}
                >
                  <FileDown size={14} /> Invoice
                </button>
              </div>
            </div>
            <div style={{ fontWeight: 600 }}>{formatPrice(Number(it.price), order.currency)}</div>
          </div>
        ))}
        <hr style={{ border: 0, borderTop: '1px solid hsl(var(--sp-border))', margin: '1rem 0 .5rem' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}><span>Total paid</span><span>{formatPrice(Number(order.total), order.currency)}</span></div>
      </div>
    </div>
  );
};

export default SpOrderDetail;
