import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, TicketPercent, X } from 'lucide-react';

const empty = {
  id: '', code: '', name: '', description: '',
  discount_type: 'percentage', discount_value: 10,
  max_discount_limit: '', min_purchase_amount: '',
  applicable_to: 'all', course_id: '',
  coupon_type: 'multi_use', max_total_usage: '', per_user_limit: '1',
  start_date: new Date().toISOString().slice(0, 16), expiry_date: '',
  is_active: true,
};

const SpAdminCoupons: React.FC = () => {
  const { user } = useSpAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: co }, { data: u }] = await Promise.all([
      supabase.from('sp_coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('selfpaced_courses').select('id,title').order('title'),
      supabase.from('sp_coupon_usage').select('coupon_id'),
    ]);
    setRows(c ?? []); setCourses(co ?? []);
    const map: Record<string, number> = {};
    (u ?? []).forEach((r: any) => { map[r.coupon_id] = (map[r.coupon_id] || 0) + 1; });
    setUsage(map);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const openNew = () => { setForm({ ...empty }); setOpen(true); };
  const openEdit = (r: any) => {
    setForm({
      ...r,
      description: r.description ?? '',
      max_discount_limit: r.max_discount_limit ?? '',
      min_purchase_amount: r.min_purchase_amount ?? '',
      course_id: r.course_id ?? '',
      max_total_usage: r.max_total_usage ?? '',
      per_user_limit: r.per_user_limit ?? '',
      start_date: r.start_date ? new Date(r.start_date).toISOString().slice(0, 16) : '',
      expiry_date: r.expiry_date ? new Date(r.expiry_date).toISOString().slice(0, 16) : '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { toast.error('Code and name are required'); return; }
    const payload: any = {
      code: form.code.toUpperCase().trim(),
      name: form.name.trim(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value) || 0,
      max_discount_limit: form.max_discount_limit === '' ? null : Number(form.max_discount_limit),
      min_purchase_amount: form.min_purchase_amount === '' ? null : Number(form.min_purchase_amount),
      applicable_to: form.applicable_to,
      course_id: form.applicable_to === 'specific_course' ? (form.course_id || null) : null,
      coupon_type: form.coupon_type,
      max_total_usage: form.max_total_usage === '' ? null : Number(form.max_total_usage),
      per_user_limit: form.per_user_limit === '' ? null : Number(form.per_user_limit),
      start_date: form.start_date ? new Date(form.start_date).toISOString() : new Date().toISOString(),
      expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
      is_active: !!form.is_active,
    };
    const { error } = form.id
      ? await supabase.from('sp_coupons').update(payload).eq('id', form.id)
      : await supabase.from('sp_coupons').insert({ ...payload, created_by: user!.id });
    if (error) { toast.error(error.message); return; }
    toast.success(form.id ? 'Coupon updated' : 'Coupon created');
    setOpen(false); load();
  };

  const toggle = async (r: any) => {
    const { error } = await supabase.from('sp_coupons').update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (r: any) => {
    if (!confirm(`Delete coupon ${r.code}?`)) return;
    const { error } = await supabase.from('sp_coupons').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('Coupon deleted'); load();
  };

  const field = (label: string, node: React.ReactNode) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', fontSize: '.8rem', fontWeight: 600 }}>
      {label}{node}
    </label>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, display: 'flex', gap: '.5rem', alignItems: 'center' }}><TicketPercent size={22} /> Coupons</h1>
        <button className="sp-btn" onClick={openNew}><Plus size={16} /> New coupon</button>
      </div>

      {loading ? <p>Loading...</p> : rows.length === 0 ? (
        <div className="sp-card" style={{ padding: '2.5rem', textAlign: 'center' }}>No coupons yet.</div>
      ) : (
        <div className="sp-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: 'hsl(var(--sp-bg))' }}>
                {['Code', 'Name', 'Discount', 'Applies to', 'Used', 'Valid till', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '.7rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid hsl(var(--sp-border))' }}>
                  <td style={{ padding: '.7rem', fontWeight: 700 }}>{r.code}</td>
                  <td style={{ padding: '.7rem' }}>{r.name}</td>
                  <td style={{ padding: '.7rem' }}>
                    {r.discount_type === 'percentage' ? `${r.discount_value}%` : `₹${r.discount_value}`}
                    {r.max_discount_limit ? ` (max ₹${r.max_discount_limit})` : ''}
                  </td>
                  <td style={{ padding: '.7rem' }}>
                    {r.applicable_to === 'all' ? 'All courses' : (courses.find(c => c.id === r.course_id)?.title ?? 'Specific course')}
                  </td>
                  <td style={{ padding: '.7rem' }}>{usage[r.id] || 0}{r.max_total_usage ? ` / ${r.max_total_usage}` : ''}</td>
                  <td style={{ padding: '.7rem' }}>{r.expiry_date ? new Date(r.expiry_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '.7rem' }}>
                    <button className="sp-btn sp-btn-ghost" onClick={() => toggle(r)} style={{ fontSize: '.75rem' }}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: '.7rem', display: 'flex', gap: '.35rem' }}>
                    <button className="sp-btn sp-btn-ghost" onClick={() => openEdit(r)}><Pencil size={15} /></button>
                    <button className="sp-btn sp-btn-ghost" onClick={() => remove(r)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 60, padding: '1rem' }} onClick={() => setOpen(false)}>
          <div className="sp-card" style={{ padding: '1.25rem', width: 'min(720px, 100%)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{form.id ? 'Edit coupon' : 'New coupon'}</h2>
              <button className="sp-btn sp-btn-ghost" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginTop: '1rem' }}>
              {field('Coupon code *', <input className="sp-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE20" />)}
              {field('Display name *', <input className="sp-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Festive offer" />)}
              {field('Description', <input className="sp-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />)}
              {field('Discount type', (
                <select className="sp-input" value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed amount (₹)</option>
                </select>
              ))}
              {field('Discount value', <input className="sp-input" type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} />)}
              {field('Max discount limit (₹)', <input className="sp-input" type="number" value={form.max_discount_limit} onChange={e => setForm({ ...form, max_discount_limit: e.target.value })} placeholder="No limit" />)}
              {field('Min purchase amount (₹)', <input className="sp-input" type="number" value={form.min_purchase_amount} onChange={e => setForm({ ...form, min_purchase_amount: e.target.value })} placeholder="None" />)}
              {field('Applicable to', (
                <select className="sp-input" value={form.applicable_to} onChange={e => setForm({ ...form, applicable_to: e.target.value })}>
                  <option value="all">All courses</option>
                  <option value="specific_course">Specific course</option>
                </select>
              ))}
              {form.applicable_to === 'specific_course' && field('Course', (
                <select className="sp-input" value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })}>
                  <option value="">Select course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              ))}
              {field('Coupon type', (
                <select className="sp-input" value={form.coupon_type} onChange={e => setForm({ ...form, coupon_type: e.target.value })}>
                  <option value="multi_use">Multi use</option>
                  <option value="one_time">One time (global)</option>
                </select>
              ))}
              {field('Max total usage', <input className="sp-input" type="number" value={form.max_total_usage} onChange={e => setForm({ ...form, max_total_usage: e.target.value })} placeholder="Unlimited" />)}
              {field('Per user limit', <input className="sp-input" type="number" value={form.per_user_limit} onChange={e => setForm({ ...form, per_user_limit: e.target.value })} placeholder="Unlimited" />)}
              {field('Start date', <input className="sp-input" type="datetime-local" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />)}
              {field('Expiry date', <input className="sp-input" type="datetime-local" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />)}
              <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontSize: '.85rem', fontWeight: 600 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem', marginTop: '1rem' }}>
              <button className="sp-btn sp-btn-outline" onClick={() => setOpen(false)}>Cancel</button>
              <button className="sp-btn" onClick={save}>{form.id ? 'Save changes' : 'Create coupon'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpAdminCoupons;
