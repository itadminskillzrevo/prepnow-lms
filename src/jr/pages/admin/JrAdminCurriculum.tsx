import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Trash2, Pencil, ChevronDown, ChevronRight, Loader2, FileText, Video, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';

interface Material { id: string; lesson_id: string; title: string; file_url: string; file_type: string | null; file_size: number | null; }
interface Lesson { id: string; title: string; content: string | null; video_url: string | null; duration_minutes: number; order_index: number; is_free: boolean; module_id: string | null; sub_module_id: string | null; jr_course_materials?: Material[]; }
interface SubModule { id: string; module_id: string; title: string; description: string | null; order_index: number; jr_lessons?: Lesson[]; }
interface Module { id: string; course_id: string; title: string; description: string | null; order_index: number; jr_sub_modules?: SubModule[]; jr_lessons?: Lesson[]; }

type DialogState =
  | { type: 'module'; data?: Partial<Module> }
  | { type: 'sub_module'; moduleId: string; data?: Partial<SubModule> }
  | { type: 'lesson'; moduleId?: string; subModuleId?: string; data?: Partial<Lesson> }
  | { type: 'material'; lessonId: string; data?: Partial<Material> }
  | null;

export default function JrAdminCurriculum() {
  const { courseId } = useParams();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DialogState>(null);

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    const { data: c } = await supabase.from('jr_courses').select('id, title').eq('id', courseId).maybeSingle();
    setCourse(c);

    // Fetch modules → sub-modules → lessons → materials separately to avoid PostgREST embed ambiguity
    const { data: mods } = await supabase.from('jr_modules').select('*').eq('course_id', courseId).order('order_index');
    const moduleIds = (mods ?? []).map((m: any) => m.id);
    const [{ data: subs }, { data: directLessons }] = await Promise.all([
      moduleIds.length ? supabase.from('jr_sub_modules').select('*').in('module_id', moduleIds).order('order_index') : Promise.resolve({ data: [] } as any),
      moduleIds.length ? supabase.from('jr_lessons').select('*').in('module_id', moduleIds).order('order_index') : Promise.resolve({ data: [] } as any),
    ]);
    const subIds = (subs ?? []).map((s: any) => s.id);
    const { data: subLessons } = subIds.length
      ? await supabase.from('jr_lessons').select('*').in('sub_module_id', subIds).order('order_index')
      : { data: [] } as any;
    const allLessonIds = [...(directLessons ?? []), ...(subLessons ?? [])].map((l: any) => l.id);
    const { data: materials } = allLessonIds.length
      ? await supabase.from('jr_course_materials').select('*').in('lesson_id', allLessonIds)
      : { data: [] } as any;

    const matsByLesson = (materials ?? []).reduce((acc: any, m: any) => {
      (acc[m.lesson_id] = acc[m.lesson_id] || []).push(m); return acc;
    }, {});
    const attachMats = (l: any) => ({ ...l, jr_course_materials: matsByLesson[l.id] ?? [] });

    const built: Module[] = (mods ?? []).map((m: any) => ({
      ...m,
      jr_sub_modules: (subs ?? []).filter((s: any) => s.module_id === m.id).map((sm: any) => ({
        ...sm,
        jr_lessons: (subLessons ?? []).filter((l: any) => l.sub_module_id === sm.id).map(attachMats),
      })),
      jr_lessons: (directLessons ?? []).filter((l: any) => l.module_id === m.id && !l.sub_module_id).map(attachMats),
    }));
    setModules(built);
    setLoading(false);
  };
  useEffect(() => { load(); }, [courseId]);

  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const remove = async (table: string, id: string, label: string) => {
    if (!confirm(`Delete this ${label}? All children will also be deleted.`)) return;
    const { error } = await supabase.from(table as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success(`${label} deleted`); load();
  };

  return (
    <div>
      <Link to="/jr/admin/courses" className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--jr-primary))] mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Curriculum</h1>
          <p className="text-[hsl(var(--jr-muted))]">{course?.title ?? 'Course'}</p>
        </div>
        <button onClick={() => setDialog({ type: 'module' })} className="jr-btn"><Plus className="w-4 h-4" /> Add Module</button>
      </div>

      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : modules.length === 0 ? (
        <div className="jr-card p-10 text-center">
          <div className="text-5xl mb-3">📚</div>
          <h3 className="text-xl font-extrabold mb-2">No modules yet</h3>
          <p className="text-[hsl(var(--jr-muted))] mb-4">Start building your curriculum by adding your first module.</p>
          <button onClick={() => setDialog({ type: 'module' })} className="jr-btn"><Plus className="w-4 h-4" /> Create First Module</button>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((m, i) => (
            <div key={m.id} className="jr-card overflow-hidden">
              <div className="flex items-center gap-2 p-3 bg-[hsl(var(--jr-primary)/0.06)]">
                <button onClick={() => toggle(m.id)} className="p-1">
                  {open.has(m.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                <div className="flex-1">
                  <div className="font-extrabold">📘 Module {i + 1}: {m.title}</div>
                  {m.description && <div className="text-xs text-[hsl(var(--jr-muted))]">{m.description}</div>}
                </div>
                <button onClick={() => setDialog({ type: 'sub_module', moduleId: m.id })} className="jr-btn jr-btn-secondary !py-1 !px-2 text-xs"><Plus className="w-3 h-3" /> Sub-heading</button>
                <button onClick={() => setDialog({ type: 'lesson', moduleId: m.id })} className="jr-btn jr-btn-secondary !py-1 !px-2 text-xs"><Plus className="w-3 h-3" /> Lesson</button>
                <button onClick={() => setDialog({ type: 'module', data: m })} className="p-2 rounded hover:bg-white"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove('jr_modules', m.id, 'module')} className="p-2 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>

              {open.has(m.id) && (
                <div className="p-3 space-y-2">
                  {/* Sub-modules */}
                  {m.jr_sub_modules?.map((sm, si) => (
                    <div key={sm.id} className="border rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 p-2 bg-[hsl(var(--jr-pink)/0.08)]">
                        <button onClick={() => toggle(sm.id)} className="p-1">
                          {open.has(sm.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div className="flex-1">
                          <div className="font-bold text-sm">📑 {i + 1}.{si + 1} {sm.title}</div>
                          {sm.description && <div className="text-xs text-[hsl(var(--jr-muted))]">{sm.description}</div>}
                        </div>
                        <button onClick={() => setDialog({ type: 'lesson', subModuleId: sm.id })} className="jr-btn jr-btn-secondary !py-1 !px-2 text-xs"><Plus className="w-3 h-3" /> Lesson</button>
                        <button onClick={() => setDialog({ type: 'sub_module', moduleId: m.id, data: sm })} className="p-1.5 rounded hover:bg-white"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove('jr_sub_modules', sm.id, 'sub-heading')} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      {open.has(sm.id) && (
                        <div className="p-2 space-y-1">
                          {sm.jr_lessons?.map((l) => <LessonRow key={l.id} lesson={l} onEdit={() => setDialog({ type: 'lesson', subModuleId: sm.id, data: l })} onDelete={() => remove('jr_lessons', l.id, 'lesson')} onAddMaterial={() => setDialog({ type: 'material', lessonId: l.id })} onEditMaterial={(mat) => setDialog({ type: 'material', lessonId: l.id, data: mat })} onDeleteMaterial={(matId) => remove('jr_course_materials', matId, 'material')} />)}
                          {(!sm.jr_lessons || sm.jr_lessons.length === 0) && <div className="text-xs text-[hsl(var(--jr-muted))] text-center py-3">No lessons yet</div>}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Direct lessons under module */}
                  {m.jr_lessons?.map((l) => <LessonRow key={l.id} lesson={l} onEdit={() => setDialog({ type: 'lesson', moduleId: m.id, data: l })} onDelete={() => remove('jr_lessons', l.id, 'lesson')} onAddMaterial={() => setDialog({ type: 'material', lessonId: l.id })} onEditMaterial={(mat) => setDialog({ type: 'material', lessonId: l.id, data: mat })} onDeleteMaterial={(matId) => remove('jr_course_materials', matId, 'material')} />)}

                  {(!m.jr_sub_modules || m.jr_sub_modules.length === 0) && (!m.jr_lessons || m.jr_lessons.length === 0) && (
                    <div className="text-sm text-[hsl(var(--jr-muted))] text-center py-4">No content. Add sub-headings or lessons.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {dialog && <EditDialog dialog={dialog} courseId={courseId!} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load(); }} />}
    </div>
  );
}

function LessonRow({ lesson, onEdit, onDelete, onAddMaterial, onEditMaterial, onDeleteMaterial }: any) {
  const [showMat, setShowMat] = useState(false);
  return (
    <div className="border rounded-lg">
      <div className="flex items-center gap-2 p-2 hover:bg-[hsl(var(--jr-primary)/0.04)]">
        {lesson.video_url ? <Video className="w-4 h-4 text-[hsl(var(--jr-primary))]" /> : <FileText className="w-4 h-4 text-[hsl(var(--jr-muted))]" />}
        <div className="flex-1">
          <div className="text-sm font-semibold">{lesson.title}</div>
          <div className="text-xs text-[hsl(var(--jr-muted))]">
            {lesson.duration_minutes ? `${lesson.duration_minutes} min` : 'No duration'}
            {lesson.is_free && ' • 🆓 Free preview'}
            {lesson.jr_course_materials?.length > 0 && ` • ${lesson.jr_course_materials.length} materials`}
          </div>
        </div>
        <button onClick={() => setShowMat(!showMat)} className="jr-btn jr-btn-secondary !py-1 !px-2 text-xs"><Paperclip className="w-3 h-3" /> Materials</button>
        <button onClick={onEdit} className="p-1.5 rounded hover:bg-white"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      {showMat && (
        <div className="px-3 pb-3 pt-1 border-t bg-[hsl(var(--jr-bg)/0.5)]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-[hsl(var(--jr-muted))]">COURSE MATERIALS</div>
            <button onClick={onAddMaterial} className="jr-btn jr-btn-secondary !py-1 !px-2 text-xs"><Plus className="w-3 h-3" /> Add</button>
          </div>
          {lesson.jr_course_materials?.length > 0 ? (
            <ul className="space-y-1">
              {lesson.jr_course_materials.map((mat: any) => (
                <li key={mat.id} className="flex items-center gap-2 text-xs p-2 bg-white rounded">
                  <Paperclip className="w-3 h-3" />
                  <a href={mat.file_url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline">{mat.title}</a>
                  <button onClick={() => onEditMaterial(mat)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => onDeleteMaterial(mat.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                </li>
              ))}
            </ul>
          ) : <div className="text-xs text-center text-[hsl(var(--jr-muted))] py-2">No materials yet</div>}
        </div>
      )}
    </div>
  );
}

function EditDialog({ dialog, courseId, onClose, onSaved }: { dialog: NonNullable<DialogState>; courseId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(() => {
    if (dialog.type === 'module') return { title: '', description: '', order_index: 0, ...dialog.data };
    if (dialog.type === 'sub_module') return { title: '', description: '', order_index: 0, ...dialog.data };
    if (dialog.type === 'lesson') return { title: '', content: '', video_url: '', duration_minutes: 0, order_index: 0, is_free: false, ...dialog.data };
    if (dialog.type === 'material') return { title: '', file_url: '', file_type: '', ...dialog.data };
    return {};
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${folder}/${courseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('jr-media').upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from('jr-media').getPublicUrl(path);
    return { url: data.publicUrl, type: file.type, size: file.size, name: file.name };
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 500 * 1024 * 1024) return toast.error('Video must be under 500MB');
    setUploading(true);
    try {
      const { url } = await uploadFile(file, 'lesson-videos');
      setForm({ ...form, video_url: url });
      toast.success('Video uploaded');
    } catch (err: any) { toast.error(err.message || 'Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 100 * 1024 * 1024) return toast.error('File must be under 100MB');
    setUploading(true);
    try {
      const { url, type, size, name } = await uploadFile(file, 'materials');
      setForm({ ...form, file_url: url, file_type: type, file_size: size, title: form.title || name });
      toast.success('File uploaded');
    } catch (err: any) { toast.error(err.message || 'Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const pick = (obj: any, keys: string[]) => keys.reduce((a: any, k) => (k in obj ? (a[k] = obj[k], a) : a), {});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let table = '', payload: any = {};
    if (dialog.type === 'module') {
      table = 'jr_modules';
      payload = pick(form, ['title', 'description', 'order_index']);
      payload.course_id = courseId;
    }
    if (dialog.type === 'sub_module') {
      table = 'jr_sub_modules';
      payload = pick(form, ['title', 'description', 'order_index']);
      payload.module_id = dialog.moduleId;
    }
    if (dialog.type === 'lesson') {
      table = 'jr_lessons';
      payload = pick(form, ['title', 'content', 'video_url', 'duration_minutes', 'order_index', 'is_free']);
      if (dialog.subModuleId) { payload.sub_module_id = dialog.subModuleId; payload.module_id = null; }
      else if (dialog.moduleId) { payload.module_id = dialog.moduleId; payload.sub_module_id = null; }
    }
    if (dialog.type === 'material') {
      table = 'jr_course_materials';
      payload = pick(form, ['title', 'file_url', 'file_type', 'file_size']);
      payload.lesson_id = dialog.lessonId;
    }

    const id = (dialog as any).data?.id;
    const { error } = id
      ? await supabase.from(table as any).update(payload).eq('id', id)
      : await supabase.from(table as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(id ? 'Updated' : 'Created');
    onSaved();
  };

  const titles: Record<string, string> = { module: 'Module', sub_module: 'Sub-heading (Chapter)', lesson: 'Lesson', material: 'Material' };
  const isEdit = !!(dialog as any).data?.id;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-lg my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold">{isEdit ? 'Edit' : 'Add'} {titles[dialog.type]}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div><label className="text-xs font-bold">Title *</label>
            <input className="jr-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>

          {(dialog.type === 'module' || dialog.type === 'sub_module') && (
            <div><label className="text-xs font-bold">Description</label>
              <textarea className="jr-input" rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          )}

          {dialog.type === 'lesson' && (
            <>
              <div>
                <label className="text-xs font-bold">Video — Paste URL or Upload File</label>
                <div className="flex gap-2">
                  <input className="jr-input flex-1" value={form.video_url ?? ''} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/... or upload below" />
                  <label className="jr-btn jr-btn-secondary cursor-pointer !py-2 !px-3 text-xs whitespace-nowrap">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-3 h-3" /> Upload</>}
                    <input type="file" accept="video/*" hidden onChange={handleVideoUpload} disabled={uploading} />
                  </label>
                </div>
                <p className="text-[10px] text-[hsl(var(--jr-muted))] mt-1">Supports YouTube, Vimeo, MP4 link, or direct upload (max 500MB).</p>
                {form.video_url && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-[hsl(var(--jr-border))]">
                    <video src={form.video_url} controls className="w-full max-h-48 bg-black" onError={() => {/* iframe types still ok */}} />
                  </div>
                )}
              </div>
              <div><label className="text-xs font-bold">Lesson Content (Notes / HTML)</label>
                <textarea className="jr-input" rows={5} value={form.content ?? ''} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Lesson notes, instructions, etc." /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-bold">Duration (min)</label>
                  <input type="number" min={0} className="jr-input" value={form.duration_minutes ?? 0} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
                <div className="flex items-end gap-2">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={!!form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} /> Free preview
                  </label>
                </div>
              </div>
            </>
          )}

          {dialog.type === 'material' && (
            <>
              <div>
                <label className="text-xs font-bold">File — Paste URL or Upload</label>
                <div className="flex gap-2">
                  <input className="jr-input flex-1" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." required />
                  <label className="jr-btn jr-btn-secondary cursor-pointer !py-2 !px-3 text-xs whitespace-nowrap">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-3 h-3" /> Upload</>}
                    <input type="file" hidden onChange={handleMaterialUpload} disabled={uploading} />
                  </label>
                </div>
                <p className="text-[10px] text-[hsl(var(--jr-muted))] mt-1">Any file type, up to 100MB.</p>
              </div>
              <div><label className="text-xs font-bold">File Type</label>
                <input className="jr-input" value={form.file_type ?? ''} onChange={(e) => setForm({ ...form, file_type: e.target.value })} placeholder="pdf, doc, image, etc." /></div>
            </>
          )}

          {dialog.type !== 'material' && (
            <div><label className="text-xs font-bold">Order</label>
              <input type="number" className="jr-input" value={form.order_index ?? 0} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button disabled={saving} className="jr-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? 'Update' : 'Create')}</button>
          <button type="button" onClick={onClose} className="jr-btn jr-btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
