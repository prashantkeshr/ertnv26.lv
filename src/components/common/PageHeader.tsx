import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Kicker } from './primitives';

export interface Crumb {
  label: string;
  path?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-white/70">
        <li>
          <Link to="/" className="hover:text-white hover:underline">
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <ChevronRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
            {item.path && i < items.length - 1 ? (
              <Link to={item.path} className="hover:text-white hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-white">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface PageHeaderProps {
  crumbs: Crumb[];
  kicker?: string;
  title: string;
  description?: ReactNode;
  /** Badges, identifiers or actions shown under the description. */
  children?: ReactNode;
}

export function PageHeader({ crumbs, kicker, title, description, children }: PageHeaderProps) {
  return (
    <header className="bg-navy text-white">
      <div className="container-page py-9 sm:py-12">
        <Breadcrumbs items={crumbs} />
        {kicker && <Kicker inverse>{kicker}</Kicker>}
        <h1 className="max-w-3xl text-3xl font-bold text-white sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{description}</p>}
        {children && <div className="mt-5 flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </header>
  );
}

/** Breadcrumb trail in the shape useSeo expects for structured data. */
export function seoCrumbs(crumbs: Crumb[], currentPath: string) {
  return [{ label: 'Home', path: '/' }, ...crumbs.map((c) => ({ label: c.label, path: c.path ?? currentPath }))];
}
