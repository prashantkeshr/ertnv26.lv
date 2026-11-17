import { Building2, Landmark } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { routeMeta } from '@/app/route-meta';
import { Flag } from '@/components/common/Flag';
import { OrgLogo } from '@/components/common/OrgLogo';
import { PageHeader, seoCrumbs } from '@/components/common/PageHeader';
import { hostOf, inputClass } from '@/components/common/primitives';
import { Badge, VerificationBadge } from '@/components/common/StatusBadge';
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import type { Authority, Organization, VerificationStatus } from '@/types/schemas';
import { AUTHORITY_CATEGORY_LABEL, ORG_IS_OFFICIAL, ORG_TYPE_LABEL } from '@/utils/labels';

interface Row {
  id: string;
  path: string;
  name: string;
  short: string | null;
  typeKey: string;
  typeLabel: string;
  official: boolean;
  place: string;
  flag: string;
  org?: Organization;
  summary: string;
  website: string;
  status: VerificationStatus;
  haystack: string;
}

const CONFIG = {
  organization: {
    path: '/directory/organizations',
    crumb: 'International organizations',
    title: 'International organizations',
    description:
      'The bodies whose rules, standards and data shape international trade and shipping. Intergovernmental bodies and private or non-governmental bodies are labelled separately.',
    typeFilterLabel: 'Type of organization',
    scopeNote: null as string | null,
  },
  authority: {
    path: '/directory/authorities',
    crumb: 'Official authorities',
    title: 'Government and official authorities',
    description: 'Trade, customs, tax, standards and sector regulators, each linked to its official website.',
    typeFilterLabel: 'Category',
    scopeNote: 'Coverage so far: India, national authorities only. State-level bodies, export promotion councils, port authorities and other countries are not yet listed.',
  },
} as const;

function fromOrganization(o: Organization): Row {
  return {
    id: o.id,
    path: `/directory/organizations/${o.id}`,
    name: o.name,
    short: o.abbreviation,
    typeKey: o.orgType,
    typeLabel: ORG_TYPE_LABEL[o.orgType],
    official: ORG_IS_OFFICIAL[o.orgType],
    place: o.headquarters.city,
    flag: o.headquarters.countryCode,
    org: o,
    summary: o.summary,
    website: o.website,
    status: o.verification.status,
    haystack: [o.name, o.abbreviation, o.summary, ...o.tradeRelevance].join(' ').toLowerCase(),
  };
}

function fromAuthority(a: Authority): Row {
  return {
    id: a.id,
    path: `/directory/authorities/${a.id}`,
    name: a.name,
    short: a.abbreviation,
    typeKey: a.category,
    typeLabel: AUTHORITY_CATEGORY_LABEL[a.category],
    official: true,
    place: a.jurisdiction === 'IN' ? 'India' : a.jurisdiction,
    flag: a.jurisdiction,
    summary: a.summary,
    website: a.website,
    status: a.verification.status,
    haystack: [a.name, a.abbreviation ?? '', a.summary, a.parentBody ?? '', ...a.functions].join(' ').toLowerCase(),
  };
}

export default function DirectoryListPage({ kind }: { kind: 'organization' | 'authority' }) {
  const config = CONFIG[kind];
  const meta = routeMeta(config.path);
  const crumbs = [{ label: 'Directory', path: '/directory' }, { label: config.crumb }];
  useSeo({ title: meta.title, description: meta.description, path: config.path, breadcrumbs: seoCrumbs(crumbs, config.path) });

  const organizations = useDataset('organizations');
  const authorities = useDataset('authorities-in');
  const state = kind === 'organization' ? organizations : authorities;
  const [q, setQ] = useState('');
  const [type, setType] = useState('');

  const rows = useMemo<Row[]>(() => {
    const list = kind === 'organization' ? (organizations.data ?? []).map(fromOrganization) : (authorities.data ?? []).map(fromAuthority);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [kind, organizations.data, authorities.data]);
  const types = useMemo(() => [...new Map(rows.map((r) => [r.typeKey, r.typeLabel]))].sort((a, b) => a[1].localeCompare(b[1])), [rows]);
  const needle = q.trim().toLowerCase();
  const filtered = rows.filter((r) => (!type || r.typeKey === type) && (!needle || needle.split(/\s+/).every((w) => r.haystack.includes(w))));

  return (
    <>
      <PageHeader crumbs={crumbs} kicker="eport Directory" title={config.title} description={config.description} />
      <div className="container-page py-10">
        {config.scopeNote && <p className="mb-6 rounded-md border border-warn/25 bg-warn-soft px-4 py-3 text-sm text-ink">{config.scopeNote}</p>}

        <form role="search" aria-label={`Filter ${config.crumb.toLowerCase()}`} onSubmit={(e) => e.preventDefault()} className="grid gap-4 rounded-lg border border-line bg-soft p-4 sm:grid-cols-[1fr_18rem]">
          <label className="block text-sm font-medium text-heading">
            Name, abbreviation or function
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={kind === 'organization' ? 'e.g. customs, Incoterms, WTO' : 'e.g. IEC, customs, phytosanitary'} className={`${inputClass} mt-1.5`} autoComplete="off" />
          </label>
          <label className="block text-sm font-medium text-heading">
            {config.typeFilterLabel}
            <select value={type} onChange={(e) => setType(e.target.value)} className={`${inputClass} mt-1.5`}>
              <option value="">All</option>
              {types.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </form>

        <div className="mt-6">
          {state.status === 'error' && <ErrorState error={state.error} onRetry={state.reload} />}
          {state.status === 'loading' && <CardGridSkeleton />}
          {state.status === 'ready' && (
            <>
              <p role="status" className="tabular mb-3 text-sm text-muted">
                {filtered.length} of {rows.length} records
              </p>
              {filtered.length === 0 ? (
                <EmptyState title="No record matches these filters" description="Try a shorter term or clear the filters. If a body is missing, it has not been sourced yet." />
              ) : (
                <ul className="grid gap-4 md:grid-cols-2">
                  {filtered.map((r) => (
                    <li key={r.id}>
                      <Link to={r.path} className="group flex h-full flex-col rounded-lg border border-line bg-surface p-5 transition-colors hover:border-ocean">
                        {r.org && <OrgLogo org={r.org} size="md" className="mb-4 self-start" />}
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-base font-bold group-hover:text-link">
                            {r.name}
                            {r.short && <span className="ms-2 font-sans text-sm font-medium text-muted">{r.short}</span>}
                          </h2>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge tone={r.official ? 'info' : 'neutral'} icon={r.official ? Landmark : Building2}>
                            {r.typeLabel}
                          </Badge>
                          <VerificationBadge status={r.status} />
                        </div>
                        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{r.summary}</p>
                        <p className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                          <span className="inline-flex items-center gap-2">
                            <Flag code={r.flag} />
                            {r.place}
                          </span>
                          <span>{hostOf(r.website)}</span>
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
