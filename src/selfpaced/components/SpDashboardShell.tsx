import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import { LayoutDashboard, BookOpen, GraduationCap, FileText, Award, User, ShoppingBag, Heart } from 'lucide-react';

const items = [
  { to: '/selfpaced/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, end: true },
  { to: '/selfpaced/my-courses', label: 'My Courses', icon: <BookOpen size={16} /> },
  { to: '/selfpaced/quizzes', label: 'Quizzes', icon: <GraduationCap size={16} /> },
  { to: '/selfpaced/assignments', label: 'Assignments', icon: <FileText size={16} /> },
  { to: '/selfpaced/certificates', label: 'Certificates', icon: <Award size={16} /> },
  { to: '/selfpaced/orders', label: 'My Orders', icon: <ShoppingBag size={16} /> },
  { to: '/selfpaced/wishlist', label: 'Wishlist', icon: <Heart size={16} /> },
  { to: '/selfpaced/profile', label: 'Profile', icon: <User size={16} /> },
];

export const SpDashboardShell: React.FC = () => {
  const { profile, user } = useSpAuth();
  const name = profile?.full_name || user?.email?.split('@')[0] || 'Learner';
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1rem', display: 'grid', gap: '1.25rem', gridTemplateColumns: '240px 1fr' }} className="sp-dash-grid">
      <aside className="sp-card" style={{ padding: '1rem', height: 'fit-content', position: 'sticky', top: 90 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.4rem .3rem 1rem', borderBottom: '1px solid hsl(var(--sp-border))', marginBottom: '.6rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: 'hsl(var(--sp-primary) / 0.12)', color: 'hsl(var(--sp-primary))', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: '.72rem', color: 'hsl(var(--sp-muted))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map(it => (
            <NavLink key={it.to} to={it.to} end={it.end as any}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.55rem .7rem', borderRadius: 8,
                textDecoration: 'none', fontSize: '.88rem', fontWeight: isActive ? 700 : 500,
                background: isActive ? 'hsl(var(--sp-primary) / 0.1)' : 'transparent',
                color: isActive ? 'hsl(var(--sp-primary))' : 'hsl(var(--sp-foreground))',
              })}>
              {it.icon}{it.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div><Outlet /></div>
      <style>{`@media(max-width:900px){.sp-dash-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
};

export const SpStudentPlaceholder: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div>
    <h1 style={{ marginTop: 0 }}>{title}</h1>
    <div className="sp-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'hsl(var(--sp-muted))' }}>
      {description}
    </div>
  </div>
);
