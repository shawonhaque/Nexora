import type { ReactNode } from 'react';
import { Icon, type IconName } from '../news/ArticleCard';

/** Standard page header used by every top-level route. */
export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: IconName;
  actions?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-line bg-brand-glow">
      <div className="px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
            <h1 className="flex items-center gap-3 text-3xl font-bold sm:text-4xl">
              {icon && (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent2 text-white shadow-card">
                  <Icon name={icon} className="h-5 w-5" />
                </span>
              )}
              <span className="text-gradient">{title}</span>
            </h1>
            {description && <p className="mt-3.5 text-sm leading-relaxed text-muted sm:text-base">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}

/** Page body container with consistent padding and max width. */
export function PageBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-4 py-8 sm:px-6 sm:py-10 lg:px-8 ${className}`}>{children}</div>;
}

/** Section heading inside a page. */
export function SubHeading({
  id,
  title,
  hint,
  action,
}: {
  id?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-xl font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/** Compact metric card for the dashboard. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'accent',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: IconName;
  tone?: 'accent' | 'accent2';
}) {
  return (
    <div className="glass glass-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            tone === 'accent' ? 'bg-accent/12 text-accent' : 'bg-accent2/12 text-accent2'
          }`}
        >
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-heading">{value}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

/**
 * Shows when live data was last refreshed, and offers a manual refresh.
 * Used wherever the page shows data fetched from a remote source.
 */
export function FreshnessBar({
  fetchedAt,
  refreshing,
  onRefresh,
  note,
}: {
  fetchedAt: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-elevated/40 px-4 py-2.5 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${refreshing ? 'bg-amber-400' : 'bg-emerald-400'}`}
          aria-hidden="true"
        />
        {refreshing
          ? 'Refreshing…'
          : fetchedAt
            ? `Updated ${fetchedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
            : 'Not loaded yet'}
      </span>
      {note && <span className="hidden sm:inline">· {note}</span>}
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="ml-auto inline-flex items-center gap-1.5 font-medium text-accent transition hover:underline disabled:opacity-60"
      >
        <Icon name="refresh" className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );
}
