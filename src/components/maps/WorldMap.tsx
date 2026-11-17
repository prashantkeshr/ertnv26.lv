/**
 * Interactive world map of countries.
 *
 * Geometry: Natural Earth 1:110m (public domain), loaded on demand as a static file — no
 * tile server, no third-party request, no tracking. Click a country to open its profile.
 *
 * The map is a pointer-driven convenience. Everything it offers is also reachable by
 * keyboard through the country list and search, which the surrounding page links to.
 */
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router';
import { feature } from 'topojson-client';
import { ErrorState, Skeleton } from '@/components/feedback/states';
import { COUNTRY_LEVEL_LABEL } from '@/components/common/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { loadFile } from '@/services/data/loader';
import type { Country, CountryCoverage } from '@/types/schemas';
import { Topology } from './topology';

const W = 960;
const H = 500;
const MAX_ZOOM = 8;

interface WorldMapProps {
  countries: Country[];
  coverage: CountryCoverage;
}

interface Shape {
  key: string;
  d: string;
  country: Country | null;
  fallbackName: string;
}

export default function WorldMap({ countries, coverage }: WorldMapProps) {
  const navigate = useNavigate();
  const topo = useAsync('geo:countries-110m', () => loadFile('geo/countries-110m.json', Topology));
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<Shape | null>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);

  const { shapes, sphere, graticule } = useMemo(() => {
    const projection = geoNaturalEarth1().fitExtent(
      [
        [8, 8],
        [W - 8, H - 8],
      ],
      { type: 'Sphere' },
    );
    const path = geoPath(projection);
    const base = { sphere: path({ type: 'Sphere' }) ?? '', graticule: path(geoGraticule10()) ?? '' };
    if (!topo.data) return { shapes: [] as Shape[], ...base };

    const byNumeric = new Map(countries.filter((c) => c.ccn3).map((c) => [c.ccn3!, c]));
    const byName = new Map(countries.map((c) => [c.name.toLowerCase(), c]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collection = feature(topo.data as any, (topo.data as any).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
    const list: Shape[] = collection.features.map((f: Feature<Geometry, { name: string }>, i) => {
      const id = f.id === undefined ? null : String(f.id).padStart(3, '0');
      const country = (id && byNumeric.get(id)) || byName.get(f.properties.name.toLowerCase()) || null;
      return { key: `${id ?? 'x'}-${i}`, d: path(f) ?? '', country, fallbackName: f.properties.name };
    });
    return { shapes: list, ...base };
  }, [topo.data, countries]);

  function clamp(k: number, x: number, y: number) {
    const minX = W - W * k;
    const minY = H - H * k;
    return { k, x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  }

  function zoom(factor: number) {
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(1, v.k * factor));
      // Keep the centre of the viewport fixed while zooming.
      const cx = (W / 2 - v.x) / v.k;
      const cy = (H / 2 - v.y) / v.k;
      return clamp(k, W / 2 - cx * k, H / 2 - cy * k);
    });
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (view.k === 1) return;
    drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d) return;
    const scale = W / e.currentTarget.getBoundingClientRect().width;
    const dx = (e.clientX - d.px) * scale;
    const dy = (e.clientY - d.py) * scale;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    setView((v) => clamp(v.k, d.x + dx, d.y + dy));
  }
  function onPointerUp() {
    // Keep the "moved" flag for the click that follows a drag, then clear it.
    window.setTimeout(() => (drag.current = null), 0);
  }

  if (topo.status === 'error') return <ErrorState error={topo.error} onRetry={topo.reload} title="The map could not be loaded" />;

  const levelOf = (c: Country) => coverage.countries[c.cca2]?.level ?? coverage.defaultLevel;
  const hoverText = hover
    ? hover.country
      ? `${hover.country.name} · ${hover.country.subregion ?? hover.country.region} · ${hover.country.cca2} — ${COUNTRY_LEVEL_LABEL[levelOf(hover.country)]}`
      : `${hover.fallbackName} — no ISO 3166-1 record; not linked`
    : 'Hover or tap a country. Select it to open its profile.';

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg border border-line bg-surface">
        {topo.status === 'loading' && <Skeleton className="absolute inset-0 rounded-none" />}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="World map of countries. The same countries are available as a searchable list on the Country Explorer page."
          className="block h-auto w-full touch-pan-y select-none"
          style={{ cursor: view.k > 1 ? 'grab' : 'default' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <pattern id="map-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="var(--color-ocean)" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--map-stroke)" strokeOpacity="0.5" strokeWidth="1.5" />
            </pattern>
          </defs>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <path d={sphere} style={{ fill: 'var(--map-sea)' }} />
            <path d={graticule} fill="none" stroke="var(--line)" strokeWidth={0.5 / view.k} />
            {shapes.map((s) => {
              const c = s.country;
              const featured = c ? levelOf(c) !== 'reference' : false;
              const active = hover?.key === s.key;
              return (
                <path
                  key={s.key}
                  d={s.d}
                  style={{ fill: featured ? 'url(#map-hatch)' : active && c ? 'var(--color-accent)' : c ? 'var(--map-land)' : 'var(--map-land-2)', cursor: c ? 'pointer' : 'default' }}
                  stroke={active && c ? 'var(--heading)' : 'var(--map-stroke)'}
                  strokeWidth={(active && c ? 1.2 : 0.6) / view.k}
                  onPointerEnter={() => setHover(s)}
                  onClick={() => {
                    if (c && !drag.current?.moved) navigate(`/countries/${c.cca2}`);
                  }}
                />
              );
            })}
            <path d={sphere} fill="none" stroke="var(--line)" strokeWidth={1 / view.k} />
          </g>
        </svg>

        <div className="absolute end-3 top-3 flex flex-col overflow-hidden rounded-md border border-line bg-surface shadow-sm">
          <button type="button" onClick={() => zoom(1.6)} disabled={view.k >= MAX_ZOOM} aria-label="Zoom in" className="p-2.5 text-heading hover:bg-soft disabled:opacity-40">
            <Plus aria-hidden="true" className="size-4" />
          </button>
          <button type="button" onClick={() => zoom(1 / 1.6)} disabled={view.k <= 1} aria-label="Zoom out" className="border-t border-line p-2.5 text-heading hover:bg-soft disabled:opacity-40">
            <Minus aria-hidden="true" className="size-4" />
          </button>
          <button type="button" onClick={() => setView({ k: 1, x: 0, y: 0 })} disabled={view.k === 1} aria-label="Reset map view" className="border-t border-line p-2.5 text-heading hover:bg-soft disabled:opacity-40">
            <RotateCcw aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-2 text-sm">
        <p aria-hidden="true" className="min-h-5 font-medium text-heading">
          {hoverText}
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
          <li className="inline-flex items-center gap-1.5">
            <svg aria-hidden="true" width="14" height="14">
              <rect width="14" height="14" rx="2" fill="url(#map-hatch)" />
            </svg>
            Operational guidance in progress
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3.5 rounded-sm bg-[var(--map-land)]" />
            Reference record
          </li>
        </ul>
      </div>
      <p className="mt-2 text-xs text-muted">
        Map geometry: Natural Earth (public domain). Boundaries are generalised for display and do not imply any position on the status of a territory.
      </p>
    </div>
  );
}
