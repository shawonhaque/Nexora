import type { ReactNode } from 'react';

/** Page section with a consistent vertical rhythm and optional heading block. */
export function Section({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
  className = '',
  as: Tag = 'section',
  titleAs: TitleTag = 'h2',
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
  /** Use "h1" on a page's primary section so every page has exactly one h1. */
  titleAs?: 'h1' | 'h2';
}) {
  const labelledBy = title && id ? `${id}-title` : undefined;
  return (
    <Tag id={id} aria-labelledby={labelledBy} className={`py-14 sm:py-16 ${className}`}>
      <div className="wrap">
        {(eyebrow || title || action) && (
          <header className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
              {title && (
                <TitleTag id={labelledBy} className={TitleTag === 'h1' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}>
                  {title}
                </TitleTag>
              )}
              {description && <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{description}</p>}
            </div>
            {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
          </header>
        )}
        {children}
      </div>
    </Tag>
  );
}
