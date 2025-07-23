import { useRouter } from 'next/router';
import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type ProtectedRouteProps = {
  children: ReactNode;
  requiredRole?: string;
  redirectTo?: string;
};

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      // Store the attempted URL for redirecting after login
      const path = router.asPath;
      if (path !== '/login') {
        router.push(`${redirectTo}?returnUrl=${encodeURIComponent(path)}`);
      } else {
        router.push(redirectTo);
      }
    }
  }, [user, isLoading, router, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return null; // or a loading spinner
  }

  // Check user role if required
  if (requiredRole) {
    // Implement role checking logic here based on your user model
    // For now, we'll just check if the user has a role property
    if (user.role !== requiredRole) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="mt-2 text-gray-600">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// Higher Order Component for protecting pages
export function withAuth(
  WrappedComponent: React.ComponentType,
  options: { requiredRole?: string; redirectTo?: string } = {}
) {
  const { requiredRole, redirectTo } = options;
  
  return function WithAuthWrapper(props: any) {
    return (
      <ProtectedRoute requiredRole={requiredRole} redirectTo={redirectTo}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}
