import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function JrAdminCategories() {
  const { user } = useJrAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', icon: '✨', color: '280 85% 60%' });

  const load = async () => {
    const { data } = await supabase.from('jr_categories').select('*').order('order_index');
    setItems(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('jr_categories').insert({ ...form, created_by: user?.id });
    if (error) return toast.error(error.message);
    setForm({ name: '', icon: '✨', color: '280 85% 60%' });
    toast.success('Category added!'); load();
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    const { error } = await supabase.from('jr_categories').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-6">Categories</h1>
      <form onSubmit={create} className="jr-card p-5 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]"><label className="text-xs font-bold">Name</label>
          <input className="jr-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="w-24"><label className="text-xs font-bold">Icon</label>
          <input className="jr-input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
        <button className="jr-btn"><Plus className="w-4 h-4" /> Add</button>
      </form>
      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((c) => (
            <div key={c.id} className="jr-card p-5 flex items-center justify-between">
              <div><div className="text-2xl">{c.icon}</div><div className="font-extrabold">{c.name}</div></div>
              <button onClick={() => remove(c.id)} className="p-2 rounded-full hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
