import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { formatPrice } from '@/selfpaced/lib/cart';
import { downloadSpInvoice, previewSpInvoice, type SpInvoiceData } from '@/selfpaced/lib/spInvoice';
import { FileDown, Eye, X } from 'lucide-react';
import { toast } from 'sonner';

const SpOrders: React.FC = () => {
  const { user, profile } = useSpAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [freeEnrolls, setFreeEnrolls] = useState<any[]>([]);
  const [preview, setPreview] = useState<{ url: string; name: string; data: SpInvoiceData } | null>(null);

  const openPreview = (data: SpInvoiceData) => {
    const url = previewSpInvoice(data);
    setPreview({ url, name: data.invoiceNumber, data });
  };
  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('selfpaced_orders')
      .select('*, selfpaced_order_items(id,title,price,course_id)')
      .eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data ?? []));
    // Enrollments that DON'T have an associated paid order → treat as free / manual
    supabase.from('selfpaced_enrollments')
      .select('id,enrolled_at,source,course_id,order_id, selfpaced_courses(title,slug,currency,price)')
      .eq('user_id', user.id).order('enrolled_at', { ascending: false })
      .then(({ data }) => {
        setFreeEnrolls((data ?? []).filter((e: any) => !e.order_id));
      });
  }, [user?.id]);

  const invoiceForOrderItem = (order: any, it: any) => ({
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
  });

  const invoiceForEnrollment = (e: any) => ({
    invoiceNumber: `SP-${(e.id || '').slice(0, 8).toUpperCase()}`,
    date: e.enrolled_at || new Date(),
    studentName: profile?.full_name || user?.email || 'Student',
    studentEmail: user?.email || '',
    courseTitle: e.selfpaced_courses?.title || 'Course',
    amount: Number(e.selfpaced_courses?.price || 0),
    currency: e.selfpaced_courses?.currency || 'INR',
    status: Number(e.selfpaced_courses?.price || 0) === 0 ? 'enrolled (free)' : 'enrolled',
  });

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section>
        <h1 style={{ marginTop: 0 }}>My Orders</h1>
        {orders.length === 0
          ? <div className="sp-card" style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--sp-muted))' }}>You have no paid orders yet. <Link to="/selfpaced/courses" style={{ color: 'hsl(var(--sp-primary))' }}>Browse courses</Link></div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {orders.map(o => (
                <div key={o.id} className="sp-card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>#{o.order_number}</div>
                      <div style={{ color: 'hsl(var(--sp-muted))', fontSize: '.85rem' }}>
                        {new Date(o.created_at).toLocaleString('en-IN')} · {o.selfpaced_order_items?.length ?? 0} items
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                      <span className={`sp-badge ${o.status === 'paid' ? 'sp-badge-success' : o.status === 'pending' ? 'sp-badge-accent' : 'sp-badge-danger'}`}>{o.status}</span>
                      <strong>{formatPrice(Number(o.total), o.currency)}</strong>
                      {(o.selfpaced_order_items?.[0]) && (
                        <button
                          onClick={() => openPreview(invoiceForOrderItem(o, o.selfpaced_order_items[0]))}
                          className="sp-btn sp-btn-outline"
                          style={{ padding: '.35rem .7rem', fontSize: '.8rem' }}
                        >
                          <Eye size={14} /> View
                        </button>
                      )}
                    </div>
                  </div>
                  {(o.selfpaced_order_items ?? []).length > 0 && (
                    <div style={{ marginTop: '.75rem', borderTop: '1px solid hsl(var(--sp-border))', paddingTop: '.6rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                      {o.selfpaced_order_items.map((it: any) => (
                        <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem', fontSize: '.85rem' }}>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                          <span style={{ color: 'hsl(var(--sp-muted))' }}>{formatPrice(Number(it.price), o.currency)}</span>
                          <button
                            className="sp-btn sp-btn-ghost"
                            style={{ padding: '.25rem .5rem', fontSize: '.75rem' }}
                            onClick={() => openPreview(invoiceForOrderItem(o, it))}
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            className="sp-btn sp-btn-ghost"
                            style={{ padding: '.25rem .5rem', fontSize: '.75rem' }}
                            onClick={() => { downloadSpInvoice(invoiceForOrderItem(o, it)); toast.success('Invoice downloaded'); }}
                          >
                            <FileDown size={13} /> Invoice
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>}
      </section>

      {freeEnrolls.length > 0 && (
        <section>
          <h2 style={{ marginTop: 0 }}>Free / Assigned Enrollments</h2>
          <div className="sp-card" style={{ padding: '.5rem 1rem' }}>
            {freeEnrolls.map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem', padding: '.7rem 0', borderBottom: '1px solid hsl(var(--sp-border))', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{e.selfpaced_courses?.title}</div>
                  <div style={{ fontSize: '.75rem', color: 'hsl(var(--sp-muted))' }}>
                    Enrolled {new Date(e.enrolled_at).toLocaleDateString('en-IN')} · {Number(e.selfpaced_courses?.price || 0) === 0 ? 'FREE' : formatPrice(Number(e.selfpaced_courses?.price), e.selfpaced_courses?.currency || 'INR')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '.4rem' }}>
                  <button className="sp-btn sp-btn-outline" style={{ padding: '.3rem .6rem', fontSize: '.78rem' }}
                    onClick={() => openPreview(invoiceForEnrollment(e))}>
                    <Eye size={13} /> View
                  </button>
                  <button className="sp-btn" style={{ padding: '.3rem .6rem', fontSize: '.78rem' }}
                    onClick={() => { downloadSpInvoice(invoiceForEnrollment(e)); toast.success('Invoice downloaded'); }}>
                    <FileDown size={13} /> Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {preview && (
        <div
          onClick={closePreview}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'hsl(var(--sp-bg))', borderRadius: 8, width: 'min(900px, 100%)', height: 'min(90vh, 900px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid hsl(var(--sp-border))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.6rem .9rem', borderBottom: '1px solid hsl(var(--sp-border))' }}>
              <strong>Invoice · {preview.name}</strong>
              <div style={{ display: 'flex', gap: '.4rem' }}>
                <button className="sp-btn" style={{ padding: '.3rem .7rem', fontSize: '.8rem' }}
                  onClick={() => { downloadSpInvoice(preview.data); toast.success('Invoice downloaded'); }}>
                  <FileDown size={14} /> Download
                </button>
                <button className="sp-btn sp-btn-ghost" style={{ padding: '.3rem .5rem' }} onClick={closePreview}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <iframe title="Invoice preview" src={preview.url} style={{ flex: 1, border: 0, width: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SpOrders;
