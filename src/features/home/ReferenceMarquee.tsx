import type { ReactNode } from 'react';
import { Flag, Monogram } from '@/components/common/Flag';
import { cn } from '@/components/common/primitives';
import { useDataset } from '@/hooks/useAsync';

interface Chip {
  key: string;
  badge: ReactNode;
  abbr: string;
  name: string;
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
                <span>
                  <span className="block font-display text-base leading-tight font-bold text-heading">{c.abbr}</span>
                  <span className="block max-w-[15rem] truncate text-xs text-muted">{c.name}</span>
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/**
 * Official bodies eport references. Nations are shown with their flag; international
 * organizations with a neutral monogram badge — not their official logos, which eport does
 * not reproduce because that could suggest a partnership or endorsement.
 */
export function ReferenceMarquee() {
  const orgs = useDataset('organizations');
  const authorities = useDataset('authorities-in');
  const intl: Chip[] = (orgs.data ?? []).map((o) => ({ key: o.id, badge: <Monogram text={o.abbreviation} />, abbr: o.abbreviation, name: o.name }));
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
        <p className="mt-1.5 text-xs text-muted">References only — not partners or endorsements. Badges are neutral monograms, not the organizations’ official logos.</p>
      </div>
      <div className="space-y-6">
        {intl.length > 0 && <Row label="International organizations" chips={intl} />}
        {national.length > 0 && <Row label="National authorities of India" chips={national} reverse />}
      </div>
    </section>
  );
}
