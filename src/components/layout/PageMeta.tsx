import { useEffect } from 'react';

const SITE_NAME = 'NEXORA';

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element!.setAttribute(key, value));
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

export interface PageMetaProps {
  title: string;
  description?: string;
  /** Absolute or root-relative image URL for social cards. */
  image?: string;
  /** Set true on private pages so they are never indexed. */
  noIndex?: boolean;
  /** Article structured data, when the page represents a single item. */
  jsonLd?: Record<string, unknown> | null;
}

/**
 * Applies per-page document metadata.
 *
 * The site is a single-page app, so the title, description, canonical URL and
 * social tags are set here on each route change.
 */
export function PageMeta({ title, description, image, noIndex = false, jsonLd = null }: PageMetaProps) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? `${SITE_NAME} — Your World of Knowledge` : `${title} · ${SITE_NAME}`;
    document.title = fullTitle;

    const origin = window.location.origin;
    const base = import.meta.env.BASE_URL ?? '/';
    const canonical = `${origin}${base.replace(/\/$/, '')}${window.location.pathname.replace(base.replace(/\/$/, ''), '')}`;

    if (description) {
      upsertMeta('meta[name="description"]', { name: 'description', content: description });
      upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
      upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    }

    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: jsonLd ? 'article' : 'website' });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: image ? 'summary_large_image' : 'summary',
    });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });

    if (image) {
      const absoluteImage = image.startsWith('http') ? image : `${origin}${image}`;
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: absoluteImage });
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: absoluteImage });
    }

    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noIndex ? 'noindex, nofollow' : 'index, follow',
    });

    upsertCanonical(canonical);

    // Replace any previously injected structured data block.
    document.head.querySelectorAll('script[data-nexora-jsonld="true"]').forEach((node) => node.remove());
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.nexoraJsonld = 'true';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, image, noIndex, jsonLd]);

  return null;
}
