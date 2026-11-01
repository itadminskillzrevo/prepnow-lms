import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useJrAuth } from '@/jr/contexts/JrAuthContext';
import { LogIn, LogOut, Menu, X, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';
import '@/jr/styles/jr.css';

export const JrLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, signOut } = useJrAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const navLinks: { to: string; label: string; external?: boolean }[] = [
    { to: '/jr', label: 'Home' },
    { to: 'https://academyjunior.skillzrevo.com/about-us', label: 'About Us', external: true },
    { to: '/jr/courses', label: 'Courses' },
    { to: 'https://academyjunior.skillzrevo.com/contact-us', label: 'Contact Us', external: true },
  ];

  const isActive = (to: string) => to === '/jr' ? loc.pathname === '/jr' : loc.pathname.startsWith(to);

  return (
    <div className="jr-scope">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 border-b border-[hsl(var(--jr-border))] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/jr" className="flex items-center gap-2 shrink-0">
            <img src="/logo.png" alt="SkillzRevo" className="h-10 w-auto object-contain" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              l.external ? (
                <a
                  key={l.to}
                  href={l.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-full text-sm font-semibold transition text-[hsl(var(--jr-foreground))] hover:bg-[hsl(var(--jr-primary)/0.08)] hover:text-[hsl(var(--jr-primary))]"
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    isActive(l.to)
                      ? 'bg-[hsl(var(--jr-primary)/0.12)] text-[hsl(var(--jr-primary))]'
                      : 'text-[hsl(var(--jr-foreground))] hover:bg-[hsl(var(--jr-primary)/0.08)] hover:text-[hsl(var(--jr-primary))]'
                  }`}
                >
                  {l.label}
                </Link>
              )
            ))}
            {role === 'jr_admin' && (
              <Link to="/jr/admin" className="px-3 py-2 rounded-full text-sm font-semibold text-[hsl(var(--jr-secondary))] hover:bg-[hsl(var(--jr-secondary)/0.1)]">
                ⚙️ Admin
              </Link>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link to="/jr/dashboard" className="hidden sm:inline-flex text-sm font-semibold text-[hsl(var(--jr-primary))] px-3 py-2 rounded-full hover:bg-[hsl(var(--jr-primary)/0.08)]">
                  Dashboard
                </Link>
                <Link to="/jr/profile" className="hidden sm:inline-flex text-sm font-semibold text-[hsl(var(--jr-primary))] px-3 py-2 rounded-full hover:bg-[hsl(var(--jr-primary)/0.08)]">
                  Profile
                </Link>
                <button onClick={signOut} className="jr-btn jr-btn-secondary !py-2 !px-4 text-sm">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </>
            ) : (
              <button onClick={() => nav('/jr/auth')} className="jr-btn !py-2 !px-5 text-sm">
                <LogIn className="w-4 h-4" /> Login
              </button>
            )}
            <button className="md:hidden p-2 rounded-lg hover:bg-[hsl(var(--jr-primary)/0.08)]" onClick={() => setOpen(!open)} aria-label="Toggle menu">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {open && (
          <div className="md:hidden border-t border-[hsl(var(--jr-border))] bg-white px-4 py-3 flex flex-col gap-1">
            {navLinks.map((l) => (
              l.external ? (
                <a
                  key={l.to}
                  href={l.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-xl font-semibold hover:bg-[hsl(var(--jr-primary)/0.08)]"
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-2.5 rounded-xl font-semibold ${
                    isActive(l.to) ? 'bg-[hsl(var(--jr-primary)/0.12)] text-[hsl(var(--jr-primary))]' : 'hover:bg-[hsl(var(--jr-primary)/0.08)]'
                  }`}
                >
                  {l.label}
                </Link>
              )
            ))}
            {user && (
              <>
                <Link to="/jr/dashboard" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-xl font-semibold text-[hsl(var(--jr-primary))]">
                  Dashboard
                </Link>
                <Link to="/jr/profile" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-xl font-semibold text-[hsl(var(--jr-primary))]">
                  Profile
                </Link>
              </>
            )}
            {role === 'jr_admin' && (
              <Link to="/jr/admin" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-xl font-semibold text-[hsl(var(--jr-secondary))]">
                ⚙️ Admin
              </Link>
            )}
          </div>
        )}
      </header>

      <main>{children}</main>

      {/* Footer — mirrors /home layout */}
      <footer className="py-8 md:py-12 bg-white/70 border-t border-[hsl(var(--jr-border))] mt-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
            {/* Brand Column */}
            <div className="space-y-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="SkillzRevo" className="h-10 w-auto object-contain" />
              </div>
              <p className="text-[hsl(var(--jr-muted))] text-sm leading-relaxed">
                Empowering young learners with fun, interactive courses designed just for school students.
              </p>
              <div className="flex items-center gap-3 pt-2">
                {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-full bg-[hsl(var(--jr-primary)/0.1)] flex items-center justify-center text-[hsl(var(--jr-primary))] hover:bg-[hsl(var(--jr-primary))] hover:text-white transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-[hsl(var(--jr-foreground))]">Quick Links</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Home', to: '/jr', external: false },
                  { label: 'About Us', to: 'https://academyjunior.skillzrevo.com/about-us', external: true },
                  { label: 'Courses', to: '/jr/courses', external: false },
                  { label: 'Contact Us', to: 'https://academyjunior.skillzrevo.com/contact-us', external: true },
                  { label: 'Login', to: '/jr/auth', external: false },
                ].map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a href={link.to} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--jr-muted))] hover:text-[hsl(var(--jr-primary))] transition-colors text-sm">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.to} className="text-[hsl(var(--jr-muted))] hover:text-[hsl(var(--jr-primary))] transition-colors text-sm">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Subjects */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-[hsl(var(--jr-foreground))]">Popular Subjects</h4>
              <ul className="space-y-2">
                {['Web Dev', 'AI & ML', 'Cybersecurity', 'Cloud', 'Programming'].map((s) => (
                  <li key={s}>
                    <Link to="/jr/courses" className="text-[hsl(var(--jr-muted))] hover:text-[hsl(var(--jr-primary))] transition-colors text-sm text-left">
                      {s}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-[hsl(var(--jr-foreground))]">Contact Us</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-[hsl(var(--jr-muted))]">
                  <MapPin className="h-4 w-4 mt-0.5 text-[hsl(var(--jr-primary))] shrink-0" />
                  <span>A-166, Suite no-304, 3rd Floor, A Block, Sector 63, Noida, UP 201301, India</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-[hsl(var(--jr-muted))]">
                  <Mail className="h-4 w-4 text-[hsl(var(--jr-primary))] shrink-0" />
                  <a className="hover:text-[hsl(var(--jr-primary))] transition-colors" href="mailto:enquire@skillzrevo.com">
                    enquire@skillzrevo.com
                  </a>
                </li>
                <li className="flex items-center gap-3 text-sm text-[hsl(var(--jr-muted))]">
                  <Phone className="h-4 w-4 text-[hsl(var(--jr-primary))] shrink-0" />
                  <a className="hover:text-[hsl(var(--jr-primary))] transition-colors break-all" href="tel:+916295477674">
                    +01204934917 | +916295477674
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-10 md:mt-12 pt-6 md:pt-8 border-t border-[hsl(var(--jr-border))] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[hsl(var(--jr-muted))] text-xs md:text-sm text-center md:text-left">
              © {new Date().getFullYear()} SkillzRevo. All rights reserved.
            </p>
            <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-[hsl(var(--jr-muted))]">
              <a className="hover:text-[hsl(var(--jr-primary))] transition-colors" href="https://academy.skillzrevo.com/PrivacyPolicy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              <a className="hover:text-[hsl(var(--jr-primary))] transition-colors" href="https://academy.skillzrevo.com/TermsandConditions" target="_blank" rel="noopener noreferrer">Terms of Service</a>
              <a href="#" className="hover:text-[hsl(var(--jr-primary))] transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
