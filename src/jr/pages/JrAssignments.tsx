import React, { useEffect, useState, useRef } from 'react';
import { JrStudentLayout } from '@/jr/components/JrStudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { ClipboardList, Calendar, Upload, CheckCircle, Clock, AlertCircle, FileText, X, Loader2, Download, Info } from 'lucide-react';
import { toast } from 'sonner';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/png', 'image/jpeg'];

export default function JrAssignments() {
  const { user } = useJrAuth();
  const [items, setItems] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<Record<string, File | null>>({});
  const [textContent, setTextContent] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: assignments }, { data: subs }] = await Promise.all([
      supabase.from('jr_assignments').select('*, jr_courses(title)').order('due_date', { ascending: true }),
      supabase.from('jr_assignment_submissions').select('*').eq('user_id', user.id),
    ]);
    setItems(assignments ?? []);
    setSubmissions(subs ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const getSubmission = (assignmentId: string) => submissions.find(s => s.assignment_id === assignmentId);

  const getStatus = (assignment: any) => {
    const sub = getSubmission(assignment.id);
    if (sub?.status === 'graded') return 'graded';
    if (sub) return 'submitted';
    if (assignment.due_date && new Date(assignment.due_date) < new Date()) return 'overdue';
    return 'pending';
  };

  const handleFileSelect = (assignmentId: string, file: File | null) => {
    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File size must be under ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    if (file && !ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only PDF, DOC, DOCX, TXT, PNG, JPG files are allowed');
      return;
    }
    setSelectedFile(prev => ({ ...prev, [assignmentId]: file }));
  };

  const handleSubmit = async (assignmentId: string) => {
    if (!user) return;
    const file = selectedFile[assignmentId];
    const content = textContent[assignmentId];
    if (!file && !content?.trim()) {
      toast.error('Please upload a file or enter text content');
      return;
    }

    setSubmitting(assignmentId);
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (file) {
        const filePath = `${user.id}/${assignmentId}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('jr-assignments')
          .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('jr-assignments').getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
        fileName = file.name;
      }

      const existing = getSubmission(assignmentId);
      if (existing) {
        const { error } = await supabase.from('jr_assignment_submissions')
          .update({ content: content?.trim() || null, file_url: fileUrl, file_name: fileName, status: 'pending', submitted_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('jr_assignment_submissions')
          .insert({ assignment_id: assignmentId, user_id: user.id, content: content?.trim() || null, file_url: fileUrl, file_name: fileName, status: 'pending' });
        if (error) throw error;
      }

      toast.success('Assignment submitted! 🎉');
      setSelectedFile(prev => ({ ...prev, [assignmentId]: null }));
      setTextContent(prev => ({ ...prev, [assignmentId]: '' }));
      setExpandedId(null);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
      graded: { icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Graded', cls: 'bg-green-100 text-green-700' },
      submitted: { icon: <Clock className="w-3.5 h-3.5" />, label: 'Submitted', cls: 'bg-blue-100 text-blue-700' },
      overdue: { icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Overdue', cls: 'bg-red-100 text-red-700' },
      pending: { icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' },
    };
    const s = map[status] || map.pending;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${s.cls}`}>{s.icon} {s.label}</span>;
  };

  return (
    <JrStudentLayout title="Assignments">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-[hsl(var(--jr-secondary))]" /> Your Tasks 📝
        </h1>
        <p className="text-[hsl(var(--jr-muted))] mt-1">Submit your work and get cool feedback from mentors.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--jr-primary))]" /></div>
      ) : items.length === 0 ? (
        <div className="jr-card p-12 text-center">
          <div className="text-6xl mb-3">📭</div>
          <p className="text-[hsl(var(--jr-muted))]">No tasks yet. New ones will appear here!</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {items.map((a) => {
            const status = getStatus(a);
            const sub = getSubmission(a.id);
            const isExpanded = expandedId === a.id;

            return (
              <div key={a.id} className="jr-card p-6">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--jr-secondary)/0.2)] flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-6 h-6 text-[hsl(var(--jr-secondary))]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-extrabold text-lg">{a.title}</div>
                      {statusBadge(status)}
                    </div>
                    {a.jr_courses?.title && (
                      <div className="text-xs text-[hsl(var(--jr-muted))] mt-0.5">{a.jr_courses.title}</div>
                    )}
                    {a.description && <div className="text-sm text-[hsl(var(--jr-muted))] mt-1">{a.description}</div>}

                    {/* Instructions */}
                    {a.instructions && (
                      <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
                        <div className="flex items-center gap-1 text-xs font-bold text-blue-700 mb-1"><Info className="w-3.5 h-3.5" /> Instructions</div>
                        <div className="text-sm text-blue-800 whitespace-pre-wrap">{a.instructions}</div>
                      </div>
                    )}

                    {/* Admin uploaded file */}
                    {a.file_url && (
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-[hsl(var(--jr-primary))] hover:underline">
                        <Download className="w-4 h-4" /> Download: {a.file_name || 'Assignment File'}
                      </a>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-[hsl(var(--jr-muted))]">
                      {a.due_date && (
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Due {new Date(a.due_date).toLocaleDateString()}</span>
                      )}
                      <span>Max Score: {a.max_score || 100}</span>
                    </div>

                    {/* Graded feedback */}
                    {sub?.status === 'graded' && (
                      <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200">
                        <div className="font-bold text-green-700">Score: {sub.score}/{a.max_score || 100}</div>
                        {sub.feedback && <div className="text-sm text-green-600 mt-1">{sub.feedback}</div>}
                      </div>
                    )}

                    {/* Submitted file info */}
                    {sub?.file_url && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <FileText className="w-3.5 h-3.5 text-[hsl(var(--jr-primary))]" />
                        <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--jr-primary))] hover:underline">{sub.file_name || 'View file'}</a>
                      </div>
                    )}

                    {/* Submit / Resubmit button */}
                    {status !== 'graded' && (
                      <div className="mt-3">
                        {!isExpanded ? (
                          <button
                            onClick={() => setExpandedId(a.id)}
                            className="jr-btn text-sm"
                          >
                            <Upload className="w-4 h-4" /> {sub ? 'Resubmit' : 'Submit'}
                          </button>
                        ) : (
                          <div className="space-y-3 p-4 rounded-xl bg-[hsl(var(--jr-surface))] border border-[hsl(var(--jr-border))]">
                            <div>
                              <label className="text-xs font-bold block mb-1">Upload Document (max {MAX_FILE_SIZE_MB}MB)</label>
                              <div className="flex items-center gap-2">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                                  className="jr-input text-sm flex-1"
                                  onChange={(e) => handleFileSelect(a.id, e.target.files?.[0] || null)}
                                />
                                {selectedFile[a.id] && (
                                  <button onClick={() => handleFileSelect(a.id, null)} className="p-1 text-red-500 hover:bg-red-50 rounded-full">
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {selectedFile[a.id] && (
                                <div className="text-xs text-[hsl(var(--jr-muted))] mt-1">
                                  {selectedFile[a.id]!.name} ({(selectedFile[a.id]!.size / 1024 / 1024).toFixed(2)} MB)
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="text-xs font-bold block mb-1">Or write your answer</label>
                              <textarea
                                className="jr-input min-h-[80px]"
                                placeholder="Type your answer here..."
                                value={textContent[a.id] || ''}
                                onChange={(e) => setTextContent(prev => ({ ...prev, [a.id]: e.target.value }))}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSubmit(a.id)}
                                disabled={submitting === a.id}
                                className="jr-btn text-sm"
                              >
                                {submitting === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {submitting === a.id ? 'Submitting...' : 'Submit'}
                              </button>
                              <button onClick={() => setExpandedId(null)} className="jr-btn-outline text-sm">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </JrStudentLayout>
  );
}
