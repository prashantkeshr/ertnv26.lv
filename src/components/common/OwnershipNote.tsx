import { COMPANY } from '@/app/company';
import { ExternalLink } from './primitives';

/** "eport is a subsidiary of Dhurta.org and is managed by Dhurta Group." — with a link to the parent. */
export function OwnershipNote({ className }: { className?: string }) {
  return (
    <p className={className}>
      eport is a subsidiary of <ExternalLink href={COMPANY.parent.url}>{COMPANY.parent.name}</ExternalLink> and is managed by {COMPANY.manager}.
    </p>
  );
}
