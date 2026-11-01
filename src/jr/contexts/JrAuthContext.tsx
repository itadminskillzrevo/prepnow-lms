import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type JrRole = 'jr_student' | 'jr_admin' | 'admin' | 'superadmin' | 'instructor' | 'student' | null;

export interface JrProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  grade: string | null;
  school_name: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  city: string | null;
  state: string | null;
}

interface JrAuthContextType {
  user: User | null;
  session: Session | null;
  profile: JrProfile | null;
  role: JrRole;
  loading: boolean;
  signUpStudent: (data: {
    email: string;
    password: string;
    full_name: string;
    grade?: string;
    school_name?: string;
  }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const JrAuthContext = createContext<JrAuthContextType | undefined>(undefined);

export const useJrAuth = () => {
  const ctx = useContext(JrAuthContext);
  if (!ctx) throw new Error('useJrAuth must be used within JrAuthProvider');
  return ctx;
};

export const JrAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<JrProfile | null>(null);
  const [role, setRole] = useState<JrRole>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = async (uid: string) => {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from('jr_profiles').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', uid),
    ]);
    setProfile((prof as JrProfile) ?? null);
    const roles = (roleRows ?? []).map((r: any) => r.role as string);
    // Priority: superadmin/admin (treated as jr_admin) > jr_admin > jr_student
    let resolved: JrRole = null;
    if (roles.includes('superadmin') || roles.includes('admin') || roles.includes('jr_admin')) {
      resolved = 'jr_admin';
    } else if (roles.includes('jr_student')) {
      resolved = 'jr_student';
    } else {
      resolved = (roles[0] as JrRole) ?? null;
    }
    setRole(resolved);
  };

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => { void hydrate(s.user.id); }, 0);
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await hydrate(s.user.id);
      setLoading(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signUpStudent: JrAuthContextType['signUpStudent'] = async ({ email, password, full_name, grade, school_name }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/jr/dashboard`,
        data: { is_jr: true, full_name, grade, school_name },
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
    window.location.href = '/jr';
  };

  const refresh = async () => { if (user) await hydrate(user.id); };

  return (
    <JrAuthContext.Provider value={{ user, session, profile, role, loading, signUpStudent, signIn, signOut, refresh }}>
      {children}
    </JrAuthContext.Provider>
  );
};
