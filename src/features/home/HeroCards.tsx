/**
 * Floating glass cards over the hero globe. Both show real, sourced figures:
 * the country count from the published manifest and the latest world-exports value
 * from the World Bank snapshot — never marketing numbers.
 */
import { Link } from 'react-router';
import { useAsync, useDataset } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import { loadIndicators } from '@/services/data/loader';
import { formatNumber, formatUsdCompact } from '@/utils/format';

export function Sparkline({ points }: { points: Array<{ year: number; value: number }> }) {
  if (points.length < 2) return null;
  const W = 150;
  const H = 38;
  const xs = points.map((p) => p.year);
  const min = Math.min(...points.map((p) => p.value));
  const max = Math.max(...points.map((p) => p.value));
  const x = (yr: number) => ((yr - xs[0]!) / (xs[xs.length - 1]! - xs[0]!)) * (W - 4) + 2;
  const y = (v: number) => H - 3 - ((v - min) / (max - min || 1)) * (H - 8);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const last = points[points.length - 1]!;
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} className="mt-3 h-9 w-full overflow-visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5cc8ef" stopOpacity="0.35" />
          <stop offset="1" stopColor="#5cc8ef" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d}L${x(last.year)},${H}L${x(points[0]!.year)},${H}Z`} fill="url(#spark-fill)" />
      <path d={d} fill="none" stroke="#9fd0ee" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last.year)} cy={y(last.value)} r="2.8" fill="#fff" />
    </svg>
  );
}

export function HeroCards() {
  const { locale } = useI18n();
  const manifest = useDataset('manifest');
  const world = useAsync('hero:wld', () => loadIndicators('WLD'));
  const countries = manifest.data?.datasets.find((d) => d.id === 'countries')?.records;
  const exports = world.data?.series.find((s) => s.indicatorId === 'NE.EXP.GNFS.CD');
  const last = exports?.points[exports.points.length - 1];

  return (
    <>
      {countries != null && (
        <Link
          to="/countries"
          className="glass float absolute start-0 top-[9%] hidden w-52 rounded-xl p-4 text-white transition-colors hover:border-white/40 sm:block"
          style={{ '--d': '0ms' } as React.CSSProperties}
        >
          <span className="flex items-center gap-2 text-xs font-medium text-sky">
            <span className="relative flex size-2">
              <span className="ping absolute inline-flex size-full rounded-full bg-aurora opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-aurora" />
            </span>
            ISO-indexed
          </span>
          <span className="tabular mt-1.5 block font-display text-3xl font-bold">{formatNumber(countries, locale)}</span>
          <span className="text-sm text-white/80">countries and territories</span>
        </Link>
      )}

      {last && exports && (
        <div className="glass float absolute end-0 bottom-[8%] hidden w-60 rounded-xl p-4 text-white sm:block" style={{ '--d': '1400ms' } as React.CSSProperties}>
          <span className="block text-xs font-medium text-sky">World exports of goods and services</span>
          <span className="tabular mt-1.5 block font-display text-2xl font-bold">{formatUsdCompact(last.value, locale)}</span>
          <Sparkline points={exports.points} />
          <span className="mt-1.5 block text-xs text-white/70">
            {last.year} · World Bank · historical statistic
          </span>
        </div>
      )}
    </>
  );
}
