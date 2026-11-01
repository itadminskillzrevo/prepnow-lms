import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil } from 'lucide-react';

const SpAdminCategories: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    const { data } = await supabase.from('selfpaced_categories').select('*').order('display_order');
    setRows(data ?? []);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!editing?.name || !editing?.slug) { toast.error('Name and slug required'); return; }
    const payload = { name: editing.name, slug: editing.slug, description: editing.description, icon: editing.icon, color: editing.color, display_order: Number(editing.display_order ?? 0), is_active: editing.is_active ?? true };
    const { error } = editing.id
      ? await supabase.from('selfpaced_categories').update(payload).eq('id', editing.id)
      : await supabase.from('selfpaced_categories').insert(payload);
    if (error) toast.error(error.message); else { toast.success('Saved'); setEditing(null); load(); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    const { error } = await supabase.from('selfpaced_categories').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Categories</h1>
        <button className="sp-btn" onClick={() => setEditing({})}><Plus size={16} /> New category</button>
      </div>
      <div className="sp-card" style={{ padding: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid hsl(var(--sp-border))' }}>
            <th style={{ padding: '.5rem' }}>Name</th><th>Slug</th><th>Order</th><th>Active</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--sp-border))' }}>
                <td style={{ padding: '.5rem' }}>{r.icon} {r.name}</td>
                <td>{r.slug}</td><td>{r.display_order}</td>
                <td>{r.is_active ? '✓' : '—'}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="sp-btn sp-btn-ghost" onClick={() => setEditing(r)}><Pencil size={14} /></button>
                  <button className="sp-btn sp-btn-ghost" onClick={() => del(r.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={modalOverlay} onClick={() => setEditing(null)}>
          <div className="sp-card" style={{ padding: '1.5rem', width: 480, maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editing.id ? 'Edit' : 'New'} category</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
              <input className="sp-input" placeholder="Name" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              <input className="sp-input" placeholder="Slug" value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} />
              <input className="sp-input" placeholder="Icon (emoji)" value={editing.icon || ''} onChange={e => setEditing({ ...editing, icon: e.target.value })} />
              <input className="sp-input" type="number" placeholder="Order" value={editing.display_order || 0} onChange={e => setEditing({ ...editing, display_order: e.target.value })} />
              <textarea className="sp-input" style={{ gridColumn: '1/-1' }} placeholder="Description" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              <label style={{ display: 'flex', gap: '.4rem', gridColumn: '1/-1' }}>
                <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} /> Active
              </label>
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

const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 100 };
export default SpAdminCategories;
