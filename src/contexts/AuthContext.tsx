import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Profile } from '@/types/lms';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role as AppRole);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const applySession = async (
      nextSession: Session | null,
      options: { shouldBlockUI: boolean; shouldHydrateUserData: boolean; shouldResetUserData: boolean }
    ) => {
      if (!mounted) return;

      if (options.shouldBlockUI) {
        setLoading(true);
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        const nextUserId = nextSession.user.id;
        const userChanged = currentUserIdRef.current !== nextUserId;
        currentUserIdRef.current = nextUserId;

        if (options.shouldHydrateUserData || userChanged) {
          if (options.shouldResetUserData) {
            setProfile(null);
            setRole(null);
          }
          await fetchUserData(nextUserId);
        }
      } else {
        currentUserIdRef.current = null;
        setProfile(null);
        setRole(null);
      }

      if (mounted && (options.shouldBlockUI || !initializedRef.current)) {
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const isInitialized = initializedRef.current;
      const currentUserId = currentUserIdRef.current;
      const nextUserId = nextSession?.user?.id ?? null;

      if (isInitialized) {
        const isSignOut = event === 'SIGNED_OUT';
        const isGenuineSignIn = event === 'SIGNED_IN' && !!nextUserId && nextUserId !== currentUserId;
        const isRelevantUserUpdate = event === 'USER_UPDATED' && !!nextUserId && nextUserId === currentUserId;

        if (!isSignOut && !isGenuineSignIn && !isRelevantUserUpdate) {
          // Ignore TOKEN_REFRESHED / INITIAL_SESSION / duplicate SIGNED_IN events on tab focus
          return;
        }
      }

      const isGenuineSignIn = event === 'SIGNED_IN' && !!nextUserId && nextUserId !== currentUserId;
      const shouldHydrateUserData = !isInitialized || isGenuineSignIn;
      const shouldResetUserData = !isInitialized || isGenuineSignIn;
      const shouldBlockUI = !isInitialized || isGenuineSignIn;

      void applySession(nextSession, { shouldBlockUI, shouldHydrateUserData, shouldResetUserData }).finally(() => {
        initializedRef.current = true;
      });
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (initializedRef.current) return;

      void applySession(existingSession, {
        shouldBlockUI: true,
        shouldHydrateUserData: true,
        shouldResetUserData: true,
      }).finally(() => {
        initializedRef.current = true;
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Use 'local' scope to ensure local tokens are always cleared,
    // even if the server session is already expired/invalid
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    currentUserIdRef.current = null;
    // Redirect to landing page after logout
    window.location.href = '/';
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
