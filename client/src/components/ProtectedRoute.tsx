import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useRouter } from '../context/RouterContext.tsx';
import { loginPathFor } from '../utils/authHelpers.ts';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function AuthLoadingScreen({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh] p-8" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
        <span className="text-xs text-[#737373]">{label}</span>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const { path, query, navigate } = useRouter();

  const signedIn = Boolean(session?.user);
  const search = query.toString();

  useEffect(() => {
    if (!loading && !signedIn) {
      navigate(loginPathFor(search ? `${path}?${search}` : path), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, signedIn, path, search]);

  if (loading) return <AuthLoadingScreen />;
  if (!signedIn) return <AuthLoadingScreen label="Redirecting to sign in…" />;

  return <>{children}</>;
}
