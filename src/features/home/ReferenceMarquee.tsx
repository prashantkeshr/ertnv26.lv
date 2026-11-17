import type { ReactNode } from 'react';
import { Flag } from '@/components/common/Flag';
import { OrgLogo } from '@/components/common/OrgLogo';
import { cn } from '@/components/common/primitives';
import { useDataset } from '@/hooks/useAsync';

interface Chip {
  key: string;
  badge: ReactNode;
  abbr: string;
  name: string;
  /** The badge is a full logo that already identifies the organization, so no text label is drawn beside it. */
  logoOnly?: boolean;
}

function Row({ label, chips, reverse }: { label: string; chips: Chip[]; reverse?: boolean }) {
  return (
    <div className={cn('marquee overflow-hidden', reverse && 'marquee-reverse')} role="group" aria-label={label}>
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1 || undefined} className={cn('flex shrink-0 items-center gap-10 pe-10', copy === 1 && 'marquee-dup')}>
            {chips.map((c) => (
              <li key={c.key} className="flex items-center gap-3 whitespace-nowrap">
                {c.badge}
                {c.logoOnly ? (
                  <span className="sr-only">{c.name}</span>
                ) : (
                  <span>
                    <span className="block font-display text-base leading-tight font-bold text-heading">{c.abbr}</span>
                    <span className="block max-w-[15rem] truncate text-xs text-muted">{c.name}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/**
 * Official bodies eport references. International organizations appear with their own logo
 * (downloaded from their official websites; a neutral monogram where none was available) and
 * national authorities with their country's flag — government emblems are legally protected in
 * many countries and are never reproduced. Nothing here implies a partnership or endorsement.
 */
export function ReferenceMarquee() {
  const orgs = useDataset('organizations');
  const authorities = useDataset('authorities-in');
  const intl: Chip[] = (orgs.data ?? []).map((o) => ({ key: o.id, badge: <OrgLogo org={o} />, abbr: o.abbreviation, name: o.name, logoOnly: Boolean(o.logo) }));
  const national: Chip[] = (authorities.data ?? []).map((a) => ({
    key: a.id,
    badge: (
      <span className="grid size-9 place-items-center rounded-xl bg-soft ring-1 ring-line">
        <Flag code={a.jurisdiction} />
      </span>
    ),
    abbr: a.abbreviation ?? a.name,
    name: a.name,
  }));

  return (
    <section aria-labelledby="refs-heading" className="border-b border-line bg-page py-9">
      <div className="container-page mb-7 text-center">
        <h2 id="refs-heading" className="font-sans text-xs font-semibold tracking-[0.14em] text-muted uppercase">
          Official bodies whose information eport references
        </h2>
        <p className="mx-auto mt-1.5 max-w-3xl text-xs leading-relaxed text-muted">
          References only — not partners or endorsements. Logos are trademarks of their respective owners, taken from each organization’s own website and shown only to identify the source. National authorities
          appear with their country’s flag.
        </p>
      </div>
      <div className="space-y-6">
        {intl.length > 0 && <Row label="International organizations" chips={intl} />}
        {national.length > 0 && <Row label="National authorities of India" chips={national} reverse />}
      </div>
    </section>
  );
}
