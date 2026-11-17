import { useEffect, useState } from 'react';
import { cn } from '@/components/common/primitives';

export interface NavSection {
  id: string;
  label: string;
}

/**
 * Sticky "on this page" tabs with scroll-spy. Anchors are real links, so they work without
 * JavaScript; the active tab follows the section in view and is announced with aria-current.
 */
export function SectionNav({ sections }: { sections: NavSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => Boolean(e));
    if (!('IntersectionObserver' in window) || els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav aria-label="On this page" className="sticky top-16 z-20 border-b border-line bg-surface/90 backdrop-blur-md">
      <ul className="container-page flex gap-1 overflow-x-auto py-1 [scrollbar-width:none]">
        {sections.map((s) => {
          const current = s.id === active;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={current ? 'true' : undefined}
                onClick={() => setActive(s.id)}
                className={cn(
                  'relative block min-h-11 px-3.5 py-3 text-sm font-semibold whitespace-nowrap transition-colors',
                  current ? 'text-link' : 'text-muted hover:text-heading',
                )}
              >
                {s.label}
                <span aria-hidden="true" className={cn('absolute inset-x-3 bottom-0 h-0.5 origin-left rounded-full bg-link transition-transform duration-300', current ? 'scale-x-100' : 'scale-x-0')} />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
