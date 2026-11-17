import { ArrowUpRight, Building2, Landmark } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { PageHeader, seoCrumbs } from '@/components/common/PageHeader';
import { Provenance } from '@/components/common/Provenance';
import { buttonClass, ButtonLink, FactList, hostOf } from '@/components/common/primitives';
import { RelatedPanel } from '@/components/common/RelatedPanel';
import { Badge } from '@/components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import type { Authority, Organization } from '@/types/schemas';
import { makeRef } from '@/utils/entities';
import { AUTHORITY_CATEGORY_LABEL, ORG_IS_OFFICIAL, ORG_TYPE_LABEL } from '@/utils/labels';

type Kind = 'organization' | 'authority';

const LIST = {
  organization: { path: '/directory/organizations', label: 'International organizations' },
  authority: { path: '/directory/authorities', label: 'Official authorities' },
} as const;

export default function EntityPage({ kind }: { kind: Kind }) {
  const id = useParams().id ?? '';
  const organizations = useDataset('organizations');
  const authorities = useDataset('authorities-in');
  const countries = useDataset('countries');
  const state = kind === 'organization' ? organizations : authorities;

  const org: Organization | undefined = kind === 'organization' ? organizations.data?.find((o) => o.id === id) : undefined;
  const authority: Authority | undefined = kind === 'authority' ? authorities.data?.find((a) => a.id === id) : undefined;
  const record = org ?? authority;
  const list = LIST[kind];
  const path = `${list.path}/${id}`;
  const crumbs = [{ label: 'Directory', path: '/directory' }, { label: list.label, path: list.path }, { label: record?.name ?? id }];

  useSeo({
    title: record ? `${record.name}${record.abbreviation ? ` (${record.abbreviation})` : ''} — role in international trade` : 'Directory record',
    description: record?.summary ?? 'Directory record on eport.',
    path,
    breadcrumbs: seoCrumbs(crumbs, path),
    noindex: !record,
  });

  if (state.status === 'error') {
    return (
      <div className="container-page py-16">
        <ErrorState error={state.error} onRetry={state.reload} />
      </div>
    );
  }
  if (state.status === 'loading') {
    return (
      <div className="container-page py-16">
        <LoadingBlock lines={8} className="max-w-2xl" />
      </div>
    );
  }
  if (!record) {
    return (
      <div className="container-page py-16">
        <EmptyState title="This directory record does not exist" description="It may have been renamed, or it has not been published yet." action={<ButtonLink to={list.path}>Browse {list.label.toLowerCase()}</ButtonLink>} />
      </div>
    );
  }

  const countryName = (code: string) => countries.data?.find((c) => c.cca2 === code)?.name ?? code;
  const official = org ? ORG_IS_OFFICIAL[org.orgType] : true;
  const typeLabel = org ? ORG_TYPE_LABEL[org.orgType] : AUTHORITY_CATEGORY_LABEL[authority!.category];
  const points = org ? org.tradeRelevance : authority!.functions;

  const facts = org
    ? [
        { label: 'Type', value: typeLabel },
        { label: 'Headquarters', value: <Link to={`/countries/${org.headquarters.countryCode}`} className="link">{`${org.headquarters.city}, ${countryName(org.headquarters.countryCode)}`}</Link> },
        { label: 'Official website', value: hostOf(org.website) },
      ]
    : [
        { label: 'Category', value: typeLabel },
        { label: 'Jurisdiction', value: <Link to={`/countries/${authority!.jurisdiction}`} className="link">{countryName(authority!.jurisdiction)}</Link> },
        { label: 'Level', value: authority!.level === 'national' ? 'National (central)' : 'Sub-national' },
        { label: 'Parent body', value: authority!.parentBody ?? 'Independent' },
        { label: 'Official website', value: hostOf(authority!.website) },
      ];

  return (
    <>
      <PageHeader crumbs={crumbs} kicker={record.abbreviation ?? undefined} title={record.name}>
        <Badge tone={official ? 'info' : 'neutral'} icon={official ? Landmark : Building2}>
          {typeLabel}
        </Badge>
        {!official && <Badge tone="neutral">Not a government or intergovernmental body</Badge>}
      </PageHeader>

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="summary-heading">
            <p className="mb-1 text-xs font-semibold tracking-[0.14em] text-muted uppercase">eport editorial summary</p>
            <h2 id="summary-heading" className="sr-only">
              Summary
            </h2>
            <p className="text-lg leading-relaxed text-ink">{record.summary}</p>
            <a href={record.website} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'md', 'mt-6')}>
              Visit the official website
              <ArrowUpRight aria-hidden="true" className="size-4" />
              <span className="sr-only">({hostOf(record.website)}, opens in a new tab)</span>
            </a>
          </section>

          <section aria-labelledby="role-heading">
            <h2 id="role-heading" className="text-xl font-bold">
              {org ? 'Why it matters for trade' : 'What traders use it for'}
            </h2>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {points.map((p) => (
                <li key={p} className="py-3 text-sm text-ink">
                  {p}
                </li>
              ))}
            </ul>
            {authority && (
              <p className="mt-3 text-sm leading-relaxed text-muted">
                This is a summary of the authority's role, not a statement of what applies to your shipment. Requirements depend on the product, its use, origin and destination — confirm
                on the official website.
              </p>
            )}
          </section>

          <section aria-labelledby="facts-heading">
            <h2 id="facts-heading" className="mb-3 text-xl font-bold">
              Key facts
            </h2>
            <FactList items={facts} />
          </section>

          <RelatedPanel entityRef={makeRef(kind, record.id)} />
        </div>

        <div>
          <Provenance
            sourceIds={record.sourceIds}
            verification={record.verification}
            note={`The summary is written by eport and is not text from ${record.abbreviation ?? record.name}. eport is independent and is not affiliated with or endorsed by this body.`}
          />
        </div>
      </div>
    </>
  );
}
