/** Status pill shared by the admin editors. */
export function StatusChip({ status }: { status: string }) {
  const tone =
    status === 'published'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : status === 'archived'
        ? 'border-line bg-elevated text-muted'
        : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium uppercase tracking-wide ${tone}`}
    >
      {status}
    </span>
  );
}
