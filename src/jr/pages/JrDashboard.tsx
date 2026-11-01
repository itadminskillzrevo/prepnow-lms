import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { JrStudentLayout } from '@/jr/components/JrStudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Trophy, ClipboardList, Sparkles, Flame, ArrowRight, Award } from 'lucide-react';

export default function JrDashboard() {
  const { profile, user } = useJrAuth();
  const [stats, setStats] = useState({ enrolled: 0, quizzes: 0, assignments: 0, certificates: 0 });
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const [enr, quizCount, asgnCount, certs, courseRows] = await Promise.all([
        supabase.from('jr_enrollments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('jr_quiz_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('jr_assignment_submissions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('jr_enrollments').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('completed_at', 'is', null),
        supabase.from('jr_enrollments').select('course_id, jr_courses(*)').eq('user_id', user.id).limit(6),
      ]);
      setStats({
        enrolled: enr.count ?? 0,
        quizzes: quizCount.count ?? 0,
        assignments: asgnCount.count ?? 0,
        certificates: certs.count ?? 0,
      });
      setCourses((courseRows.data ?? []).map((r: any) => r.jr_courses).filter(Boolean));
    })();
  }, [user]);

  const cards = [
    { label: 'Enrolled Courses', value: stats.enrolled, emoji: '📚', to: '/jr/my-courses' },
    { label: 'Quiz Attempts', value: stats.quizzes, emoji: '🏆', to: '/jr/quizzes' },
    { label: 'Tasks Done', value: stats.assignments, emoji: '✅', to: '/jr/assignments' },
    { label: 'Certificates', value: stats.certificates, emoji: '🏅', to: '/jr/certificates' },
  ];

  return (
    <JrStudentLayout title="Dashboard">
      <div className="jr-card p-6 md:p-7 mb-6 bg-gradient-to-br from-[hsl(var(--jr-primary)/0.08)] to-[hsl(var(--jr-pink)/0.08)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="jr-chip mb-2"><Flame className="w-3.5 h-3.5" /> Day 1 streak — keep it up!</div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Hi, {profile?.full_name?.split(' ')[0] || 'Learner'}! 👋</h1>
          <p className="text-[hsl(var(--jr-muted))] text-sm">{profile?.grade ? `${profile.grade} • ` : ''}Ready to learn something cool today?</p>
        </div>
        <Link to="/jr/courses" className="jr-btn !py-2.5 !px-5 text-sm">
          Explore courses <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="jr-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-[hsl(var(--jr-muted))] font-semibold uppercase tracking-wider">{c.label}</div>
                <div className="text-3xl font-extrabold mt-1">{c.value}</div>
              </div>
              <div className="text-3xl">{c.emoji}</div>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[hsl(var(--jr-primary))]" /> Continue learning
      </h2>
      {courses.length === 0 ? (
        <div className="jr-card p-10 text-center">
          <div className="text-5xl mb-2">🌱</div>
          <p className="text-[hsl(var(--jr-muted))] mb-4">You haven't joined any course yet. Pick one to start!</p>
          <Link to="/jr/courses" className="jr-btn">Browse Courses</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map((c) => (
            <Link key={c.id} to={`/jr/courses/${c.id}`} className="jr-card overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-[hsl(var(--jr-primary)/0.2)] to-[hsl(var(--jr-pink)/0.2)] flex items-center justify-center text-5xl">
                {c.thumbnail_url ? <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" /> : '📘'}
              </div>
              <div className="p-4">
                <div className="font-extrabold">{c.title}</div>
                <div className="text-xs text-[hsl(var(--jr-muted))] mt-1">{c.grade_level}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </JrStudentLayout>
  );
}
