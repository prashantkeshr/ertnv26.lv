/**
 * Incoterms® learning centre: a comparison table, a "where does risk move" journey bar for each
 * rule, and plain-language details. Everything comes from learning/incoterms.json, which is
 * checked at build time against facts that hold for every rule (for example "only DDP puts import
 * clearance on the seller"). eport's wording; the official text belongs to the ICC.
 */
import { ArrowRight, CircleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '@/components/common/motion';
import { Breadcrumbs } from '@/components/common/PageHeader';
import { buttonClass, cn, ExternalLink } from '@/components/common/primitives';
import { Badge, VerificationBadge } from '@/components/common/StatusBadge';
import { ErrorState, LoadingBlock } from '@/components/feedback/states';
import { useDataset } from '@/hooks/useAsync';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n';
import type { IncotermRule } from '@/types/schemas';
import { formatDate } from '@/utils/format';
import { Link } from 'react-router';

type Filter = 'all' | 'any' | 'sea';
const FILTERS: Array<[Filter, string]> = [
  ['all', 'All 11 rules'],
  ['any', 'Any mode of transport (7)'],
  ['sea', 'Sea and inland waterway only (4)'],
];
const STOPS = ['Seller', 'Origin', 'Main journey', 'Destination', 'Buyer'];

function Who({ value, none = 'Not required' }: { value: 'seller' | 'buyer' | 'none'; none?: string }) {
  const label = value === 'seller' ? 'Seller' : value === 'buyer' ? 'Buyer' : none;
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={cn('size-2.5 rounded-full', value === 'seller' ? 'bg-ocean' : value === 'buyer' ? 'bg-aurora' : 'bg-line ring-1 ring-muted')} />
      {label}
    </span>
  );
}

