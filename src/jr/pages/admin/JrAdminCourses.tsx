import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { Plus, Trash2, Eye, EyeOff, Loader2, Pencil, X, Layers, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

interface FormState {
  title: string;
  description: string;
  program_overview: string;
  category_id: string;
  thumbnail_url: string;
  difficulty: string;
  duration_hours: number;
  price: number;
  what_you_will_learn: string[];
  key_highlights: string[];
  tools_covered: string[];
  skills_developed: string[];
  requirements: string[];
}

const emptyForm: FormState = {
  title: '', description: '', program_overview: '', category_id: '', thumbnail_url: '',
  difficulty: 'beginner', duration_hours: 0, price: 0,
  what_you_will_learn: [], key_highlights: [],
  tools_covered: [], skills_developed: [], requirements: [],
};

type ChipKey = 'what_you_will_learn' | 'key_highlights' | 'tools_covered' | 'skills_developed' | 'requirements';

export default function JrAdminCourses() {
  const { user } = useJrAuth();
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [chipInputs, setChipInputs] = useState<Record<ChipKey, string>>({
    what_you_will_learn: '', key_highlights: '', tools_covered: '', skills_developed: '', requirements: '',
  });

  const load = async () => {
    const [{ data: cs }, { data: ks }] = await Promise.all([
      supabase.from('jr_courses').select('*, jr_categories(name)').order('created_at', { ascending: false }),
      supabase.from('jr_categories').select('*'),
    ]);
    setItems(cs ?? []); setCats(ks ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm(emptyForm); setEditingId(null); setOpen(false);
    setChipInputs({ what_you_will_learn: '', key_highlights: '', tools_covered: '', skills_developed: '', requirements: '' });
  };

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      title: c.title ?? '',
      description: c.description ?? '',
      program_overview: c.program_overview ?? '',
      category_id: c.category_id ?? '',
      thumbnail_url: c.thumbnail_url ?? '',
      difficulty: c.difficulty ?? 'beginner',
      duration_hours: c.duration_hours ?? 0,
      price: c.price ?? 0,
      what_you_will_learn: c.what_you_will_learn ?? [],
      key_highlights: c.key_highlights ?? [],
      tools_covered: c.tools_covered ?? [],
      skills_developed: c.skills_developed ?? [],
      requirements: c.requirements ?? [],
    });
    setOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    if (!payload.category_id) payload.category_id = null;

    if (editingId) {
      const { error } = await supabase.from('jr_courses').update(payload).eq('id', editingId);
      if (error) return toast.error(error.message);
      toast.success('Course updated!');
    } else {
      const { error } = await supabase.from('jr_courses').insert({ ...payload, created_by: user?.id });
      if (error) return toast.error(error.message);
      toast.success('Course created!');
    }
    resetForm(); load();
  };

  const togglePublish = async (c: any) => {
    const { error } = await supabase.from('jr_courses').update({ is_published: !c.is_published }).eq('id', c.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this course and all its content?')) return;
    const { error } = await supabase.from('jr_courses').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  const addChip = (key: ChipKey) => {
    const v = chipInputs[key].trim(); if (!v) return;
    setForm({ ...form, [key]: [...form[key], v] });
    setChipInputs({ ...chipInputs, [key]: '' });
  };
  const removeChip = (key: ChipKey, idx: number) => {
    setForm({ ...form, [key]: form[key].filter((_, i) => i !== idx) });
  };

  const renderChipField = (label: string, k: ChipKey, placeholder?: string) => (
    <div className="sm:col-span-2 min-w-0" key={k}>
      <label className="text-xs font-bold">{label}</label>
      <div className="flex flex-col sm:flex-row gap-2 min-w-0">
        <textarea
          className="jr-input flex-1 min-w-0 resize-y"
          rows={2}
          value={chipInputs[k]}
          onChange={(e) => setChipInputs({ ...chipInputs, [k]: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addChip(k); }
          }}
          placeholder={placeholder ?? 'Type and press Enter to add (Shift+Enter for newline)…'}
          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        />
        <button type="button" onClick={() => addChip(k)} className="jr-btn jr-btn-secondary shrink-0 self-start">Add</button>
      </div>
      {form[k].length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2 min-w-0">
          {form[k].map((x, i) => (
            <li key={i} className="jr-chip max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal' }}>
              <span className="flex-1 min-w-0">{x}</span>
              <button type="button" onClick={() => removeChip(k, i)} className="ml-1 opacity-60 hover:opacity-100 shrink-0"><X className="w-3 h-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold">Courses</h1>
        <button onClick={() => { if (open) resetForm(); else setOpen(true); }} className="jr-btn">
          {open ? <><X className="w-4 h-4" /> Close</> : <><Plus className="w-4 h-4" /> New Course</>}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="jr-card p-5 mb-6 grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 flex items-center justify-between">
            <h2 className="text-xl font-extrabold">{editingId ? 'Edit Course' : 'Create Course'}</h2>
          </div>

          <div className="sm:col-span-2"><label className="text-xs font-bold">Title *</label>
            <input className="jr-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>

          <div className="sm:col-span-2"><label className="text-xs font-bold">Short Description</label>
            <textarea className="jr-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

          <div className="sm:col-span-2"><label className="text-xs font-bold">Program Overview (long description)</label>
            <textarea className="jr-input" rows={4} value={form.program_overview} onChange={(e) => setForm({ ...form, program_overview: e.target.value })} placeholder="Detailed overview shown on the course page" /></div>

          <div><label className="text-xs font-bold">Category</label>
            <select className="jr-input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">— None —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>

          <div><label className="text-xs font-bold">Difficulty</label>
            <select className="jr-input capitalize" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
              {DIFFICULTIES.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
            </select></div>

          <div><label className="text-xs font-bold">Duration (hours)</label>
            <input type="number" min={0} className="jr-input" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })} /></div>

          <div><label className="text-xs font-bold">Price (₹)</label>
            <input type="number" min={0} className="jr-input" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>

          <div className="sm:col-span-2"><label className="text-xs font-bold">Thumbnail URL</label>
            <input className="jr-input" value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://..." /></div>

          {renderChipField("What You Will Learn 🎯", "what_you_will_learn")}
          {renderChipField("Key Highlights ✨", "key_highlights")}
          {renderChipField("Tools Covered 🛠️", "tools_covered", "e.g. Scratch, Python…")}
          {renderChipField("Skills Developed 🚀", "skills_developed", "e.g. Logical thinking…")}
          {renderChipField("Requirements 📋", "requirements", "e.g. A computer with internet")}

          <div className="sm:col-span-2 flex gap-2">
            <button className="jr-btn">{editingId ? 'Update Course' : 'Create Course'}</button>
            <button type="button" onClick={resetForm} className="jr-btn jr-btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {items.map((c) => (
            <div key={c.id} className="jr-card overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-[hsl(var(--jr-primary)/0.2)] to-[hsl(var(--jr-pink)/0.2)] flex items-center justify-center text-5xl">
                {c.thumbnail_url ? <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" /> : '📘'}
              </div>
              <div className="p-4">
                <div className="font-extrabold mb-1">{c.title}</div>
                <div className="text-xs text-[hsl(var(--jr-muted))] mb-3 capitalize">
                  {c.difficulty ?? 'beginner'} • {c.duration_hours ?? 0}h • {c.jr_categories?.name ?? 'No category'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/jr/admin/courses/${c.id}/curriculum`} className="jr-btn !py-1.5 !px-3 text-xs">
                    <Layers className="w-3.5 h-3.5" /> Curriculum
                  </Link>
                  <Link to={`/jr/admin/courses/${c.id}/students`} className="jr-btn jr-btn-secondary !py-1.5 !px-3 text-xs">
                    <Users className="w-3.5 h-3.5" /> Students
                  </Link>
                  <button onClick={() => startEdit(c)} className="jr-btn jr-btn-secondary !py-1.5 !px-3 text-xs">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => togglePublish(c)} className="jr-btn jr-btn-secondary !py-1.5 !px-3 text-xs">
                    {c.is_published ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</> : <><Eye className="w-3.5 h-3.5" /> Publish</>}
                  </button>
                  <button onClick={() => remove(c.id)} className="p-2 rounded-full hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="col-span-full text-center text-[hsl(var(--jr-muted))] py-8">No courses yet. Create one!</div>}
        </div>
      )}
    </div>
  );
}
