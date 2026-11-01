import React, { useEffect, useState } from 'react';
import { Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { JrLayout } from '@/jr/components/JrLayout';
import { LayoutDashboard, FolderTree, BookOpen, Trophy, ClipboardList, Users, Loader2, FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const sections = [
  { to: '/jr/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/jr/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/jr/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/jr/admin/quizzes', label: 'Quizzes', icon: Trophy },
  { to: '/jr/admin/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/jr/admin/students', label: 'Students', icon: Users },
  { to: '/jr/admin/approvals', label: 'Approvals', icon: FileCheck },
];

export default function JrAdminLayout() {
  const { role, loading } = useJrAuth();
  const loc = useLocation();
  if (loading) return <JrLayout><div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin" /></div></JrLayout>;
  if (role !== 'jr_admin') return <Navigate to="/jr/auth?error=not_jr_admin" replace />;

  return (
    <JrLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[240px_1fr] gap-6">
        <aside className="jr-card p-3 h-fit lg:sticky lg:top-24">
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[hsl(var(--jr-muted))]">Jr Admin</div>
          <nav className="flex flex-col gap-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const active = s.exact ? loc.pathname === s.to : loc.pathname.startsWith(s.to);
              return (
                <Link key={s.to} to={s.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold ${active ? 'bg-[hsl(var(--jr-primary))] text-white' : 'hover:bg-[hsl(var(--jr-primary)/0.08)]'}`}>
                  <Icon className="w-4 h-4" /> {s.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main><Outlet /></main>
      </div>
    </JrLayout>
  );
}

export function JrAdminOverview() {
  const [stats, setStats] = useState({ courses: 0, students: 0, quizzes: 0, assignments: 0 });
  useEffect(() => {
    (async () => {
      const [a, b, c, d] = await Promise.all([
        supabase.from('jr_courses').select('id', { count: 'exact', head: true }),
        supabase.from('jr_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('jr_quizzes').select('id', { count: 'exact', head: true }),
        supabase.from('jr_assignments').select('id', { count: 'exact', head: true }),
      ]);
      setStats({ courses: a.count ?? 0, students: b.count ?? 0, quizzes: c.count ?? 0, assignments: d.count ?? 0 });
    })();
  }, []);
  const cards = [
    { label: 'Courses', value: stats.courses, emoji: '📚' },
    { label: 'Students', value: stats.students, emoji: '🧑‍🎓' },
    { label: 'Quizzes', value: stats.quizzes, emoji: '🏆' },
    { label: 'Assignments', value: stats.assignments, emoji: '📝' },
  ];
  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-6">Jr Admin Overview</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="jr-card p-5">
            <div className="text-3xl">{c.emoji}</div>
            <div className="text-sm text-[hsl(var(--jr-muted))] mt-2">{c.label}</div>
            <div className="text-3xl font-extrabold">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
