import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

/**
 * ProtectedRoute component that checks authentication and role-based access
 * 
 * @param children - The component to render if authorized
 * @param allowedRoles - Array of roles that can access this route (e.g., ['ADMIN', 'PLAYER'])
 * @param redirectTo - Where to redirect if unauthorized (default: /login)
 */
export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth state to load
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
      console.log('🔒 ProtectedRoute: User not authenticated, redirecting to login');
      window.location.href = redirectTo;
      return;
    }

    // Check role-based access if roles are specified
    if (allowedRoles && allowedRoles.length > 0) {
      const hasAccess = allowedRoles.includes(user.role);
      
      if (!hasAccess) {
        console.log(`🚫 ProtectedRoute: User role "${user.role}" not in allowed roles:`, allowedRoles);
        
        // Redirect based on user role
        if (user.role === 'ADMIN') {
          window.location.href = '/categories';
        } else {
          window.location.href = '/student-quiz';
        }
        return;
      }
    }

    console.log('✅ ProtectedRoute: Access granted for role:', user.role);
  }, [isAuthenticated, isLoading, user, allowedRoles, redirectTo]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated or no access
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check role access
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.includes(user.role);
    if (!hasAccess) {
      return null;
    }
  }

  return <>{children}</>;
}

/**
 * Convenience component for Admin-only routes
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * Convenience component for Student-only routes
 */
export function StudentRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['PLAYER']}>
      {children}
    </ProtectedRoute>
  );
}
