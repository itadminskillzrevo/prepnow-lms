import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type SpRole = 'sp_student' | 'sp_admin' | 'admin' | 'superadmin' | null;

export interface SpProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}

interface SpAuthContextType {
  user: User | null;
  session: Session | null;
  profile: SpProfile | null;
  role: SpRole;
  loading: boolean;
  signUp: (d: { email: string; password: string; full_name: string; phone?: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SpAuthContext = createContext<SpAuthContextType | undefined>(undefined);
export const useSpAuth = () => {
  const c = useContext(SpAuthContext);
  if (!c) throw new Error('useSpAuth must be used within SpAuthProvider');
  return c;
};

export const SpAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SpProfile | null>(null);
  const [role, setRole] = useState<SpRole>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = async (uid: string) => {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from('selfpaced_profiles').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', uid),
    ]);
    setProfile((prof as SpProfile) ?? null);
    const roles = (roleRows ?? []).map((r: any) => r.role as string);
    let resolved: SpRole = null;
    if (roles.includes('superadmin') || roles.includes('admin') || roles.includes('sp_admin')) resolved = 'sp_admin';
    else if (roles.includes('sp_student')) resolved = 'sp_student';
    setRole(resolved);
  };

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s); setUser(s?.user ?? null);
      if (s?.user) setTimeout(() => { void hydrate(s.user.id); }, 0);
      else { setProfile(null); setRole(null); }
    });
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s); setUser(s?.user ?? null);
      if (s?.user) await hydrate(s.user.id);
      setLoading(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signUp: SpAuthContextType['signUp'] = async ({ email, password, full_name, phone }) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/selfpaced/dashboard`,
        data: { is_selfpaced: true, full_name, phone },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null); setSession(null); setProfile(null); setRole(null);
    window.location.href = '/selfpaced';
  };

  const refresh = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) { setUser(u); await hydrate(u.id); }
  };

  return (
    <SpAuthContext.Provider value={{ user, session, profile, role, loading, signUp, signIn, signOut, refresh }}>
      {children}
    </SpAuthContext.Provider>
  );
};
