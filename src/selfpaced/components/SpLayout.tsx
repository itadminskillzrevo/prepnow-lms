import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSpAuth } from '@/selfpaced/contexts/SpAuthContext';
import '@/selfpaced/styles/selfpaced.css';
import { ShoppingCart, Heart, User, Search, LogOut, LayoutDashboard, BookOpen, Menu, X } from 'lucide-react';

export const SpLayout: React.FC = () => {
  const { user, role, signOut } = useSpAuth();
  const nav = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');

  const refreshCounts = async () => {
    if (!user) { setCartCount(0); setWishCount(0); return; }
    const [{ count: c }, { count: w }] = await Promise.all([
      supabase.from('selfpaced_cart_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('selfpaced_wishlist').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setCartCount(c ?? 0); setWishCount(w ?? 0);
  };

  useEffect(() => { void refreshCounts(); }, [user?.id]);
  useEffect(() => {
    const h = () => { void refreshCounts(); };
    window.addEventListener('sp:cart-updated', h);
    window.addEventListener('sp:wishlist-updated', h);
    return () => {
      window.removeEventListener('sp:cart-updated', h);
      window.removeEventListener('sp:wishlist-updated', h);
    };
  }, [user?.id]);

  return (
    <div className="sp-scope">
      <header style={{ background: 'hsl(var(--sp-surface))', borderBottom: '1px solid hsl(var(--sp-border))', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/selfpaced" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/prepnowlogo.jpeg" alt="Prepnow" style={{ height: 44, maxWidth: 180, objectFit: 'contain' }} />
          </Link>

          <form
            onSubmit={(e) => { e.preventDefault(); nav(`/selfpaced/courses?q=${encodeURIComponent(q)}`); }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '.5rem', maxWidth: 520, marginLeft: '1rem' }}
            className="sp-search-form"
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--sp-muted))' }} />
              <input className="sp-input" placeholder="Search courses..." value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 36 }} />
            </div>
          </form>

          <nav className="sp-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <NavLink to="/selfpaced/courses" className="sp-btn sp-btn-ghost">Courses</NavLink>
            <NavLink to="/selfpaced/wishlist" className="sp-btn sp-btn-ghost" style={{ position: 'relative' }}>
              <Heart size={18} />
              {wishCount > 0 && <span style={badgeStyle}>{wishCount}</span>}
            </NavLink>
            <NavLink to="/selfpaced/cart" className="sp-btn sp-btn-ghost" style={{ position: 'relative' }}>
              <ShoppingCart size={18} />
              {cartCount > 0 && <span style={badgeStyle}>{cartCount}</span>}
            </NavLink>
            {user ? (
              <div style={{ display: 'flex', gap: '.35rem' }}>
                <NavLink to="/selfpaced/dashboard" className="sp-btn sp-btn-outline"><LayoutDashboard size={16} /> Dashboard</NavLink>
                <NavLink to="/selfpaced/profile" className="sp-btn sp-btn-ghost" title="My profile"><User size={16} /></NavLink>
                {role === 'sp_admin' && <NavLink to="/selfpaced/admin" className="sp-btn sp-btn-accent">Admin</NavLink>}
                <button className="sp-btn sp-btn-ghost" onClick={() => void signOut()}><LogOut size={16} /></button>
              </div>
            ) : (
              <SignInDropdown />
            )}
          </nav>

          <button className="sp-btn sp-btn-ghost sp-mobile-menu" onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none' }}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div style={{ padding: '0.5rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '.35rem', borderTop: '1px solid hsl(var(--sp-border))' }}>
            <NavLink to="/selfpaced/courses" onClick={() => setMenuOpen(false)}>Courses</NavLink>
            <NavLink to="/selfpaced/cart" onClick={() => setMenuOpen(false)}>Cart ({cartCount})</NavLink>
            <NavLink to="/selfpaced/wishlist" onClick={() => setMenuOpen(false)}>Wishlist ({wishCount})</NavLink>
            {user
              ? <>
                  <NavLink to="/selfpaced/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
                  <NavLink to="/selfpaced/profile" onClick={() => setMenuOpen(false)}>My profile</NavLink>
                  <NavLink to="/selfpaced/orders" onClick={() => setMenuOpen(false)}>Orders</NavLink>
                  {role === 'sp_admin' && <NavLink to="/selfpaced/admin" onClick={() => setMenuOpen(false)}>Admin</NavLink>}
                  <button className="sp-btn sp-btn-outline" onClick={() => void signOut()}>Sign out</button>
                </>
              : <NavLink to="/selfpaced/auth" onClick={() => setMenuOpen(false)}>Sign in</NavLink>}
          </div>
        )}
      </header>

      <style>{`
        @media (max-width: 820px) {
          .sp-scope .sp-desktop-nav { display: none !important; }
          .sp-scope .sp-mobile-menu { display: inline-flex !important; }
          .sp-scope .sp-search-form { display: none !important; }
        }
      `}</style>

      <main>
        <Outlet />
      </main>

      <footer style={{ borderTop: '1px solid hsl(var(--sp-border))', background: 'hsl(var(--sp-surface))', marginTop: '3rem', color: 'hsl(var(--sp-muted))', fontSize: '.88rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2.5rem 1.5rem 1.5rem', display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div>
            <img src="/prepnowlogo.jpeg" alt="Prepnow" style={{ height: 40, marginBottom: '.75rem' }} />
            <p style={{ margin: 0, lineHeight: 1.6 }}>Learn at your own pace with expert-crafted self-paced programs designed to build real, industry-ready skills.</p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 .6rem', color: 'hsl(var(--sp-foreground))', fontSize: '.95rem' }}>Explore</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
              <li><Link to="/selfpaced" style={footLink}>Home</Link></li>
              <li><Link to="/selfpaced/courses" style={footLink}>All Courses</Link></li>
              <li><Link to="/selfpaced/wishlist" style={footLink}>Wishlist</Link></li>
              <li><Link to="/selfpaced/cart" style={footLink}>Cart</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ margin: '0 0 .6rem', color: 'hsl(var(--sp-foreground))', fontSize: '.95rem' }}>Account</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
              <li><Link to="/selfpaced/auth?mode=login" style={footLink}>Sign In</Link></li>
              <li><Link to="/selfpaced/auth?mode=signup" style={footLink}>Sign Up</Link></li>
              <li><Link to="/selfpaced/dashboard" style={footLink}>Dashboard</Link></li>
              <li><Link to="/selfpaced/orders" style={footLink}>My Orders</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ margin: '0 0 .6rem', color: 'hsl(var(--sp-foreground))', fontSize: '.95rem' }}>Company</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
              <li><Link to="/" style={footLink}>Prepnow Home</Link></li>
              <li><Link to="/home" style={footLink}>Prepnow Academy</Link></li>
              <li><Link to="/jr" style={footLink}>Prepnow Jr</Link></li>
              <li><a href="mailto:support@skillzrevo.com" style={footLink}>Contact Support</a></li>
            </ul>
          </div>
        </div>
        <div style={{ borderTop: '1px solid hsl(var(--sp-border))', padding: '1rem 1.5rem', textAlign: 'center' }}>
          © {new Date().getFullYear()} Prepnow. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

