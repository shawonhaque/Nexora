import type { ReactNode } from 'react';

/** Consistent block used for loading, error and empty states. */
export function StateBlock({
  icon,
  title,
  message,
  action,
  tone = 'neutral',
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  tone?: 'neutral' | 'error' | 'warning';
}) {
  const toneRing =
    tone === 'error'
      ? 'border-red-500/40 bg-red-500/5'
      : tone === 'warning'
        ? 'border-amber-500/40 bg-amber-500/5'
        : 'border-line bg-surface';
  return (
    <div className={`glass flex flex-col items-center gap-3 px-6 py-12 text-center ${toneRing}`}>
      {icon && (
        <div className="text-2xl text-accent" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {message && <p className="max-w-md text-sm leading-relaxed text-muted">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Skeleton grid shown while a list is loading. */
export function SkeletonGrid({ count = 6, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="glass overflow-hidden">
          <div className="skeleton aspect-[16/10] rounded-none" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Shown when the knowledge base cannot be read because no Supabase project is
 * configured. It explains the state rather than showing placeholder records.
 */
export function BackendNotice({ className = '' }: { className?: string }) {
  return (
    <div
      className={`glass border-amber-500/35 bg-amber-500/5 px-5 py-4 text-sm leading-relaxed text-amber-700 dark:text-amber-300 ${className}`}
    >
      <p className="font-semibold">The knowledge base is not connected.</p>
      <p className="mt-1 text-xs">
        This section is published from a Supabase database. No project is configured for this deployment, so
        there are no entries to show. The live feeds, search and library elsewhere on the site do not depend on
        it and work normally.
      </p>
    </div>
  );
}
