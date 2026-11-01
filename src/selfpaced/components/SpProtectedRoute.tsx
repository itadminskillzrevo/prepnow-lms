import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSpAuth, SpRole } from '@/selfpaced/contexts/SpAuthContext';
import { Loader2 } from 'lucide-react';

export const SpProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: Exclude<SpRole, null>[];
}> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useSpAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="sp-scope min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'hsl(var(--sp-primary))' }} />
      </div>
    );
  }

  const adminOnly = allowedRoles?.length === 1 && allowedRoles[0] === 'sp_admin';
  const loginPath = adminOnly ? '/selfpaced/admin/login' : '/selfpaced/auth';
  if (!user) return <Navigate to={loginPath} state={{ from: loc }} replace />;
  if (role !== 'sp_student' && role !== 'sp_admin') return <Navigate to={`${loginPath}?error=not_sp`} replace />;
  if (allowedRoles && !allowedRoles.includes(role as any)) {
    if (adminOnly) return <Navigate to="/selfpaced/admin/login?error=not_admin" replace />;
    return <Navigate to="/selfpaced/dashboard" replace />;
  }
  return <>{children}</>;
};
