import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useJrAuth, JrRole } from '@/jr/contexts/JrAuthContext';
import { Loader2 } from 'lucide-react';

export const JrProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: Exclude<JrRole, null>[];
}> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useJrAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="jr-scope min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--jr-primary))]" />
      </div>
    );
  }

  const adminOnly = allowedRoles?.length === 1 && allowedRoles[0] === 'jr_admin';
  const loginPath = adminOnly ? '/jr/admin/login' : '/jr/auth';

  if (!user) return <Navigate to={loginPath} state={{ from: loc }} replace />;

  // Only allow jr roles inside /jr — non-jr users must use the main site
  if (role !== 'jr_student' && role !== 'jr_admin') {
    return <Navigate to={`${loginPath}?error=not_jr`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (adminOnly) return <Navigate to="/jr/admin/login?error=not_admin" replace />;
    return <Navigate to="/jr/dashboard" replace />;
  }

  return <>{children}</>;
};
