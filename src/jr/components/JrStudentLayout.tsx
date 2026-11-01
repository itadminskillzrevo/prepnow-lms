import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { JrLayout } from '@/jr/components/JrLayout';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  ClipboardList,
  Award,
  User,
  Compass,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const items = [
  { to: '/jr/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jr/my-courses', label: 'My Courses', icon: BookOpen },
  { to: '/jr/quizzes', label: 'Quizzes', icon: Trophy },
  { to: '/jr/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/jr/certificates', label: 'Certificates', icon: Award },
  { to: '/jr/profile', label: 'Profile', icon: User },
  { to: '/jr/courses', label: 'Explore Courses', icon: Compass },
];

export const JrStudentLayout: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => {
  const loc = useLocation();
  const nav = useNavigate();
  const { signOut, profile } = useJrAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) =>
    to === '/jr/courses' ? loc.pathname === '/jr/courses' : loc.pathname.startsWith(to);

  const handleLogout = async () => {
    await signOut();
    nav('/jr');
  };

  const SidebarInner = (
    <div className="flex flex-col h-full">
      {/* Mini profile */}
      <div className="px-4 py-5 border-b border-[hsl(var(--jr-border))]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[hsl(var(--jr-primary))] to-[hsl(var(--jr-pink))] flex items-center justify-center text-white font-extrabold overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.charAt(0) || 'S'
            )}
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm truncate">{profile?.full_name || 'Junior Learner'}</div>
            <div className="text-[11px] text-[hsl(var(--jr-muted))] truncate">{profile?.grade || 'Student'}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                active
                  ? 'bg-gradient-to-r from-[hsl(var(--jr-primary))] to-[hsl(var(--jr-pink))] text-white shadow-md'
                  : 'text-[hsl(var(--jr-foreground))] hover:bg-[hsl(var(--jr-primary)/0.08)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-[hsl(var(--jr-border))]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <JrLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Mobile toggle */}
        <div className="lg:hidden flex items-center justify-between mb-4">
          <h1 className="text-xl font-extrabold">{title || 'Student'}</h1>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg bg-white border border-[hsl(var(--jr-border))] shadow-sm"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="jr-card p-0 sticky top-24 overflow-hidden h-[calc(100vh-7rem)]">
              {SidebarInner}
            </div>
          </aside>

          {/* Mobile drawer */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileOpen(false)}
              />
              <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--jr-border))]">
                  <span className="font-extrabold">Menu</span>
                  <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {SidebarInner}
              </div>
            </div>
          )}

          {/* Main */}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </JrLayout>
  );
};
