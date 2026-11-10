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

  /**
   * Every non-rendering state gets a real heading, so a screen reader landing
   * on the dashboard always has an h1 to orient from even when there is no
   * content to show.
   */
  function Gate({
    title,
    heading,
    message,
    tone,
    action,
  }: {
    title: string;
    heading: string;
    message: string;
    tone: 'warning' | 'error';
    action: ReactNode;
  }) {
    return (
      <div className="wrap py-20">
        <PageMeta title={title} noIndex />
        <h1 className="mb-6 text-2xl sm:text-3xl">Dashboard</h1>
        <StateBlock tone={tone} title={heading} message={message} action={action} />
      </div>
    );
  }

  if (!backendConfigured) {
    return (
      <Gate
        title="Dashboard"
        heading="Backend not connected"
        message="The dashboard needs a Supabase project. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then follow supabase/README.md to create the first admin account."
        tone="warning"
        action={
          <ButtonLink to="/" variant="ghost">
            Back to site
          </ButtonLink>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="wrap py-24" aria-busy="true" aria-live="polite">
        <h1 className="sr-only">Dashboard</h1>
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
      <Gate
        title="Access denied"
        heading="You do not have access to the dashboard"
        message="Your account is signed in but does not have the admin role. If you believe this is wrong, the role must be granted in the database by the site owner."
        tone="error"
        action={
          <ButtonLink to="/" variant="ghost">
            Back to site
          </ButtonLink>
        }
      />
    );
  }

  return <>{children}</>;
}
