import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { JrStudentLayout } from '@/jr/components/JrStudentLayout';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Award, Download, Loader2, Sparkles, CheckCircle2, Lock } from 'lucide-react';

export default function JrCertificates() {
  const { user, profile } = useJrAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('jr_enrollments')
        .select('id, completed_at, approval_status, jr_courses(id, title, thumbnail_url)')
        .eq('user_id', user.id);
      setEnrollments(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const completed = enrollments.filter((e) => e.completed_at);
  const inProgress = enrollments.filter((e) => !e.completed_at && e.jr_courses);

  return (
    <JrStudentLayout title="Certificates">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold flex items-center gap-2">
          <Award className="w-7 h-7 text-[hsl(var(--jr-secondary))]" /> Your Certificates
        </h1>
        <p className="text-[hsl(var(--jr-muted))] mt-1">Earn a certificate by completing your courses.</p>
      </div>

      {/* How it works */}
      <div className="jr-card p-6 mb-6 bg-gradient-to-br from-[hsl(var(--jr-secondary)/0.08)] to-[hsl(var(--jr-accent)/0.12)]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--jr-secondary)/0.2)] flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-[hsl(var(--jr-secondary))]" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold mb-1">How do I get a certificate?</h2>
            <p className="text-sm text-[hsl(var(--jr-muted))] leading-relaxed">
              Once you complete <span className="font-bold text-[hsl(var(--jr-foreground))]">100% of a course</span>—
              including all lessons, quizzes, and assignments—a certificate of completion will automatically be
              issued in your name. You can then download it as a PDF and share it proudly with your school,
              parents, and friends! 🎉
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--jr-primary))]" /></div>
      ) : (
        <>
          {/* Earned certificates */}
          <h2 className="text-xl font-extrabold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" /> Earned ({completed.length})
          </h2>
          {completed.length === 0 ? (
            <div className="jr-card p-10 text-center mb-8">
              <div className="text-5xl mb-2">🏅</div>
              <p className="text-[hsl(var(--jr-muted))]">No certificates yet — finish a course to unlock your first one!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5 mb-8">
              {completed.map((e) => (
                <div key={e.id} className="jr-card p-6 bg-gradient-to-br from-[hsl(var(--jr-accent)/0.1)] to-white">
                  <div className="flex items-center gap-3 mb-3">
                    <Award className="w-10 h-10 text-[hsl(var(--jr-secondary))]" />
                    <div>
                      <div className="font-extrabold">{e.jr_courses?.title}</div>
                      <div className="text-xs text-[hsl(var(--jr-muted))]">
                        Completed {new Date(e.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[hsl(var(--jr-muted))] mb-4">
                    Awarded to <span className="font-bold text-[hsl(var(--jr-foreground))]">{profile?.full_name}</span>
                  </p>
                  <button className="jr-btn !py-2 !px-4 text-sm">
                    <Download className="w-4 h-4" /> Download
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* In-progress courses */}
          <h2 className="text-xl font-extrabold mb-3 flex items-center gap-2">
            <Lock className="w-5 h-5 text-[hsl(var(--jr-muted))]" /> In Progress ({inProgress.length})
          </h2>
          {inProgress.length === 0 ? (
            <div className="jr-card p-10 text-center">
              <p className="text-[hsl(var(--jr-muted))] mb-4">Enroll in a course to start earning certificates!</p>
              <Link to="/jr/courses" className="jr-btn">Explore Courses</Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {inProgress.map((e) => (
                <div key={e.id} className="jr-card p-5 opacity-90">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[hsl(var(--jr-muted)/0.15)] flex items-center justify-center">
                      <Lock className="w-5 h-5 text-[hsl(var(--jr-muted))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{e.jr_courses?.title}</div>
                      <div className="text-xs text-[hsl(var(--jr-muted))]">Complete the course to unlock</div>
                    </div>
                    <Link
                      to={`/jr/courses/${e.jr_courses?.id}`}
                      className="text-xs font-bold text-[hsl(var(--jr-primary))] hover:underline shrink-0"
                    >
                      Continue →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </JrStudentLayout>
  );
}
