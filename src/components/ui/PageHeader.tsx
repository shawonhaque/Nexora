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
    <header className="relative border-b border-line">
      <div className="px-4 pb-8 pt-7 sm:px-6 sm:pb-10 sm:pt-9 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            {eyebrow && (
              <p className="mb-3 flex items-center gap-2.5 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-muted">
                {icon && <Icon name={icon} className="h-3.5 w-3.5 text-accent" />}
                {eyebrow}
              </p>
            )}
            <h1 className="display text-4xl sm:text-5xl lg:text-[3.4rem]">{title}</h1>
            {description && (
              <p className="mt-4 max-w-xl text-[0.94rem] leading-relaxed text-muted">{description}</p>
            )}
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
    <div className="rule-mark mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-[1.55rem] leading-tight">{title}</h2>
        {hint && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * A single figure in the metric strip. These are deliberately quiet: a
 * number, a label, no panel. The data supports the page, it is not the page.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: IconName;
  /** Retained for call-site compatibility; the strip is single-tone. */
  tone?: 'accent' | 'accent2';
}) {
  return (
    <div className="flex items-baseline gap-3 border-l border-line pl-3">
      <Icon name={icon} className="h-3.5 w-3.5 shrink-0 self-center text-accent" />
      <div className="min-w-0">
        <p className="tabular font-serif text-2xl leading-none text-heading">{value}</p>
        <p className="mt-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted">{label}</p>
        {hint && <p className="mt-1 truncate text-[0.72rem] leading-snug text-muted/80" title={hint}>{hint}</p>}
      </div>
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
    <div className="flex flex-wrap items-center gap-3 border-y border-line py-2 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 ${refreshing ? 'bg-accent2' : 'bg-accent'}`}
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
