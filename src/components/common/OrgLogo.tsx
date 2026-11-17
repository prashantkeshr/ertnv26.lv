import { Monogram } from './Flag';
import { cn } from './primitives';
import type { Organization } from '@/types/schemas';

/**
 * An organization's own logo on a white tile (the artwork is designed for a light background, so the
 * tile stays white in dark mode too). Falls back to a neutral monogram when no logo is on file.
 * The logo is a trademark of its owner and is shown only to identify the source.
 */
export function OrgLogo({ org, size = 'md', className }: { org: Pick<Organization, 'name' | 'abbreviation' | 'logo'>; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const box = { sm: 'h-10 px-2.5', md: 'h-14 px-4', lg: 'h-20 px-6' }[size];
  const img = { sm: 'max-h-6 max-w-[6.5rem]', md: 'max-h-9 max-w-[9.5rem]', lg: 'max-h-14 max-w-[14rem]' }[size];
  if (!org.logo) return <Monogram text={org.abbreviation} className={cn(size === 'lg' ? 'size-16' : size === 'sm' ? 'size-10' : 'size-12', className)} />;
  return (
    <span className={cn('inline-grid shrink-0 place-items-center rounded-xl bg-white ring-1 ring-black/10', box, className)}>
      <img src={`${import.meta.env.BASE_URL}${org.logo.path}`} alt={`${org.name} logo`} loading="lazy" decoding="async" className={cn('w-auto object-contain', img)} />
    </span>
  );
}