/** Two thin tracks, seller → buyer. Decorative: the same facts are written out beside it. */
function Journey({ rule }: { rule: IncotermRule }) {
  const track = (at: number, tone: string) => (
    <span className="relative block h-2.5 overflow-hidden rounded-full bg-aurora/40">
      <span className={cn('block h-full rounded-full', tone)} style={{ width: `${at}%` }} />
    </span>
  );
  return (
    <div aria-hidden="true" className="space-y-2">
      <div className="space-y-1">
        <span className="text-[0.7rem] font-semibold tracking-wide text-muted uppercase">Seller carries the risk</span>
        {track(rule.riskAt, 'bg-ocean')}
      </div>
      <div className="space-y-1">
        <span className="text-[0.7rem] font-semibold tracking-wide text-muted uppercase">Seller pays costs</span>
        {track(rule.costsAt, 'bg-sky')}
      </div>
      <div className="flex justify-between text-[0.65rem] text-muted">
        {STOPS.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </div>
  );
}

export default function IncotermsPage() {
  const { locale } = useI18n();
  const data = useDataset('incoterms');
  const uid = useId();
  const [filter, setFilter] = useState<Filter>('all');

  useSeo({
    title: 'Incoterms® 2020 rules explained — who pays, who clears customs, where risk passes',
    description: 'The eleven Incoterms® 2020 rules compared: who arranges transport and insurance, who clears export and import, and where risk moves from seller to buyer. Plain-language summaries.',
    path: '/academy/incoterms',
  });

  if (data.error) {
    return (
      <div className="container-page py-16">
        <ErrorState error={data.error} onRetry={data.reload} />
      </div>
    );
  }
  if (!data.data) {
    return (
      <div className="container-page py-16">
        <LoadingBlock lines={8} className="max-w-2xl" />
      </div>
    );
  }
  const d = data.data;
  const rules = d.rules.filter((r) => filter === 'all' || r.modes === filter);
  const groupTitle = new Map(d.groups.map((g) => [g.id, g.title]));

  return (
    <>
      <header className="hero-bg relative isolate overflow-hidden text-white">
        <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-80" />
        <div className="container-page pt-8 pb-12 sm:pt-10">
          <Breadcrumbs items={[{ label: 'Academy', path: '/academy' }, { label: 'Incoterms®' }]} />
          <p className="rise text-xs font-semibold tracking-[0.14em] text-sky uppercase" style={{ '--d': '0ms' } as React.CSSProperties}>
            eport Academy
          </p>
          <h1 className="rise mt-2 max-w-3xl text-4xl leading-tight font-extrabold text-white sm:text-5xl" style={{ '--d': '80ms' } as React.CSSProperties}>
            {d.edition} rules, explained
          </h1>
          <p className="rise mt-5 max-w-2xl text-base leading-relaxed text-white/85" style={{ '--d': '160ms' } as React.CSSProperties}>
            {d.intro}
          </p>
          <div className="rise mt-6 flex flex-wrap items-center gap-3" style={{ '--d': '240ms' } as React.CSSProperties}>
            <VerificationBadge status={d.status} />
            <span className="text-sm text-white/75">eport editorial summary · drafted {formatDate(d.draftedOn, locale)}</span>
          </div>
        </div>
      </header>

      <div className="container-page space-y-14 py-12">
        <div role="note" className="flex gap-3 rounded-lg border border-warn/30 bg-warn-soft p-4 text-sm leading-relaxed text-ink">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warn" />
          <p>
            <strong className="font-semibold text-heading">Read this first. </strong>
            {d.limits}{' '}
            <ExternalLink href={d.officialUrl}>Official Incoterms rules from the ICC</ExternalLink>
          </p>
        </div>

        <div>
          <div role="group" aria-label="Filter rules by mode of transport" className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn('min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors', filter === value ? 'bg-ocean text-white shadow' : 'text-ink hover:bg-soft')}
              >
                {label}
              </button>
            ))}
          </div>
          <p role="status" className="tabular mt-3 text-xs text-muted">
            {rules.length} of {d.rules.length} rules shown
          </p>
        </div>

        <section aria-labelledby={`${uid}-compare`}>
          <h2 id={`${uid}-compare`} className="text-2xl font-bold">
            Who does what
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">The four things that differ most between rules. “Risk passes” is the point where loss or damage becomes the buyer’s problem.</p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[46rem] border-collapse text-start text-sm">
              <caption className="sr-only">Comparison of the eleven Incoterms 2020 rules: who clears export, who pays main carriage, who must insure, who clears import</caption>
              <thead className="bg-soft text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">Rule</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">Export clearance</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">Main carriage</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">Insurance</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">Import clearance and duties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {rules.map((r) => (
                  <tr key={r.code}>
                    <th scope="row" className="px-4 py-3 text-start">
                      <a href={`#${r.code}`} className="font-bold text-heading hover:text-link">
                        {r.code}
                      </a>
                      <span className="block text-xs font-normal text-muted">{r.name}</span>
                    </th>
                    <td className="px-4 py-3"><Who value={r.exportClearance} /></td>
                    <td className="px-4 py-3"><Who value={r.mainCarriage} /></td>
                    <td className="px-4 py-3"><Who value={r.insurance} none="Not required" /></td>
                    <td className="px-4 py-3"><Who value={r.importClearance} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">“Not required” means the rule places no insurance duty on either side — a buyer or seller can, and usually should, still insure the cargo they are at risk for.</p>
        </section>

        <section aria-labelledby={`${uid}-rules`}>
          <h2 id={`${uid}-rules`} className="text-2xl font-bold">
            The rules in detail
          </h2>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {rules.map((r, i) => (
              <Reveal key={r.code} delay={(i % 2) * 70}>
                <article id={r.code} className="scroll-mt-28 rounded-2xl border border-line bg-surface p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold">
                      {r.code} <span className="text-base font-medium text-muted">— {r.name}</span>
                    </h3>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="info">{groupTitle.get(r.group)}</Badge>
                    <Badge tone="neutral">{r.modes === 'sea' ? 'Sea and inland waterway only' : 'Any mode of transport'}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink">{r.summary}</p>
                  <dl className="mt-4 space-y-2 text-sm leading-relaxed">
                    <div>
                      <dt className="inline font-semibold text-heading">Delivery: </dt>
                      <dd className="inline text-ink">{r.delivery}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-heading">Risk passes: </dt>
                      <dd className="inline text-ink">{r.riskPasses}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-heading">Often used for: </dt>
                      <dd className="inline text-ink">{r.typicalUse}</dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <Journey rule={r} />
                  </div>
                  <p className="mt-4 rounded-lg bg-soft p-3 text-sm leading-relaxed text-ink">
                    <span className="font-semibold text-heading">Watch out: </span>
                    {r.watchOut}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <p className="text-xs leading-relaxed text-muted">
          Incoterms® is a registered trademark of the International Chamber of Commerce. eport is not affiliated with the ICC; this page is an independent summary and does not reproduce the official rules.
        </p>

        <div className="flex flex-wrap gap-3 border-t border-line pt-8">
          <Link to="/trade" className={buttonClass('primary', 'md')}>
            Explore trade between two countries
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
          <Link to="/directory/organizations/icc" className={buttonClass('secondary', 'md')}>
            About the ICC
          </Link>
        </div>
      </div>
    </>
  );
}
