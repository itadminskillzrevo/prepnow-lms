import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { JrStudentLayout } from '@/jr/components/JrStudentLayout';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Loader2, ArrowRight, Compass } from 'lucide-react';

export default function JrMyCourses() {
  const { user } = useJrAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('jr_enrollments')
        .select('id, payment_status, approval_status, jr_courses(*)')
        .eq('user_id', user.id);
      setCourses((data ?? []).map((r: any) => ({ ...r.jr_courses, enrollment: r })).filter((c: any) => c?.id));
      setLoading(false);
    })();
  }, [user]);

  return (
    <JrStudentLayout title="My Courses">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-[hsl(var(--jr-primary))]" /> My Enrolled Courses
        </h1>
        <p className="text-[hsl(var(--jr-muted))] mt-1">Continue from where you left off.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--jr-primary))]" /></div>
      ) : courses.length === 0 ? (
        <div className="jr-card p-12 text-center">
          <div className="text-6xl mb-3">📚</div>
          <p className="text-[hsl(var(--jr-muted))] mb-5">You haven't enrolled in any course yet.</p>
          <Link to="/jr/courses" className="jr-btn"><Compass className="w-4 h-4" /> Explore Courses</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map((c) => {
            const status = c.enrollment?.approval_status || 'pending';
            const isApproved = status === 'approved';
            const Wrapper = isApproved ? Link : 'div' as any;
            return (
              <Wrapper key={c.id} to={isApproved ? `/jr/courses/${c.id}` : undefined} className="jr-card overflow-hidden group">
                <div className="aspect-video bg-gradient-to-br from-[hsl(var(--jr-primary)/0.2)] to-[hsl(var(--jr-pink)/0.2)] flex items-center justify-center text-5xl">
                  {c.thumbnail_url ? <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" /> : '📘'}
                </div>
                <div className="p-4">
                  <div className="font-extrabold">{c.title}</div>
                  <div className="text-xs text-[hsl(var(--jr-muted))] mt-1">{c.grade_level || 'Junior course'}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                      isApproved
                        ? 'bg-green-100 text-green-700'
                        : status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {status === 'approved' ? '✅ Approved' : status === 'rejected' ? '❌ Rejected' : '⏳ Pending Approval'}
                    </span>
                    {isApproved && (
                      <span className="text-[hsl(var(--jr-primary))] text-sm font-semibold inline-flex items-center gap-1">
                        Continue <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}
    </JrStudentLayout>
  );
}
