import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import '@/selfpaced/styles/selfpaced.css';
import {
  LayoutDashboard, Tags, BookOpen, GraduationCap, ShoppingBag,
  Users, FileText, HelpCircle, LogOut, ArrowLeftRight, UserCog, TicketPercent,
} from 'lucide-react';

const items = [
  { to: '/selfpaced/admin', end: true, icon: LayoutDashboard, label: 'Overview' },
  { to: '/selfpaced/admin/categories', icon: Tags, label: 'Categories' },
  { to: '/selfpaced/admin/courses', icon: BookOpen, label: 'Courses' },
  { to: '/selfpaced/admin/students', icon: GraduationCap, label: 'Students' },
  { to: '/selfpaced/admin/users', icon: UserCog, label: 'Users' },
  { to: '/selfpaced/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/selfpaced/admin/coupons', icon: TicketPercent, label: 'Coupons' },
  { to: '/selfpaced/admin/quizzes', icon: HelpCircle, label: 'Quizzes' },
  { to: '/selfpaced/admin/assignments', icon: FileText, label: 'Assignments' },
];

export const SpAdminLayout: React.FC = () => {
  const { signOut, profile } = useSpAuth();
  return (
    <div className="sp-scope" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
      <aside style={{ borderRight: '1px solid hsl(var(--sp-border))', background: 'hsl(var(--sp-surface))', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 800, marginBottom: '1.5rem', fontSize: '1.05rem' }}>SP Admin</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '.2rem', flex: 1 }}>
          {items.map(it => {
            const Icon = it.icon;
            return (
              <NavLink key={it.to} to={it.to} end={it.end}
                style={({ isActive }) => ({
                  display: 'flex', gap: '.6rem', alignItems: 'center', padding: '.55rem .7rem', borderRadius: 8,
                  color: isActive ? 'hsl(var(--sp-primary))' : 'hsl(var(--sp-foreground))',
                  background: isActive ? 'hsl(var(--sp-primary) / 0.1)' : 'transparent',
                  textDecoration: 'none', fontWeight: 600, fontSize: '.9rem',
                })}>
                <Icon size={17} />{it.label}
              </NavLink>
            );
          })}
        </nav>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
          <div style={{ fontSize: '.75rem', color: 'hsl(var(--sp-muted))', padding: '.35rem .7rem' }}>{profile?.email}</div>
          <NavLink to="/selfpaced/profile" className="sp-btn sp-btn-outline" style={{ justifyContent: 'flex-start' }}><UserCog size={14} /> My profile</NavLink>
          <NavLink to="/selfpaced" className="sp-btn sp-btn-outline" style={{ justifyContent: 'flex-start' }}><ArrowLeftRight size={14} /> Storefront</NavLink>
          <button className="sp-btn sp-btn-ghost" onClick={() => void signOut()} style={{ justifyContent: 'flex-start' }}><LogOut size={14} /> Sign out</button>
        </div>
      </aside>
      <main style={{ padding: '1.5rem', overflowY: 'auto' }}><Outlet /></main>
    </div>
  );
};

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/selfpaced/lib/cart';

export const SpAdminOverview: React.FC = () => {
  const [stats, setStats] = useState({ courses: 0, students: 0, orders: 0, revenue: 0 });
  useEffect(() => {
    (async () => {
      const [{ count: courses }, { count: students }, { data: orders }] = await Promise.all([
        supabase.from('selfpaced_courses').select('id', { count: 'exact', head: true }),
        supabase.from('selfpaced_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('selfpaced_orders').select('total,status').eq('status', 'paid'),
      ]);
      const revenue = (orders ?? []).reduce((s, o: any) => s + Number(o.total ?? 0), 0);
      setStats({ courses: courses ?? 0, students: students ?? 0, orders: (orders ?? []).length, revenue });
    })();
  }, []);
  const cards = [
    { l: 'Total courses', v: stats.courses },
    { l: 'Total students', v: stats.students },
    { l: 'Paid orders', v: stats.orders },
    { l: 'Revenue', v: formatPrice(stats.revenue) },
  ];
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Overview</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '.75rem' }}>
        {cards.map(c => (
          <div key={c.l} className="sp-card" style={{ padding: '1.25rem' }}>
            <div style={{ color: 'hsl(var(--sp-muted))', fontSize: '.8rem' }}>{c.l}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{c.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
