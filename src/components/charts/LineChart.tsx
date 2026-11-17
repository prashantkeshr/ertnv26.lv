/**
 * Small dependency-free SVG line chart for annual series.
 *
 * Accessibility: the chart is exposed as an image with a text summary, and the same
 * numbers are available as a real table (toggle below the chart). Series are told apart
 * by line style and a text legend, not by colour alone. Gaps in the data stay as gaps.
 */
import { useId, useState } from 'react';
import { cn } from '@/components/common/primitives';

export interface ChartSeries {
  id: string;
  label: string;
  points: Array<{ year: number; value: number }>;
}

interface LineChartProps {
  series: ChartSeries[];
  /** Formats a value for axis ticks. */
  formatAxis: (value: number) => string;
  /** Formats a value in full for the table and tooltip. */
  formatValue: (value: number) => string;
  summary: string;
  height?: number;
}

const STYLE = [
  { stroke: 'var(--color-ocean)', dash: undefined },
  { stroke: 'var(--color-navy)', dash: '5 4' },
  { stroke: 'var(--color-muted)', dash: '2 3' },
];

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

export function LineChart({ series, formatAxis, formatValue, summary, height = 260 }: LineChartProps) {
  const [showTable, setShowTable] = useState(false);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const tableId = useId();

  const years = [...new Set(series.flatMap((s) => s.points.map((p) => p.year)))].sort((a, b) => a - b);
  if (years.length < 2) return null;
  const minYear = years[0]!;
  const maxYear = years[years.length - 1]!;
  const yMax = niceMax(Math.max(...series.flatMap((s) => s.points.map((p) => p.value))));

  const W = 720;
  const H = height;
  const pad = { top: 12, right: 16, bottom: 28, left: 52 };
  const x = (year: number) => pad.left + ((year - minYear) / (maxYear - minYear)) * (W - pad.left - pad.right);
  const y = (value: number) => pad.top + (1 - value / yMax) * (H - pad.top - pad.bottom);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const yearStep = Math.max(1, Math.ceil((maxYear - minYear) / 6));
  const yearTicks = years.filter((yr) => (maxYear - yr) % yearStep === 0);

  // A path per run of consecutive years, so a missing year breaks the line instead of being bridged.
  const paths = (points: ChartSeries['points']) => {
    const runs: string[] = [];
    let current = '';
    let prev: number | null = null;
    for (const p of [...points].sort((a, b) => a.year - b.year)) {
      const cmd = prev !== null && p.year === prev + 1 ? 'L' : 'M';
      if (cmd === 'M' && current) {
        runs.push(current);
        current = '';
      }
      current += `${cmd}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`;
      prev = p.year;
    }
    if (current) runs.push(current);
    return runs;
  };

  const valueAt = (s: ChartSeries, year: number) => s.points.find((p) => p.year === year)?.value;

  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
        {series.map((s, i) => {
          const st = STYLE[i % STYLE.length]!;
          return (
            <span key={s.id} className="inline-flex items-center gap-2 text-ink">
              <svg aria-hidden="true" width="28" height="8">
                <line x1="0" y1="4" x2="28" y2="4" stroke={st.stroke} strokeWidth="2.5" strokeDasharray={st.dash} />
              </svg>
              {s.label}
            </span>
          );
        })}
      </div>

      <svg
        role="img"
        aria-label={summary}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        onPointerLeave={() => setHoverYear(null)}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const yr = Math.round(minYear + ((px - pad.left) / (W - pad.left - pad.right)) * (maxYear - minYear));
          setHoverYear(yr >= minYear && yr <= maxYear ? yr : null);
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--color-muted)">
              {formatAxis(t)}
            </text>
          </g>
        ))}
        {yearTicks.map((yr) => (
          <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--color-muted)">
            {yr}
          </text>
        ))}
        {hoverYear !== null && <line x1={x(hoverYear)} x2={x(hoverYear)} y1={pad.top} y2={H - pad.bottom} stroke="var(--color-muted)" strokeWidth="1" strokeDasharray="3 3" />}
        {series.map((s, i) => {
          const st = STYLE[i % STYLE.length]!;
          return (
            <g key={s.id}>
              {paths(s.points).map((d, j) => (
                <path key={j} d={d} fill="none" stroke={st.stroke} strokeWidth="2.25" strokeDasharray={st.dash} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {hoverYear !== null && valueAt(s, hoverYear) !== undefined && (
                <circle cx={x(hoverYear)} cy={y(valueAt(s, hoverYear)!)} r="4" fill="#fff" stroke={st.stroke} strokeWidth="2" />
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex min-h-6 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <p aria-hidden="true" className="tabular text-muted">
          {hoverYear !== null &&
            `${hoverYear}: ` +
              series
                .map((s) => {
                  const v = valueAt(s, hoverYear);
                  return `${s.label} ${v === undefined ? 'no data' : formatValue(v)}`;
                })
                .join(' · ')}
        </p>
        <button type="button" aria-expanded={showTable} aria-controls={tableId} onClick={() => setShowTable((v) => !v)} className="link ms-auto text-sm">
          {showTable ? 'Hide data table' : 'View data as a table'}
        </button>
      </div>

      <div id={tableId} hidden={!showTable} role="region" aria-label="Chart data table, scrollable" tabIndex={0} className="mt-3 max-h-72 overflow-auto rounded-md border border-line">
        <table className="w-full text-sm">
          <caption className="sr-only">{summary}</caption>
          <thead className="sticky top-0 bg-soft text-left">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">
                Year
              </th>
              {series.map((s) => (
                <th key={s.id} scope="col" className="px-3 py-2 text-right font-semibold">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular">
            {[...years].reverse().map((yr) => (
              <tr key={yr} className="border-t border-line">
                <th scope="row" className="px-3 py-1.5 text-left font-medium">
                  {yr}
                </th>
                {series.map((s) => {
                  const v = valueAt(s, yr);
                  return (
                    <td key={s.id} className={cn('px-3 py-1.5 text-right', v === undefined && 'text-muted')}>
                      {v === undefined ? 'No data' : formatValue(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
