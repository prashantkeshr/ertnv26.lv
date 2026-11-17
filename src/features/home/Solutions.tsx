/**
 * "A trusted starting point" — four alternating solution blocks. Each visual is built from
 * eport's real published data (indicators, authorities, graph edges, dataset manifest), not
 * from mock-ups.
 */
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Flag } from '@/components/common/Flag';
import { Reveal } from '@/components/common/motion';
import { ButtonLink, cn, Kicker, Section } from '@/components/common/primitives';
import { CoverageBadge, VerificationBadge } from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/feedback/states';
import { useAsync, useDataset } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import { loadIndicators } from '@/services/data/loader';
import type { DatasetCoverage } from '@/types/schemas';
import { formatPercent, formatUsdCompact } from '@/utils/format';
import { Sparkline } from './HeroCards';

/* ------------------------------------------------------------------ visuals */

function CountryCardVisual() {
  const { locale } = useI18n();
  const india = useAsync('solutions:ind', () => loadIndicators('IND'));
  const find = (id: string) => india.data?.series.find((s) => s.indicatorId === id);
  const exp = find('NE.EXP.GNFS.CD');
  const last = exp?.points.at(-1);
  const share = find('NE.TRD.GNFS.ZS')?.points.at(-1);
  return (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <Flag code="IN" className="!h-5 !w-[27px]" />
        <p className="font-display text-lg font-bold text-heading">India</p>
        <span className="ms-auto rounded bg-info-soft px-2 py-0.5 text-xs font-medium text-link-hover">ISO IN · IND · 356</span>
      </div>
      {india.status !== 'ready' || !exp || !last ? (
        <Skeleton className="mt-6 h-32 w-full" />
      ) : (
        <>
          <p className="mt-6 text-xs text-muted">Exports of goods and services</p>
          <p className="tabular font-display text-3xl font-bold text-heading">{formatUsdCompact(last.value, locale)}</p>
          <div className="mt-1 [&_svg]:h-14">
            <Sparkline points={exp.points} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Year</dt>
              <dd className="tabular font-semibold text-heading">{last.year}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Trade, % of GDP</dt>
              <dd className="tabular font-semibold text-heading">{share ? formatPercent(share.value, locale) : '—'}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted">World Bank · historical statistic · CC BY 4.0</p>
        </>
      )}
    </div>
  );
}

function AuthorityListVisual() {
  const authorities = useDataset('authorities-in');
  const pick = ['in-dgft', 'in-cbic', 'in-icegate', 'in-apeda', 'in-rbi'];
  const rows = pick.map((id) => authorities.data?.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => Boolean(a));
  return (
    <ul className="divide-y divide-line">
      {authorities.status !== 'ready'
        ? Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="p-4">
              <Skeleton className="h-10 w-full" />
            </li>
          ))
        : rows.map((a) => (
            <li key={a.id}>
              <Link to={`/directory/authorities/${a.id}`} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-soft">
                <Flag code={a.jurisdiction} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-heading group-hover:text-link">{a.abbreviation ?? a.name}</span>
                  <span className="block truncate text-xs text-muted">{a.name}</span>
                </span>
                <VerificationBadge status={a.verification.status} />
              </Link>
            </li>
          ))}
    </ul>
  );
}

