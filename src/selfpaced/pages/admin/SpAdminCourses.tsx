import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, BookOpenText, GraduationCap } from 'lucide-react';
import { formatPrice } from '@/selfpaced/lib/cart';

const emptyCourse = { title: '', slug: '', short_description: '', description: '', price: 0, original_price: 0, currency: 'INR', level: 'beginner', duration_hours: 0, is_published: false, is_featured: false, category_id: null, thumbnail_url: '', program_overview: '', what_you_will_learn: [] as string[], key_highlights: [] as string[], tools_covered: [] as string[], skills_developed: [] as string[] };

const linesToArr = (v: string) => v.split('\n').map(s => s.trim()).filter(Boolean);
const arrToLines = (a: string[] | null | undefined) => (a ?? []).join('\n');

const SpAdminCourses: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    const [{ data: cs }, { data: ks }] = await Promise.all([
      supabase.from('selfpaced_courses').select('*, selfpaced_categories(name)').order('created_at', { ascending: false }),
      supabase.from('selfpaced_categories').select('*').order('display_order'),
    ]);
    setRows(cs ?? []); setCats(ks ?? []);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!editing?.title) { toast.error('Title required'); return; }
    const payload = {
      title: editing.title,
      slug: editing.slug || editing.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      short_description: editing.short_description,
      description: editing.description,
      price: Number(editing.price) || 0,
      original_price: editing.original_price ? Number(editing.original_price) : null,
      currency: editing.currency || 'INR',
      level: editing.level,
      duration_hours: Number(editing.duration_hours) || 0,
      thumbnail_url: editing.thumbnail_url,
      is_published: !!editing.is_published,
      is_featured: !!editing.is_featured,
      category_id: editing.category_id || null,
      program_overview: editing.program_overview || null,
      what_you_will_learn: Array.isArray(editing.what_you_will_learn) ? editing.what_you_will_learn : linesToArr(editing.what_you_will_learn || ''),
      key_highlights: Array.isArray(editing.key_highlights) ? editing.key_highlights : linesToArr(editing.key_highlights || ''),
      tools_covered: Array.isArray(editing.tools_covered) ? editing.tools_covered : linesToArr(editing.tools_covered || ''),
      skills_developed: Array.isArray(editing.skills_developed) ? editing.skills_developed : linesToArr(editing.skills_developed || ''),
    };
    const { error } = editing.id
      ? await supabase.from('selfpaced_courses').update(payload).eq('id', editing.id)
      : await supabase.from('selfpaced_courses').insert({ ...payload, created_by: (await supabase.auth.getUser()).data.user?.id });
    if (error) toast.error(error.message); else { toast.success('Saved'); setEditing(null); load(); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this course? All modules & lessons will be removed.')) return;
    const { error } = await supabase.from('selfpaced_courses').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Courses</h1>
        <button className="sp-btn" onClick={() => setEditing({ ...emptyCourse })}><Plus size={16} /> New course</button>
      </div>
      <div className="sp-card" style={{ padding: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid hsl(var(--sp-border))' }}>
            <th style={{ padding: '.5rem' }}>Title</th><th>Category</th><th>Price</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--sp-border))' }}>
                <td style={{ padding: '.5rem' }}>
                  <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                    {r.thumbnail_url ? (
                      <img src={r.thumbnail_url} alt="" style={{ width: 56, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid hsl(var(--sp-border))' }} />
                    ) : (
                      <div style={{ width: 56, height: 36, borderRadius: 4, background: 'hsl(var(--sp-border))', display: 'grid', placeItems: 'center', color: 'hsl(var(--sp-muted))', fontSize: 10 }}>No image</div>
                    )}
                    <div>
                      <strong>{r.title}</strong>
                      <div style={{ color: 'hsl(var(--sp-muted))', fontSize: '.75rem' }}>{r.slug}</div>
                    </div>
                  </div>
                </td>
                <td>{r.selfpaced_categories?.name || '—'}</td>
                <td>{formatPrice(r.price, r.currency)}</td>
                <td>
                  {r.is_published ? <span className="sp-badge sp-badge-success">Published</span> : <span className="sp-badge">Draft</span>}
                  {r.is_featured && <span className="sp-badge sp-badge-accent" style={{ marginLeft: 4 }}>Featured</span>}
                </td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <Link to={`/selfpaced/admin/courses/${r.id}/curriculum`} className="sp-btn sp-btn-ghost" title="Curriculum"><BookOpenText size={14} /></Link>
                  <Link to={`/selfpaced/admin/courses/${r.id}/students`} className="sp-btn sp-btn-ghost" title="Students"><GraduationCap size={14} /></Link>
                  <button className="sp-btn sp-btn-ghost" onClick={() => setEditing(r)}><Pencil size={14} /></button>
                  <button className="sp-btn sp-btn-ghost" onClick={() => del(r.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 20 }} onClick={() => setEditing(null)}>
          <div className="sp-card" style={{ padding: '1.5rem', width: 720, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editing.id ? 'Edit' : 'New'} course</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
              <input className="sp-input" placeholder="Title *" value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              <input className="sp-input" placeholder="Slug (auto if empty)" value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} />
              <input className="sp-input" style={{ gridColumn: '1/-1' }} placeholder="Short description" value={editing.short_description || ''} onChange={e => setEditing({ ...editing, short_description: e.target.value })} />
              <textarea className="sp-input" style={{ gridColumn: '1/-1', minHeight: 100 }} placeholder="Full description" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '.8rem', color: 'hsl(var(--sp-muted))', display: 'block', marginBottom: 4 }}>Thumbnail</label>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {editing.thumbnail_url && (
                    <img src={editing.thumbnail_url} alt="thumb" style={{ width: 120, height: 75, objectFit: 'cover', borderRadius: 6, border: '1px solid hsl(var(--sp-border))' }} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const ext = file.name.split('.').pop() || 'jpg';
                      const path = `selfpaced/thumbnails/${crypto.randomUUID()}.${ext}`;
                      const { error: upErr } = await supabase.storage.from('course-media').upload(path, file, { upsert: false, contentType: file.type });
                      if (upErr) { toast.error(upErr.message); return; }
                      const { data } = supabase.storage.from('course-media').getPublicUrl(path);
                      setEditing({ ...editing, thumbnail_url: data.publicUrl });
                      toast.success('Thumbnail uploaded');
                    }}
                  />
                  {editing.thumbnail_url && (
                    <button type="button" className="sp-btn sp-btn-ghost" onClick={() => setEditing({ ...editing, thumbnail_url: '' })}>Remove</button>
                  )}
                </div>
              </div>
              <select className="sp-input" value={editing.category_id || ''} onChange={e => setEditing({ ...editing, category_id: e.target.value || null })}>
                <option value="">— Category —</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="sp-input" value={editing.level || 'beginner'} onChange={e => setEditing({ ...editing, level: e.target.value })}>
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </select>
              <input className="sp-input" type="number" placeholder="Price (INR)" value={editing.price || 0} onChange={e => setEditing({ ...editing, price: e.target.value })} />
              <input className="sp-input" type="number" placeholder="Original price (optional)" value={editing.original_price || ''} onChange={e => setEditing({ ...editing, original_price: e.target.value })} />
              <input className="sp-input" type="number" step="0.5" placeholder="Duration (hours)" value={editing.duration_hours || 0} onChange={e => setEditing({ ...editing, duration_hours: e.target.value })} />
              <input className="sp-input" placeholder="Currency" value={editing.currency || 'INR'} onChange={e => setEditing({ ...editing, currency: e.target.value })} />
              <label style={{ display: 'flex', gap: '.4rem' }}><input type="checkbox" checked={!!editing.is_published} onChange={e => setEditing({ ...editing, is_published: e.target.checked })} /> Published</label>
              <label style={{ display: 'flex', gap: '.4rem' }}><input type="checkbox" checked={!!editing.is_featured} onChange={e => setEditing({ ...editing, is_featured: e.target.checked })} /> Featured</label>

              <div style={{ gridColumn: '1/-1', borderTop: '1px solid hsl(var(--sp-border))', marginTop: '.5rem', paddingTop: '.75rem' }}>
                <strong style={{ fontSize: '.9rem' }}>Course landing page sections</strong>
                <p style={{ margin: '.15rem 0 .5rem', fontSize: '.75rem', color: 'hsl(var(--sp-muted))' }}>Enter one item per line for list fields.</p>
              </div>
              <textarea className="sp-input" style={{ gridColumn: '1/-1', minHeight: 80 }} placeholder="Program Overview (paragraph)" value={editing.program_overview || ''} onChange={e => setEditing({ ...editing, program_overview: e.target.value })} />
              <textarea className="sp-input" style={{ minHeight: 100 }} placeholder="What You Will Learn (one per line)" value={Array.isArray(editing.what_you_will_learn) ? arrToLines(editing.what_you_will_learn) : (editing.what_you_will_learn || '')} onChange={e => setEditing({ ...editing, what_you_will_learn: e.target.value })} />
              <textarea className="sp-input" style={{ minHeight: 100 }} placeholder="Key Highlights (one per line)" value={Array.isArray(editing.key_highlights) ? arrToLines(editing.key_highlights) : (editing.key_highlights || '')} onChange={e => setEditing({ ...editing, key_highlights: e.target.value })} />
              <textarea className="sp-input" style={{ minHeight: 100 }} placeholder="Tools Covered (one per line)" value={Array.isArray(editing.tools_covered) ? arrToLines(editing.tools_covered) : (editing.tools_covered || '')} onChange={e => setEditing({ ...editing, tools_covered: e.target.value })} />
              <textarea className="sp-input" style={{ minHeight: 100 }} placeholder="Skills Developed After Completion (one per line)" value={Array.isArray(editing.skills_developed) ? arrToLines(editing.skills_developed) : (editing.skills_developed || '')} onChange={e => setEditing({ ...editing, skills_developed: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem', marginTop: '1rem' }}>
              <button className="sp-btn sp-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="sp-btn" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpAdminCourses;
