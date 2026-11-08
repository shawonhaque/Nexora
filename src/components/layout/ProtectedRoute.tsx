import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StateBlock } from '../ui/StateBlock';
import { ButtonLink } from '../ui/ButtonLink';
import { PageMeta } from './PageMeta';

/**
 * Client-side guard for admin routes.
 *
 * This is a convenience layer only. Real enforcement happens in Postgres via
 * Row Level Security: every table and storage bucket rejects writes from a
 * non-admin session, so bypassing this component gains nothing.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, user, isAdmin, backendConfigured } = useAuth();
  const location = useLocation();

  if (!backendConfigured) {
    return (
      <div className="wrap py-20">
        <PageMeta title="Dashboard" noIndex />
        <StateBlock
          tone="warning"
          title="Backend not connected"
          message="The dashboard needs a Supabase project. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then follow supabase/README.md to create the first admin account."
          action={<ButtonLink to="/" variant="ghost">Back to site</ButtonLink>}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wrap py-24" aria-busy="true" aria-live="polite">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-elevated" />
          <p className="text-sm text-muted">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <div className="wrap py-20">
        <PageMeta title="Access denied" noIndex />
        <StateBlock
          tone="error"
          title="You do not have access to the dashboard"
          message="Your account is signed in but does not have the admin role. If you believe this is wrong, the role must be granted in the database by the site owner."
          action={<ButtonLink to="/" variant="ghost">Back to site</ButtonLink>}
        />
      </div>
    );
  }

  return <>{children}</>;
}