const badgeStyle: React.CSSProperties = {
  position: 'absolute', top: -4, right: -4,
  background: 'hsl(var(--sp-accent))', color: 'white',
  fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
  borderRadius: 999, display: 'grid', placeItems: 'center', padding: '0 5px',
};

const footLink: React.CSSProperties = { color: 'hsl(var(--sp-muted))', textDecoration: 'none' };

const SignInDropdown: React.FC = () => {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);
  const go = (path: string) => (e: React.MouseEvent) => { e.stopPropagation(); setOpen(false); nav(path); };
  return (
    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button className="sp-btn" onClick={() => setOpen((o) => !o)}>
        <User size={16} /> Sign In ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
          background: 'hsl(var(--sp-surface))', border: '1px solid hsl(var(--sp-border))',
          borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', minWidth: 180, padding: 6, zIndex: 50,
        }}>
          <button className="sp-btn sp-btn-ghost" style={dropItem} onClick={go('/selfpaced/auth?mode=login')}>Sign In</button>
          <button className="sp-btn sp-btn-ghost" style={dropItem} onClick={go('/selfpaced/auth?mode=signup')}>Sign Up</button>
          <button className="sp-btn sp-btn-ghost" style={dropItem} onClick={go('/selfpaced/admin/login')}>Login as Admin</button>
        </div>
      )}
    </div>
  );
};

const dropItem: React.CSSProperties = { width: '100%', justifyContent: 'flex-start', textAlign: 'left' };
