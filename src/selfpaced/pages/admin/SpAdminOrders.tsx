import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/selfpaced/lib/cart';

type Row = {
  key: string;
  order_id: string;
  customer_name: string;
  email: string;
  phone: string;
  course_name: string;
  status: string;
  purchase_date: string;
  price: number;
  currency: string;
  remarks: string;
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    paid: 'Paid', pending: 'Pending', failed: 'Failed', refunded: 'Refunded',
    free: 'Free Enrollment', assigned: 'Admin Assigned',
  };
  return map[s] || s;
};

const badgeClass = (s: string) => {
  if (s === 'paid' || s === 'free' || s === 'assigned') return 'sp-badge sp-badge-success';
  if (s === 'pending') return 'sp-badge sp-badge-accent';
  return 'sp-badge sp-badge-danger';
};

const SpAdminOrders: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // 1. Paid/pending/failed orders (with items + profile)
    const { data: orders } = await supabase
      .from('selfpaced_orders')
      .select('id, order_number, user_id, status, total, currency, created_at, paid_at, razorpay_payment_id, selfpaced_profiles!inner(email, full_name, phone), selfpaced_order_items(id, course_id, title, price)')
      .order('created_at', { ascending: false })
      .limit(2000);

    // 2. Free / assigned enrollments (no order)
    const { data: enrolls } = await supabase
      .from('selfpaced_enrollments')
      .select('id, user_id, course_id, source, enrolled_at, order_id, selfpaced_profiles!inner(email, full_name, phone), selfpaced_courses!inner(title, price, currency)')
      .is('order_id', null)
      .order('enrolled_at', { ascending: false })
      .limit(2000);

    const out: Row[] = [];
    (orders ?? []).forEach((o: any) => {
      const items = o.selfpaced_order_items ?? [];
      if (items.length === 0) {
        out.push({
          key: o.id,
          order_id: o.order_number,
          customer_name: o.selfpaced_profiles?.full_name || '—',
          email: o.selfpaced_profiles?.email || '',
          phone: o.selfpaced_profiles?.phone || '',
          course_name: '—',
          status: o.status,
          purchase_date: o.paid_at || o.created_at,
          price: Number(o.total ?? 0),
          currency: o.currency || 'INR',
          remarks: o.razorpay_payment_id ? `Razorpay: ${o.razorpay_payment_id}` : '',
        });
      } else {
        items.forEach((it: any) => {
          out.push({
            key: `${o.id}-${it.id}`,
            order_id: o.order_number,
            customer_name: o.selfpaced_profiles?.full_name || '—',
            email: o.selfpaced_profiles?.email || '',
            phone: o.selfpaced_profiles?.phone || '',
            course_name: it.title,
            status: o.status,
            purchase_date: o.paid_at || o.created_at,
            price: Number(it.price ?? 0),
            currency: o.currency || 'INR',
            remarks: o.razorpay_payment_id ? `Razorpay: ${o.razorpay_payment_id}` : '',
          });
        });
      }
    });
    (enrolls ?? []).forEach((e: any) => {
      const src = (e.source || 'free').toLowerCase();
      const isFree = Number(e.selfpaced_courses?.price ?? 0) === 0;
      const s = src === 'admin' || src === 'assigned' ? 'assigned' : (isFree ? 'free' : (src || 'free'));
      out.push({
        key: `enr-${e.id}`,
        order_id: `ENR-${String(e.id).slice(0, 8).toUpperCase()}`,
        customer_name: e.selfpaced_profiles?.full_name || '—',
        email: e.selfpaced_profiles?.email || '',
        phone: e.selfpaced_profiles?.phone || '',
        course_name: e.selfpaced_courses?.title || '—',
        status: s,
        purchase_date: e.enrolled_at,
        price: Number(e.selfpaced_courses?.price ?? 0),
        currency: e.selfpaced_courses?.currency || 'INR',
        remarks: src === 'admin' ? 'Enrolled by admin' : (isFree ? 'Free course auto-enroll' : ''),
      });
    });

    out.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
    setRows(out);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('sp-admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'selfpaced_orders' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'selfpaced_order_items' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'selfpaced_enrollments' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const filtered = useMemo(() => {
    const fromMs = from ? new Date(from + 'T00:00:00').getTime() : null;
    const toMs = to ? new Date(to + 'T23:59:59').getTime() : null;
    return rows.filter(r => {
      if (status && r.status !== status) return false;
      const t = new Date(r.purchase_date).getTime();
      if (fromMs !== null && t < fromMs) return false;
      if (toMs !== null && t > toMs) return false;
      return true;
    });
  }, [rows, status, from, to]);

  const exportExcel = () => {
    const flat = filtered.map(r => ({
      'Order ID': r.order_id,
      'Customer Name': r.customer_name,
      'Email': r.email,
      'Mobile Number': r.phone,
      'Course Name': r.course_name,
      'Status': statusLabel(r.status),
      'Purchase Date': new Date(r.purchase_date).toLocaleString('en-IN'),
      'Price': r.price,
      'Currency': r.currency,
      'Remarks': r.remarks,
    }));
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `selfpaced-orders-${stamp}.xlsx`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ marginTop: 0 }}>Orders</h1>
        <button className="sp-btn" onClick={exportExcel} disabled={filtered.length === 0}>
          <Download size={16} /> Export to Excel
        </button>
      </div>
      <div style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="sp-input" style={{ maxWidth: 200 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="free">Free Enrollment</option>
          <option value="assigned">Admin Assigned</option>
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.85rem' }}>
          From <input type="date" className="sp-input" value={from} onChange={e => setFrom(e.target.value)} style={{ maxWidth: 160 }} />
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.85rem' }}>
          To <input type="date" className="sp-input" value={to} onChange={e => setTo(e.target.value)} style={{ maxWidth: 160 }} />
        </label>
        {(from || to || status) && (
          <button className="sp-btn sp-btn-ghost" onClick={() => { setFrom(''); setTo(''); setStatus(''); }}>Clear</button>
        )}
        <span style={{ fontSize: '.8rem', color: 'hsl(var(--sp-muted))', marginLeft: 'auto' }}>
          {loading ? 'Loading…' : `${filtered.length} of ${rows.length} orders · live updating`}
        </span>
      </div>
      <div className="sp-card" style={{ padding: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.86rem', minWidth: 1100 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid hsl(var(--sp-border))' }}>
              <th style={{ padding: '.5rem' }}>Order ID</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Course</th>
              <th>Status</th>
              <th>Purchase Date</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.key} style={{ borderBottom: '1px solid hsl(var(--sp-border))' }}>
                <td style={{ padding: '.5rem', fontWeight: 600 }}>#{r.order_id}</td>
                <td>{r.customer_name}</td>
                <td style={{ fontSize: '.8rem' }}>{r.email}</td>
                <td>{r.phone || '—'}</td>
                <td>{r.course_name}</td>
                <td><span className={badgeClass(r.status)}>{statusLabel(r.status)}</span></td>
                <td>{new Date(r.purchase_date).toLocaleString('en-IN')}</td>
                <td style={{ textAlign: 'right' }}>{r.price > 0 ? formatPrice(r.price, r.currency) : 'Free'}</td>
                <td style={{ fontSize: '.78rem', color: 'hsl(var(--sp-muted))' }}>{r.remarks || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--sp-muted))' }}>No orders.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SpAdminOrders;
