import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageMeta } from '../components/layout/PageMeta';
import { StateBlock } from '../components/ui/StateBlock';
import { Icon } from '../components/news/ArticleCard';
import { useAuth } from '../context/AuthContext';

/**
 * Admin login.
 *
 * There is no public sign-up: admin accounts are created through the
 * server-side bootstrap procedure documented in supabase/README.md, and the
 * role is verified against the database on every protected request.
 */
export default function Login() {
  const { signIn, requestPasswordReset, updatePassword, backendConfigured, recovery, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSetPassword(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 8) {
      setError('Choose a password of at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate('/admin', { replace: true });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result.error) {
      // Supabase returns a generic message; keep it generic on purpose so the
      // form cannot be used to enumerate valid accounts.
      setError('Those credentials were not accepted. Check your email and password and try again.');
      return;
    }
    navigate('/admin', { replace: true });
  }

  async function onReset() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError('Enter your email address first, then request a reset link.');
      return;
    }
    const result = await requestPasswordReset(email.trim());
    if (result.error) setError(result.error);
    else setNotice('If that address has an account, a password reset link has been sent.');
  }

  return (
    <>
      <PageMeta title="Login" description="Sign in to the NEXORA admin dashboard." noIndex />
      <div className="wrap flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent2 text-white">
              <Icon name="sparkle" className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-2xl">Sign in to NEXORA</h1>
            <p className="mt-2 text-sm text-muted">Admin access only. Accounts are created by the site owner.</p>
          </div>

          {!backendConfigured && (
            <StateBlock
              tone="warning"
              title="Supabase is not connected"
              message="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment, then create the first admin account using the bootstrap steps in supabase/README.md. Sign-in cannot work until then."
              action={
                <Link to="/" className="btn-ghost">
                  Back to site
                </Link>
              }
            />
          )}

          {backendConfigured && recovery && (
            <form onSubmit={onSetPassword} className="card space-y-5 p-6" noValidate>
              <div>
                <h2 className="text-lg font-semibold text-heading">Choose a new password</h2>
                <p className="mt-1.5 text-sm text-muted">
                  You opened a password reset link. Set a new password to finish signing in.
                </p>
              </div>

              <div>
                <label htmlFor="new-password" className="label">New password</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="label">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="field"
                  placeholder="Repeat the password"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? 'Saving…' : 'Set password and continue'}
              </button>
            </form>
          )}

          {backendConfigured && !recovery && user && (
            <StateBlock
              title="You are already signed in"
              message="Continue to the dashboard, or sign out from the header."
              action={
                <Link to="/admin" className="btn-primary">
                  Open dashboard
                </Link>
              }
            />
          )}

          {backendConfigured && !recovery && !user && (
            <form onSubmit={onSubmit} className="card space-y-5 p-6" noValidate>
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="label">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
              {notice && (
                <p role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                  {notice}
                </p>
              )}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>

              <button
                type="button"
                onClick={() => void onReset()}
                className="w-full text-center text-xs text-muted transition hover:text-accent"
              >
                Forgot your password?
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted">
            <Link to="/" className="transition hover:text-accent">← Back to NEXORA</Link>
          </p>
        </div>
      </div>
    </>
  );
}
