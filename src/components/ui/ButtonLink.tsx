import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * Renders a link, an in-page button, or an external anchor depending on the
 * props given, so callers never accidentally ship a dead `href="#"`.
 */
type Variant = 'primary' | 'ghost' | 'quiet';

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  quiet: 'btn-quiet',
};

interface BaseProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  icon?: ReactNode;
}

export function ButtonLink({
  to,
  href,
  onClick,
  type = 'button',
  disabled,
  children,
  variant = 'primary',
  className = '',
  icon,
  ariaLabel,
}: BaseProps & {
  to?: string;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const classes = `${VARIANT_CLASS[variant]} ${className}`;
  const content = (
    <>
      {icon}
      <span>{children}</span>
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={classes} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  if (href && !disabled) {
    const isExternal = /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        className={classes}
        aria-label={ariaLabel}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {content}
        {isExternal && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {content}
    </button>
  );
}