/** Node-link diagram: India → its authorities → their international counterparts, from real graph edges. */
function GraphVisual() {
  const graph = useDataset('graph');
  if (graph.status !== 'ready') return <Skeleton className="m-6 h-72" />;
  const g = graph.data;
  const hub = 'country:IN';
  const authorities = g.edges.filter((e) => e.to === hub && e.type === 'jurisdiction').map((e) => e.from).slice(0, 10);
  const orgs = new Map<string, string[]>();
  for (const e of g.edges) if (authorities.includes(e.from) && g.nodes[e.to]?.type === 'organization') orgs.set(e.to, [...(orgs.get(e.to) ?? []), e.from]);

  const W = 420;
  const C = W / 2;
  const R1 = 108;
  const R2 = 186;
  const pos = (i: number, n: number, r: number, offset = -Math.PI / 2) => [C + r * Math.cos(offset + (i / n) * 2 * Math.PI), C + r * Math.sin(offset + (i / n) * 2 * Math.PI)] as const;
  const aPos = new Map(authorities.map((a, i) => [a, pos(i, authorities.length, R1)] as const));
  const oList = [...orgs.keys()];
  // International organizations sit evenly spaced on the outer ring.
  const oEven = new Map(oList.map((o, i) => [o, pos(i, oList.length, R2, -Math.PI / 2 + Math.PI / oList.length)] as const));

  const short = (ref: string) => g.nodes[ref]?.meta ?? g.nodes[ref]?.label ?? ref;
  return (
    <svg role="img" viewBox={`0 0 ${W} ${W}`} className="h-auto w-full" aria-label={`Diagram: India connects to ${authorities.length} national authorities, which link to ${oList.length} international organizations such as ${oList.slice(0, 3).map(short).join(', ')}.`}>
      {authorities.map((a) => <line key={a} className="flow" x1={C} y1={C} x2={aPos.get(a)![0]} y2={aPos.get(a)![1]} stroke="var(--link)" strokeOpacity="0.55" strokeWidth="1.4" />)}
      {oList.flatMap((o) => (orgs.get(o) ?? []).map((a) => <line key={`${o}-${a}`} className="flow" x1={aPos.get(a)![0]} y1={aPos.get(a)![1]} x2={oEven.get(o)![0]} y2={oEven.get(o)![1]} stroke="var(--muted)" strokeOpacity="0.5" strokeWidth="1.1" />))}
      {oList.map((o) => (
        <g key={o} transform={`translate(${oEven.get(o)![0]} ${oEven.get(o)![1]})`}>
          <circle r="19" style={{ fill: 'var(--surface)', stroke: 'var(--muted)' }} strokeWidth="1.2" />
          <text textAnchor="middle" y="3.5" fontSize="9.5" fontWeight="700" style={{ fill: 'var(--heading)' }}>{short(o).slice(0, 5)}</text>
        </g>
      ))}
      {authorities.map((a) => (
        <g key={a} transform={`translate(${aPos.get(a)![0]} ${aPos.get(a)![1]})`}>
          <circle r="15" style={{ fill: 'var(--info-soft)', stroke: 'var(--link)' }} strokeWidth="1.4" />
          <text textAnchor="middle" y="3.2" fontSize="8" fontWeight="700" style={{ fill: 'var(--heading)' }}>{short(a).slice(0, 5)}</text>
        </g>
      ))}
      <circle cx={C} cy={C} r="34" fill="var(--color-ocean)" />
      <text x={C} y={C + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">India</text>
    </svg>
  );
}

function ReliabilityVisual() {
  const manifest = useDataset('manifest');
  const order: Array<[DatasetCoverage, string]> = [['verified', 'bg-ok'], ['partial', 'bg-link'], ['seed', 'bg-warn'], ['unavailable', 'bg-muted']];
  if (manifest.status !== 'ready') return <Skeleton className="m-6 h-40" />;
  const sets = manifest.data.datasets;
  return (
    <div className="p-6">
      <p className="text-xs text-muted">{sets.length} datasets, counted from the published manifest</p>
      <div aria-hidden="true" className="mt-3 flex h-3 overflow-hidden rounded-full bg-line">
        {order.map(([c, color]) => <span key={c} className={color} style={{ width: `${(sets.filter((d) => d.coverage === c).length / sets.length) * 100}%` }} />)}
      </div>
      <ul className="mt-5 space-y-3">
        {order.map(([c]) => (
          <li key={c} className="flex items-center justify-between gap-3">
            <CoverageBadge coverage={c} />
            <span className="tabular font-display text-lg font-bold text-heading">{sets.filter((d) => d.coverage === c).length}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------- blocks */

interface Block {
  kicker: string;
  title: string;
  text: string;
  tags: string[];
  to: string;
  cta: string;
  visual: ReactNode;
  padded?: boolean;
}

const BLOCKS: Block[] = [
  {
    kicker: 'Borderless market research',
    title: 'Every market, one clear profile',
    text: 'Open any of 250 countries and territories for ISO identifiers, sourced trade and economic indicators, a live reference exchange rate and every authority eport has linked to it — each figure with its source and date.',
    tags: ['ISO identifiers', 'World Bank indicators', 'Reference FX rate', 'Linked authorities'],
    to: '/countries',
    cta: 'Explore countries',
    visual: <CountryCardVisual />,
  },
  {
    kicker: 'Official authority directory',
    title: 'Find the right authority first time',
    text: 'Trade regulators, customs, tax, standards, export promotion and sector bodies — each summarised in eport’s own words, labelled with a verification status and linked straight to its official website.',
    tags: ['Customs', 'Trade regulators', 'Standards', 'Single window'],
    to: '/directory/authorities',
    cta: 'Browse authorities',
    visual: <AuthorityListVisual />,
  },
  {
    kicker: 'Trade knowledge graph',
    title: 'See how the bodies connect',
    text: 'Authorities, parent bodies, international organizations and countries are linked. Open a record and every related body is one click away — no repeated searching.',
    tags: ['Parent bodies', 'International counterparts', 'Jurisdictions'],
    to: '/countries/IN',
    cta: 'See India’s connections',
    visual: <GraphVisual />,
    padded: true,
  },
  {
    kicker: 'Data you can audit',
    title: 'Know what is verified — and what is not',
    text: 'The Data Reliability Centre lists every dataset, API and module with its real status, counts and dates. Gaps are shown on purpose, so a missing answer is never mistaken for “nothing applies”.',
    tags: ['Dataset coverage', 'API status', 'Link checks', 'Feature availability'],
    to: '/data-reliability',
    cta: 'Open the Reliability Centre',
    visual: <ReliabilityVisual />,
  },
];

export function Solutions() {
  return (
    <Section aria-labelledby="solutions-heading">
      <Reveal className="mx-auto max-w-2xl text-center">
        <Kicker>A trusted starting point</Kicker>
        <h2 id="solutions-heading" className="text-3xl font-bold sm:text-4xl">
          Built for people who move goods across borders
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">Research a market, find the official authority, and understand what is — and is not — confirmed, before you commit to a shipment.</p>
      </Reveal>

      <div className="mt-16 space-y-20 sm:space-y-24">
        {BLOCKS.map((b, i) => (
          <div key={b.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal from={i % 2 ? 'left' : 'up'} className={cn(i % 2 === 1 && 'lg:order-2')}>
              <p className="text-xs font-semibold tracking-[0.14em] text-link uppercase">{b.kicker}</p>
              <h3 className="mt-2 text-2xl font-bold sm:text-3xl">{b.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-muted">{b.text}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {b.tags.map((t) => (
                  <li key={t} className="rounded-full border border-line bg-soft px-3 py-1 text-xs font-medium text-ink">
                    {t}
                  </li>
                ))}
              </ul>
              <ButtonLink to={b.to} variant="secondary" className="mt-7">
                {b.cta}
                <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
              </ButtonLink>
            </Reveal>
            <Reveal from="scale" delay={100} className={cn(i % 2 === 1 && 'lg:order-1')}>
              <div className="relative">
                <div aria-hidden="true" className="absolute -inset-3 -z-10 rounded-[1.75rem] bg-gradient-to-br from-ocean/15 via-transparent to-aurora/10 blur-xl" />
                <div className={cn('overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-30px_rgb(11_31_51/0.45)]', b.padded && 'p-4')}>{b.visual}</div>
              </div>
            </Reveal>
          </div>
        ))}
      </div>
    </Section>
  );
}
