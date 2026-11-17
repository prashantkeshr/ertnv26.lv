import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { findDivision, type ModuleStatus, type PlatformModule } from '@/app/modules';
import { routeMeta } from '@/app/route-meta';
import { IndicatorPanel } from '@/components/charts/IndicatorPanel';
import { PageHeader, seoCrumbs } from '@/components/common/PageHeader';
import { Card, Section, SectionHeading } from '@/components/common/primitives';
import { ModuleStatusBadge } from '@/components/common/StatusBadge';
import { useSeo } from '@/hooks/useSeo';

const GROUPS: Array<{ statuses: ModuleStatus[]; title: string; description: string }> = [
  { statuses: ['live', 'foundation'], title: 'Available now', description: 'Built, working and tested.' },
  { statuses: ['planned'], title: 'In development', description: 'Achievable in the browser and scheduled. Not usable yet — and not presented as if it were.' },
  {
    statuses: ['requires-backend'],
    title: 'Coming Soon — needs a secure service',
    description: 'These cannot work on a static site without exposing credentials or faking a result, so eport does neither.',
  },
];

function ModuleCard({ module }: { module: PlatformModule }) {
  const linked = Boolean(module.path);
  const inner = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className={`text-base font-bold ${linked ? 'group-hover:text-ocean' : ''}`}>{module.title}</h3>
        <ModuleStatusBadge status={module.status} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{module.summary}</p>
      {module.note && <p className="mt-3 border-s-2 border-line ps-3 text-sm leading-relaxed text-ink">{module.note}</p>}
      <p className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>Phase {module.phase}</span>
        {linked && (
          <span className="inline-flex items-center gap-1 font-semibold text-ocean">
            Open <ArrowRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
          </span>
        )}
      </p>
    </>
  );
  return linked ? (
    <Link to={module.path!} className="group block h-full rounded-lg border border-line bg-white p-5 transition-colors hover:border-ocean">
      {inner}
    </Link>
  ) : (
    <Card className="h-full p-5">{inner}</Card>
  );
}

export default function DivisionPage({ divisionId }: { divisionId: string }) {
  const division = findDivision(divisionId)!;
  const meta = routeMeta(division.path);
  const crumbs = [{ label: division.kicker }];
  useSeo({ title: meta.title, description: meta.description, path: division.path, breadcrumbs: seoCrumbs(crumbs, division.path) });

  return (
    <>
      <PageHeader crumbs={crumbs} kicker={division.kicker} title={division.purpose} description={division.description} />

      {division.id === 'intelligence' && (
        <Section aria-labelledby="world-heading">
          <SectionHeading
            id="world-heading"
            kicker="Global trade overview"
            title="World trade in goods and services"
            description="World totals from the World Bank. Open any country in the Country Explorer for its own figures."
          />
          <IndicatorPanel areaCode="WLD" areaName="World" />
        </Section>
      )}

      {GROUPS.map((group, i) => {
        const modules = division.modules.filter((m) => group.statuses.includes(m.status));
        if (!modules.length) return null;
        const id = `group-${i}`;
        return (
          <Section key={group.title} tone={i % 2 === 0 ? 'soft' : 'white'} aria-labelledby={id}>
            <SectionHeading id={id} title={group.title} description={group.description} />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => (
                <li key={m.id}>
                  <ModuleCard module={m} />
                </li>
              ))}
            </ul>
          </Section>
        );
      })}

      <Section aria-labelledby="status-heading">
        <div className="max-w-2xl">
          <h2 id="status-heading" className="text-xl font-bold">
            How to read these statuses
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            A module is marked available only when it has a working interface, real functionality, validated inputs, handled errors and tests. A landing page alone never counts. The full
            picture — every dataset, API and module — is in the{' '}
            <Link to="/data-reliability" className="link">
              Data Reliability Centre
            </Link>
            .
          </p>
        </div>
      </Section>
    </>
  );
}
