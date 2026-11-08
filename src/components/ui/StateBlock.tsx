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
    <div className={`card flex flex-col items-center gap-3 px-6 py-12 text-center ${toneRing}`}>
      {icon && <div className="text-2xl text-accent" aria-hidden="true">{icon}</div>}
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
        <div key={index} className="card overflow-hidden">
          <div className="aspect-[16/10] animate-pulse bg-elevated" />
          <div className="space-y-3 p-5">
            <div className="h-3 w-20 animate-pulse rounded bg-elevated" />
            <div className="h-4 w-full animate-pulse rounded bg-elevated" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Notice shown when a page is rendering placeholder content because no
 * Supabase project is connected yet.
 */
export function DemoNotice({ className = '' }: { className?: string }) {
  return (
    <p
      className={`rounded-xl border border-amber-500/35 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-600 dark:text-amber-300 ${className}`}
    >
      <strong className="font-semibold">Demo content.</strong> These are placeholder records for layout preview.
      Connect Supabase and publish real entries from the admin dashboard to replace them.
    </p>
  );
}
