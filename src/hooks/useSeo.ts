import { useEffect } from 'react';
import { SITE } from '@/app/route-meta';

interface SeoInput {
  title: string;
  description: string;
  /** Site path, e.g. "/countries/IN". Becomes the canonical URL. */
  path: string;
  /** Breadcrumb trail for BreadcrumbList structured data. */
  breadcrumbs?: Array<{ label: string; path: string }>;
  noindex?: boolean;
}

function setMeta(selector: string, attr: 'content' | 'href', value: string, create: () => HTMLElement) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function meta(name: string, key: 'name' | 'property' = 'name') {
  return () => {
    const el = document.createElement('meta');
    el.setAttribute(key, name);
    return el;
  };
}

export function pageTitle(title: string): string {
  return title.includes(SITE.name) ? title : `${title} | ${SITE.name}`;
}

/**
 * Keeps the document head in step with client-side navigation. The same titles and
 * descriptions are written into each route's static HTML at build time
 * (scripts/generate-static.ts), so crawlers and first paint agree with what this sets.
 */
export function useSeo({ title, description, path, breadcrumbs, noindex }: SeoInput): void {
  const crumbs = JSON.stringify(breadcrumbs ?? []);
  useEffect(() => {
    const full = pageTitle(title);
    const url = SITE.origin + (path === '/' ? '/' : path.replace(/\/$/, '') + '/');
    document.title = full;
    setMeta('meta[name="description"]', 'content', description, meta('description'));
    setMeta('meta[property="og:title"]', 'content', full, meta('og:title', 'property'));
    setMeta('meta[property="og:description"]', 'content', description, meta('og:description', 'property'));
    setMeta('meta[property="og:url"]', 'content', url, meta('og:url', 'property'));
    setMeta('meta[name="robots"]', 'content', noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large', meta('robots'));
    setMeta('link[rel="canonical"]', 'href', url, () => {
      const el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      return el;
    });

    const trail = JSON.parse(crumbs) as Array<{ label: string; path: string }>;
    document.getElementById('eport-breadcrumbs')?.remove();
    if (trail.length) {
      const script = document.createElement('script');
      script.id = 'eport-breadcrumbs';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: SITE.origin + c.path })),
      });
      document.head.appendChild(script);
    }
  }, [title, description, path, crumbs, noindex]);
}
