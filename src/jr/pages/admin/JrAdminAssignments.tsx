import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { Plus, Trash2, Loader2, Pencil, Eye, X, CheckCircle, Download, Upload, FileText, Radio, RadioTower } from 'lucide-react';
import { toast } from 'sonner';

const MAX_ADMIN_FILE_SIZE_MB = 2;
const MAX_ADMIN_FILE_SIZE_BYTES = MAX_ADMIN_FILE_SIZE_MB * 1024 * 1024;
const ADMIN_ALLOWED_TYPES = ['application/pdf', 'application/zip', 'application/x-zip-compressed'];

interface AssignmentForm {
  title: string;
  description: string;
  instructions: string;
  course_id: string;
  due_date: string;
  max_score: number;
}

const emptyForm: AssignmentForm = { title: '', description: '', instructions: '', course_id: '', due_date: '', max_score: 100 };

export default function JrAdminAssignments() {
  const { user } = useJrAuth();
  const [items, setItems] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AssignmentForm>({ ...emptyForm });
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [subsOpen, setSubsOpen] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: 0, feedback: '', status: 'graded' });

  const load = async () => {
    const [{ data: qs }, { data: cs }] = await Promise.all([
      supabase.from('jr_assignments').select('*, jr_courses(title)').order('created_at', { ascending: false }),
      supabase.from('jr_courses').select('id, title'),
    ]);
    setItems(qs ?? []);
    setCourses(cs ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdminFileSelect = (file: File | null) => {
    if (file && file.size > MAX_ADMIN_FILE_SIZE_BYTES) {
      toast.error(`File size must be under ${MAX_ADMIN_FILE_SIZE_MB}MB`);
      return;
    }
    if (file && !ADMIN_ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only PDF and ZIP files are allowed');
      return;
    }
    setAdminFile(file);
  };

  const uploadAdminFile = async (): Promise<{ url: string; name: string } | null> => {
    if (!adminFile || !user) return null;
    const filePath = `${user.id}/admin/${Date.now()}_${adminFile.name}`;
    const { error } = await supabase.storage.from('jr-assignments').upload(filePath, adminFile, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('jr-assignments').getPublicUrl(filePath);
    return { url: urlData.publicUrl, name: adminFile.name };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const fileInfo = await uploadAdminFile();
      const payload: any = {
        ...form, created_by: user?.id,
        due_date: form.due_date || null,
        instructions: form.instructions || null,
        file_url: fileInfo?.url || null,
        file_name: fileInfo?.name || null,
      };
      if (!payload.course_id) delete payload.course_id;
      const { error } = await supabase.from('jr_assignments').insert(payload);
      if (error) throw error;
      setCreateOpen(false);
      setForm({ ...emptyForm });
      setAdminFile(null);
      toast.success('Assignment created');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setUploading(true);
    try {
      const fileInfo = await uploadAdminFile();
      const updateData: any = {
        title: form.title,
        description: form.description || null,
        instructions: form.instructions || null,
        due_date: form.due_date || null,
        max_score: form.max_score,
        course_id: form.course_id || null,
      };
      if (fileInfo) {
        updateData.file_url = fileInfo.url;
        updateData.file_name = fileInfo.name;
      }
      const { error } = await supabase.from('jr_assignments').update(updateData).eq('id', editId);
      if (error) throw error;
      setEditId(null);
      setForm({ ...emptyForm });
      setAdminFile(null);
      toast.success('Assignment updated');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this assignment?')) return;
    await supabase.from('jr_assignments').delete().eq('id', id);
    toast.success('Deleted');
    load();
  };

  const toggleLive = async (a: any) => {
    const { error } = await supabase.from('jr_assignments').update({ is_live: !a.is_live }).eq('id', a.id);
    if (error) return toast.error(error.message);
    toast.success(!a.is_live ? '✅ Assignment is now LIVE for students' : 'Assignment unpublished');
    load();
  };

  const openEdit = (a: any) => {
    setForm({
      title: a.title,
      description: a.description || '',
      instructions: a.instructions || '',
      course_id: a.course_id || '',
      due_date: a.due_date ? a.due_date.slice(0, 16) : '',
      max_score: a.max_score || 100,
    });
    setEditId(a.id);
    setCreateOpen(false);
    setAdminFile(null);
  };

  const viewSubmissions = async (assignmentId: string) => {
    setSubsOpen(assignmentId);
    const { data } = await supabase
      .from('jr_assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    const userIds = [...new Set((data || []).map(s => s.user_id))];
    const { data: profiles } = await supabase.from('jr_profiles').select('user_id, full_name, email').in('user_id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    setSubmissions((data || []).map(s => ({ ...s, profile: profileMap.get(s.user_id) })));
  };

  const handleGrade = async () => {
    if (!gradingId) return;
    const { error } = await supabase.from('jr_assignment_submissions').update({
      score: gradeForm.score,
      feedback: gradeForm.feedback || null,
      status: gradeForm.status,
      graded_by: user?.id,
      graded_at: new Date().toISOString(),
    }).eq('id', gradingId);
    if (error) return toast.error(error.message);
    toast.success('Graded!');
    setGradingId(null);
    if (subsOpen) viewSubmissions(subsOpen);
  };

  const formJSX = (isEdit: boolean) => (
    <form onSubmit={isEdit ? handleUpdate : handleCreate} className="jr-card p-5 mb-6 grid sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2"><label className="text-xs font-bold">Title</label><input required className="jr-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div className="sm:col-span-2"><label className="text-xs font-bold">Description</label><textarea className="jr-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="sm:col-span-2"><label className="text-xs font-bold">Instructions (visible to students)</label><textarea className="jr-input min-h-[80px]" placeholder="Write detailed instructions for students..." value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></div>
      <div className="sm:col-span-2">
        <label className="text-xs font-bold">Upload Assignment File (PDF or ZIP, max {MAX_ADMIN_FILE_SIZE_MB}MB)</label>
        <div className="flex items-center gap-2 mt-1">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.zip"
            className="jr-input text-sm flex-1"
            onChange={(e) => handleAdminFileSelect(e.target.files?.[0] || null)}
          />
          {adminFile && (
            <button type="button" onClick={() => { setAdminFile(null); if (fileRef.current) fileRef.current.value = ''; }} className="p-1 text-red-500 hover:bg-red-50 rounded-full">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {adminFile && <div className="text-xs text-[hsl(var(--jr-muted))] mt-1">{adminFile.name} ({(adminFile.size / 1024 / 1024).toFixed(2)} MB)</div>}
        {isEdit && !adminFile && (
          <div className="text-xs text-[hsl(var(--jr-muted))] mt-1">Leave empty to keep existing file</div>
        )}
      </div>
      <div>
        <label className="text-xs font-bold">Course</label>
        <select className="jr-input" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
          <option value="">— Standalone —</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <div><label className="text-xs font-bold">Max score</label><input type="number" className="jr-input" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: Number(e.target.value) })} /></div>
      <div className="sm:col-span-2"><label className="text-xs font-bold">Due date</label><input type="datetime-local" className="jr-input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
      <div className="sm:col-span-2 flex gap-2">
        <button type="submit" disabled={uploading} className="jr-btn">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isEdit ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={() => { isEdit ? setEditId(null) : setCreateOpen(false); setForm({ ...emptyForm }); setAdminFile(null); }} className="jr-btn-outline">Cancel</button>
      </div>
    </form>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold">Assignments</h1>
        <button onClick={() => { setCreateOpen(!createOpen); setEditId(null); setForm({ ...emptyForm }); setAdminFile(null); }} className="jr-btn"><Plus className="w-4 h-4" /> New</button>
      </div>

      {createOpen && !editId && formJSX(false)}
      {editId && formJSX(true)}

      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((a) => (
            <div key={a.id} className="jr-card p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="text-2xl">📝</div>
                {a.is_live ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                    <RadioTower className="w-3 h-3" /> LIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                    Draft
                  </span>
                )}
              </div>
              <div className="font-extrabold">{a.title}</div>
              <div className="text-xs text-[hsl(var(--jr-muted))]">
                {a.jr_courses?.title ?? 'Standalone'}
                {a.due_date ? ` • Due ${new Date(a.due_date).toLocaleDateString()}` : ''}
                {` • Max: ${a.max_score}`}
              </div>
              {a.description && <div className="text-sm text-[hsl(var(--jr-muted))] mt-1 line-clamp-2">{a.description}</div>}
              {a.file_url && (
                <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <FileText className="w-3.5 h-3.5" /> {a.file_name || 'Assignment File'}
                </a>
              )}
              <div className="mt-3 flex gap-1 flex-wrap">
                <button onClick={() => viewSubmissions(a.id)} className="p-2 rounded-full hover:bg-blue-50 text-blue-500" title="View Submissions"><Eye className="w-4 h-4" /></button>
                <button onClick={() => toggleLive(a)} className="p-2 rounded-full hover:bg-green-50 text-green-600" title={a.is_live ? 'Unpublish' : 'Mark Live'}>
                  <Radio className="w-4 h-4" />
                </button>
                <button onClick={() => openEdit(a)} className="p-2 rounded-full hover:bg-amber-50 text-amber-500" title="Edit"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(a.id)} className="p-2 rounded-full hover:bg-red-50 text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="col-span-full text-center text-[hsl(var(--jr-muted))] py-8">No assignments yet.</div>}
        </div>
      )}

      {/* Submissions overlay */}
      {subsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSubsOpen(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold">Submissions ({submissions.length})</h2>
              <button onClick={() => setSubsOpen(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            {submissions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No submissions yet</div>
            ) : (
              <div className="space-y-3">
                {submissions.map((s: any) => (
                  <div key={s.id} className="border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold">{s.profile?.full_name || s.profile?.email || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">Submitted: {new Date(s.submitted_at).toLocaleString()}</div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        s.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {s.status === 'graded' ? `✅ ${s.score}pts` : '⏳ Pending'}
                      </span>
                    </div>
                    {s.content && <div className="mt-2 text-sm bg-gray-50 p-2 rounded">{s.content}</div>}
                    {s.file_url && (
                      <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        <Download className="w-3.5 h-3.5" /> {s.file_name || 'Download file'}
                      </a>
                    )}
                    {s.feedback && <div className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded">Feedback: {s.feedback}</div>}

                    {gradingId === s.id ? (
                      <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs font-bold">Score</label>
                            <input type="number" className="jr-input" value={gradeForm.score} onChange={e => setGradeForm({ ...gradeForm, score: Number(e.target.value) })} />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-bold">Status</label>
                            <select className="jr-input" value={gradeForm.status} onChange={e => setGradeForm({ ...gradeForm, status: e.target.value })}>
                              <option value="graded">Graded</option>
                              <option value="returned">Returned</option>
                              <option value="resubmit">Resubmit</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold">Feedback</label>
                          <textarea className="jr-input" value={gradeForm.feedback} onChange={e => setGradeForm({ ...gradeForm, feedback: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleGrade} className="jr-btn text-sm"><CheckCircle className="w-4 h-4" /> Save</button>
                          <button onClick={() => setGradingId(null)} className="jr-btn-outline text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setGradingId(s.id); setGradeForm({ score: s.score || 0, feedback: s.feedback || '', status: s.status === 'graded' ? 'graded' : 'graded' }); }} className="mt-2 text-xs font-bold text-blue-600 hover:underline">
                        {s.status === 'graded' ? 'Re-grade' : 'Grade'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
