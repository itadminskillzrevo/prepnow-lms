import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ChevronLeft, Plus, Trash2, Pencil, ChevronDown, ChevronRight,
  Video, FileText, X, Upload, PlayCircle, GripVertical,
} from 'lucide-react';

type Lesson = {
  id: string;
  module_id: string | null;
  sub_module_id: string | null;
  title: string;
  content_type: string;
  video_url: string | null;
  content: string | null;
  duration_minutes: number | null;
  is_preview: boolean;
  order_index: number;
};

const SpAdminCurriculum: React.FC = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> & { moduleId?: string; subModuleId?: string | null } | null>(null);
  const [editingModule, setEditingModule] = useState<{ id?: string; title: string; description?: string } | null>(null);
  const [editingSub, setEditingSub] = useState<{ id?: string; moduleId?: string; title: string } | null>(null);

  const load = async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from('selfpaced_courses').select('id,title').eq('id', courseId!).maybeSingle(),
      supabase
        .from('selfpaced_modules')
        .select('*, selfpaced_sub_modules(*, selfpaced_lessons(*)), selfpaced_lessons(*)')
        .eq('course_id', courseId!)
        .order('order_index'),
    ]);
    setCourse(c); setModules(m ?? []);
  };
  useEffect(() => { void load(); }, [courseId]);

  const saveModule = async () => {
    if (!editingModule?.title) return;
    if (editingModule.id) {
      await supabase.from('selfpaced_modules').update({ title: editingModule.title, description: editingModule.description }).eq('id', editingModule.id);
    } else {
      await supabase.from('selfpaced_modules').insert({
        course_id: courseId, title: editingModule.title, description: editingModule.description || null, order_index: modules.length,
      });
    }
    setEditingModule(null); load();
  };
  const delModule = async (id: string) => {
    if (!confirm('Delete module and all its lessons?')) return;
    await supabase.from('selfpaced_modules').delete().eq('id', id); load();
  };
  const saveSub = async () => {
    if (!editingSub?.title) return;
    if (editingSub.id) await supabase.from('selfpaced_sub_modules').update({ title: editingSub.title }).eq('id', editingSub.id);
    else {
      const mod = modules.find((m) => m.id === editingSub.moduleId);
      await supabase.from('selfpaced_sub_modules').insert({
        module_id: editingSub.moduleId, title: editingSub.title, order_index: mod?.selfpaced_sub_modules?.length ?? 0,
      });
    }
    setEditingSub(null); load();
  };
  const delSub = async (id: string) => {
    if (!confirm('Delete sub-module and its lessons?')) return;
    await supabase.from('selfpaced_sub_modules').delete().eq('id', id); load();
  };
  const saveLesson = async () => {
    const l = editingLesson!;
    if (!l.title) { toast.error('Title required'); return; }
    const payload: any = {
      title: l.title,
      content_type: l.content_type || 'video',
      video_url: l.video_url || null,
      content: l.content || null,
      duration_minutes: l.duration_minutes ?? 0,
      is_preview: !!l.is_preview,
    };
    if (l.id) {
      const { error } = await supabase.from('selfpaced_lessons').update(payload).eq('id', l.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const containerLessons = l.subModuleId
        ? modules.find((m) => m.id === l.moduleId)?.selfpaced_sub_modules?.find((s: any) => s.id === l.subModuleId)?.selfpaced_lessons ?? []
        : modules.find((m) => m.id === l.moduleId)?.selfpaced_lessons ?? [];
      const { error } = await supabase.from('selfpaced_lessons').insert({
        ...payload,
        module_id: l.moduleId,
        sub_module_id: l.subModuleId || null,
        order_index: containerLessons.length,
      });
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Lesson saved');
    setEditingLesson(null); load();
  };
  const delLesson = async (id: string) => {
    if (!confirm('Delete lesson?')) return;
    await supabase.from('selfpaced_lessons').delete().eq('id', id); load();
  };

  return (
    <div>
      <Link to="/selfpaced/admin/courses" className="sp-btn sp-btn-ghost" style={{ padding: 0, marginBottom: 8 }}>
        <ChevronLeft size={14} /> Back to courses
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: '0 0 .25rem' }}>Curriculum</h1>
          <div style={{ color: 'hsl(var(--sp-muted))', fontSize: '.9rem' }}>{course?.title}</div>
        </div>
        <button className="sp-btn" onClick={() => setEditingModule({ title: '' })}><Plus size={14} /> Add module</button>
      </div>

      {modules.length === 0 && (
        <div className="sp-card" style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--sp-muted))' }}>
          No modules yet. Click <b>Add module</b> to start building your course.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {modules.map((m) => {
          const isOpen = open[m.id] !== false;
          const totalLessons = (m.selfpaced_lessons?.length ?? 0) + (m.selfpaced_sub_modules ?? []).reduce((s: number, sm: any) => s + (sm.selfpaced_lessons?.length ?? 0), 0);
          return (
            <div key={m.id} className="sp-card" style={{ padding: '.85rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <button
                  className="sp-btn sp-btn-ghost"
                  style={{ padding: 0, fontWeight: 700, gap: 6, flex: 1, justifyContent: 'flex-start' }}
                  onClick={() => setOpen({ ...open, [m.id]: !isOpen })}
                >
                  <GripVertical size={14} style={{ color: 'hsl(var(--sp-muted))' }} />
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span style={{ fontSize: '1rem' }}>{m.title}</span>
                  <span style={{ fontSize: '.75rem', color: 'hsl(var(--sp-muted))', fontWeight: 500 }}>· {totalLessons} lessons</span>
                </button>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="sp-btn sp-btn-outline" onClick={() => setEditingLesson({ moduleId: m.id, subModuleId: null, title: '', content_type: 'video' })}>
                    <Plus size={13} /> Lesson
                  </button>
                  <button className="sp-btn sp-btn-ghost" onClick={() => setEditingSub({ moduleId: m.id, title: '' })}>
                    <Plus size={13} /> Sub-module
                  </button>
                  <button className="sp-btn sp-btn-ghost" onClick={() => setEditingModule({ id: m.id, title: m.title, description: m.description })}>
                    <Pencil size={14} />
                  </button>
                  <button className="sp-btn sp-btn-ghost" style={{ color: '#dc2626' }} onClick={() => delModule(m.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div style={{ marginTop: '.6rem', paddingLeft: '1.3rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(m.selfpaced_lessons ?? [])
                    .sort((a: any, b: any) => a.order_index - b.order_index)
                    .map((l: any) => (
                      <LessonRow key={l.id} lesson={l} onEdit={() => setEditingLesson({ ...l, moduleId: m.id, subModuleId: null })} onDel={() => delLesson(l.id)} />
                    ))}
                  {(m.selfpaced_sub_modules ?? []).map((sm: any) => (
                    <div key={sm.id} style={{ margin: '.4rem 0 .2rem', padding: '.55rem .75rem', background: 'hsl(var(--sp-bg))', borderRadius: 8, border: '1px solid hsl(var(--sp-border))' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '.9rem' }}>▹ {sm.title}</strong>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="sp-btn sp-btn-ghost" onClick={() => setEditingLesson({ moduleId: m.id, subModuleId: sm.id, title: '', content_type: 'video' })}>
                            <Plus size={12} /> Lesson
                          </button>
                          <button className="sp-btn sp-btn-ghost" onClick={() => setEditingSub({ id: sm.id, moduleId: m.id, title: sm.title })}><Pencil size={12} /></button>
                          <button className="sp-btn sp-btn-ghost" style={{ color: '#dc2626' }} onClick={() => delSub(sm.id)}><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
                        {(sm.selfpaced_lessons ?? [])
                          .sort((a: any, b: any) => a.order_index - b.order_index)
                          .map((l: any) => (
                            <LessonRow key={l.id} lesson={l} onEdit={() => setEditingLesson({ ...l, moduleId: m.id, subModuleId: sm.id })} onDel={() => delLesson(l.id)} />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingModule && (
        <Modal title={editingModule.id ? 'Edit module' : 'Add module'} onClose={() => setEditingModule(null)}>
          <input className="sp-input" placeholder="Module title" value={editingModule.title} onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })} />
          <textarea className="sp-input" placeholder="Description (optional)" rows={3} value={editingModule.description || ''} onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })} style={{ marginTop: 8 }} />
          <button className="sp-btn" onClick={saveModule} style={{ width: '100%', marginTop: 12 }}>Save module</button>
        </Modal>
      )}
      {editingSub && (
        <Modal title={editingSub.id ? 'Edit sub-module' : 'Add sub-module'} onClose={() => setEditingSub(null)}>
          <input className="sp-input" placeholder="Sub-module title" value={editingSub.title} onChange={(e) => setEditingSub({ ...editingSub, title: e.target.value })} />
          <button className="sp-btn" onClick={saveSub} style={{ width: '100%', marginTop: 12 }}>Save</button>
        </Modal>
      )}
      {editingLesson && (
        <LessonEditorModal
          lesson={editingLesson}
          courseId={courseId!}
          onClose={() => setEditingLesson(null)}
          onChange={setEditingLesson}
          onSave={saveLesson}
        />
      )}
    </div>
  );
};

const LessonRow: React.FC<{ lesson: any; onEdit: () => void; onDel: () => void }> = ({ lesson, onEdit, onDel }) => {
  const Icon = lesson.content_type === 'text' ? FileText : PlayCircle;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.4rem .5rem', borderRadius: 6, background: 'hsl(var(--sp-surface))', border: '1px solid hsl(var(--sp-border))', fontSize: '.88rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Icon size={14} style={{ color: 'hsl(var(--sp-primary))', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</span>
        {lesson.is_preview && <span style={{ fontSize: '.65rem', padding: '.05rem .4rem', borderRadius: 999, background: '#22c55e22', color: '#16a34a' }}>Preview</span>}
        {lesson.duration_minutes ? <span style={{ fontSize: '.7rem', color: 'hsl(var(--sp-muted))' }}>{lesson.duration_minutes}m</span> : null}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="sp-btn sp-btn-ghost" onClick={onEdit}><Pencil size={12} /></button>
        <button className="sp-btn sp-btn-ghost" style={{ color: '#dc2626' }} onClick={onDel}><Trash2 size={12} /></button>
      </div>
    </div>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 16 }}>
    <div className="sp-card" style={{ width: '100%', maxWidth: wide ? 640 : 480, background: 'hsl(var(--sp-surface))', padding: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button className="sp-btn sp-btn-ghost" onClick={onClose}><X size={16} /></button>
      </div>
      {children}
    </div>
  </div>
);

const LessonEditorModal: React.FC<{
  lesson: any;
  courseId: string;
  onClose: () => void;
  onChange: (l: any) => void;
  onSave: () => void;
}> = ({ lesson, onClose, onChange, onSave }) => {
  const [uploading, setUploading] = useState(false);
  const type = lesson.content_type || 'video';

  const uploadVideo = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `videos/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('selfpaced-media').upload(path, file, { upsert: false, contentType: file.type });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = await supabase.storage.from('selfpaced-media').createSignedUrl(path, 60 * 60 * 24 * 365);
    if (data?.signedUrl) onChange({ ...lesson, video_url: data.signedUrl });
    setUploading(false);
    toast.success('Video uploaded');
  };

  return (
    <Modal title={lesson.id ? 'Edit lesson' : 'Add lesson'} onClose={onClose} wide>
      <div style={{ display: 'grid', gap: '.65rem' }}>
        <label style={{ fontSize: '.8rem', fontWeight: 600 }}>Lesson title *</label>
        <input className="sp-input" value={lesson.title || ''} onChange={(e) => onChange({ ...lesson, title: e.target.value })} placeholder="e.g. Introduction to React Hooks" />

        <label style={{ fontSize: '.8rem', fontWeight: 600, marginTop: 4 }}>Content type</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { v: 'video', l: 'Video', I: Video },
            { v: 'text', l: 'Text / Article', I: FileText },
          ].map((t) => {
            const Icon = t.I;
            const active = type === t.v;
            return (
              <button
                key={t.v}
                type="button"
                onClick={() => onChange({ ...lesson, content_type: t.v })}
                className="sp-btn"
                style={{
                  flex: 1,
                  background: active ? 'hsl(var(--sp-primary))' : 'hsl(var(--sp-bg))',
                  color: active ? 'white' : 'inherit',
                  border: '1px solid hsl(var(--sp-border))',
                }}
              >
                <Icon size={14} /> {t.l}
              </button>
            );
          })}
        </div>

        {type === 'video' && (
          <>
            <label style={{ fontSize: '.8rem', fontWeight: 600, marginTop: 4 }}>Video URL</label>
            <input
              className="sp-input"
              value={lesson.video_url || ''}
              onChange={(e) => onChange({ ...lesson, video_url: e.target.value })}
              placeholder="YouTube, Vimeo, or direct MP4 URL"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.8rem', color: 'hsl(var(--sp-muted))' }}>
              <span>or</span>
              <label className="sp-btn sp-btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
                <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload video file'}
                <input
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])}
                />
              </label>
              <span style={{ fontSize: '.75rem' }}>MP4/WebM, up to 500MB</span>
            </div>
            {lesson.video_url && (
              <div style={{ fontSize: '.75rem', color: 'hsl(var(--sp-muted))', wordBreak: 'break-all', padding: '.4rem .6rem', background: 'hsl(var(--sp-bg))', borderRadius: 6 }}>
                ✓ {lesson.video_url.substring(0, 80)}{lesson.video_url.length > 80 ? '...' : ''}
              </div>
            )}
          </>
        )}

        <label style={{ fontSize: '.8rem', fontWeight: 600, marginTop: 4 }}>
          {type === 'video' ? 'Description / Notes' : 'Content *'}
        </label>
        <textarea
          className="sp-input"
          rows={type === 'text' ? 8 : 3}
          value={lesson.content || ''}
          onChange={(e) => onChange({ ...lesson, content: e.target.value })}
          placeholder={type === 'video' ? 'Optional lesson description shown below the video' : 'Write the lesson content here...'}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600 }}>Duration (minutes)</label>
            <input
              className="sp-input"
              type="number"
              min={0}
              value={lesson.duration_minutes ?? 0}
              onChange={(e) => onChange({ ...lesson, duration_minutes: Number(e.target.value) })}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, fontSize: '.88rem' }}>
            <input
              type="checkbox"
              checked={!!lesson.is_preview}
              onChange={(e) => onChange({ ...lesson, is_preview: e.target.checked })}
            />
            Free preview (visible before purchase)
          </label>
        </div>

        <button className="sp-btn" onClick={onSave} style={{ marginTop: 12, width: '100%' }}>
          Save lesson
        </button>
      </div>
    </Modal>
  );
};

export default SpAdminCurriculum;
