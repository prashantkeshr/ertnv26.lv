import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { spotlightHandlers } from '@/components/common/motion';
import { hostOf } from '@/components/common/primitives';
import { Badge, VerificationBadge } from '@/components/common/StatusBadge';
import type { Authority } from '@/types/schemas';
import { AUTHORITY_CATEGORY_LABEL } from '@/utils/labels';

/** An official authority: name, what kind of body it is, verification status, and its official website. */
export function AuthorityCard({ authority: a }: { authority: Authority }) {
  return (
    <article {...spotlightHandlers()} className="spot flex h-full flex-col rounded-2xl border border-line bg-surface p-5">
      <h3 className="font-display text-base leading-snug font-bold">
        <Link to={`/directory/authorities/${a.id}`} className="text-heading hover:text-link">
          {a.abbreviation ? `${a.abbreviation} — ` : ''}
          {a.name}
        </Link>
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone="info">{AUTHORITY_CATEGORY_LABEL[a.category]}</Badge>
        <VerificationBadge status={a.verification.status} />
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{a.functions.slice(0, 2).join(' · ')}</p>
      <a href={a.website} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 self-start text-sm font-semibold text-link hover:text-link-hover">
        Official website · {hostOf(a.website)}
        <ArrowUpRight aria-hidden="true" className="size-4" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </article>
  );
}
