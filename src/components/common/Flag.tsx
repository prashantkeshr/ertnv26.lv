import { useEffect, useState } from 'react';
import { cn } from './primitives';

let lookup: Promise<typeof import('./flagUrls')> | null = null;

/**
 * A country flag (decorative — the country name is always written next to it).
 * The lookup table loads lazily; until it arrives a neutral placeholder holds the space.
 */
export function Flag({ code, className }: { code: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    lookup ??= import('./flagUrls');
    lookup.then((m) => active && setSrc(m.flagUrl(code)));
    return () => {
      active = false;
    };
  }, [code]);
  const box = 'inline-block h-[15px] w-5 shrink-0 rounded-[3px] align-[-2px] ring-1 ring-black/10';
  return src ? <img src={src} alt="" width={20} height={15} loading="lazy" decoding="async" className={cn(box, 'object-cover', className)} /> : <span aria-hidden="true" className={cn(box, 'bg-line', className)} />;
}

/** A neutral typographic badge, used only as the fallback when an organization's logo is unavailable (see OrgLogo). */
export function Monogram({ text, className }: { text: string; className?: string }) {
  const label = text.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
  return (
    <span aria-hidden="true" className={cn('grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ocean to-navy text-[0.7rem] font-bold tracking-wide text-white ring-1 ring-white/10', className)}>
      {label}
    </span>
  );
}
