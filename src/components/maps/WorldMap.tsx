/**
 * Interactive world map.
 *
 * Geometry: Natural Earth 1:110m (public domain), loaded on demand from eport's own static files.
 *
 *  - Choose a region and the map zooms to it (animated), highlights its countries and drops a
 *    "sonar" marker on its largest economies.
 *  - Hover (or focus) a country for a card with its name, region and latest goods exports.
 *  - Click a country to open its profile. Zoom buttons and drag-to-pan work as before.
 *
 * The map is a pointer convenience: everything it offers is also reachable by keyboard through
 * the region rail's country pills and the Country Explorer, which the surrounding page links to.
 */
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router';
import { feature } from 'topojson-client';
import { Flag } from '@/components/common/Flag';
import { COUNTRY_LEVEL_LABEL } from '@/components/common/StatusBadge';
import { ErrorState, Skeleton } from '@/components/feedback/states';
import { useAsync } from '@/hooks/useAsync';
import { loadFile } from '@/services/data/loader';
import type { Country, CountryCoverage, FeaturedCountries } from '@/types/schemas';
import { formatUsdCompact } from '@/utils/format';
import { Topology } from './topology';

const W = 960;
const H = 500;
const MAX_ZOOM = 8;

interface WorldMapProps {
  countries: Country[];
  coverage: CountryCoverage;
  /** Region to zoom to and highlight; null shows the whole world. */
  region?: string | null;
  /** Largest economies per region: used for sonar markers, the zoom frame and tooltip figures. */
  featured?: FeaturedCountries['regions'];
}

interface Shape {
  key: string;
  d: string;
  country: Country | null;
  fallbackName: string;
}

interface Tip {
  shape: Shape;
  x: number;
  y: number;
}

export default function WorldMap({ countries, coverage, region = null, featured }: WorldMapProps) {
  const navigate = useNavigate();
  const box = useRef<HTMLDivElement>(null);
  const topo = useAsync('geo:countries-110m', () => loadFile('geo/countries-110m.json', Topology));
  const [free, setFree] = useState({ k: 1, x: 0, y: 0 });
  const [tip, setTip] = useState<Tip | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);

  const scene = useMemo(() => {
    const projection = geoNaturalEarth1().fitExtent(
      [
        [8, 8],
        [W - 8, H - 8],
      ],
      { type: 'Sphere' },
    );
    const path = geoPath(projection);
    const base = { sphere: path({ type: 'Sphere' }) ?? '', graticule: path(geoGraticule10()) ?? '', project: (lon: number, lat: number) => projection([lon, lat]) };
    if (!topo.data) return { shapes: [] as Shape[], ...base };
    const byNumeric = new Map(countries.filter((c) => c.ccn3).map((c) => [c.ccn3!, c]));
    const byName = new Map(countries.map((c) => [c.name.toLowerCase(), c]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collection = feature(topo.data as any, (topo.data as any).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
    const shapes: Shape[] = collection.features.map((f: Feature<Geometry, { name: string }>, i) => {
      const id = f.id === undefined ? null : String(f.id).padStart(3, '0');
      const country = (id && byNumeric.get(id)) || byName.get(f.properties.name.toLowerCase()) || null;
      return { key: `${id ?? 'x'}-${i}`, d: path(f) ?? '', country, fallbackName: f.properties.name };
    });
    return { shapes, ...base };
  }, [topo.data, countries]);

  /** The view that frames a region: the box around its largest economies, padded, clamped. */
  const regionView = useMemo(() => {
    if (!region || !featured?.[region]) return null;
    const pts = featured[region]!
      .map((f) => countries.find((c) => c.cca2 === f.code)?.latlng)
      .filter((ll): ll is [number, number] => Boolean(ll))
      .map(([lat, lon]) => scene.project(lon, lat))
      .filter((p): p is [number, number] => Boolean(p));
    if (pts.length < 2) return null;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const bw = Math.max(x1 - x0, 90) * 1.5;
    const bh = Math.max(y1 - y0, 60) * 1.5;
    const k = Math.min(MAX_ZOOM, Math.max(1.15, Math.min(W / bw, H / bh)));
    const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
    return clamp(k, W / 2 - cx * k, H / 2 - cy * k);
  }, [region, featured, countries, scene]);

  const view = regionView ?? free;
  const markers = useMemo(
    () =>
      region && featured?.[region]
        ? featured[region]!
            .slice(0, 8)
            .map((f) => ({ f, c: countries.find((c) => c.cca2 === f.code), p: null as [number, number] | null }))
            .map((m) => ({ ...m, p: m.c?.latlng ? (scene.project(m.c.latlng[1], m.c.latlng[0]) as [number, number] | null) : null }))
            .filter((m) => m.c && m.p)
        : [],
    [region, featured, countries, scene],
  );

  function clamp(k: number, x: number, y: number) {
    return { k, x: Math.min(0, Math.max(W - W * k, x)), y: Math.min(0, Math.max(H - H * k, y)) };
  }
  function zoom(factor: number) {
    setFree((v) => {
      const base = regionView ?? v;
      const k = Math.min(MAX_ZOOM, Math.max(1, base.k * factor));
      const cx = (W / 2 - base.x) / base.k;
      const cy = (H / 2 - base.y) / base.k;
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
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      d.moved = true;
      setDragging(true);
    }
    setFree(clamp(view.k, d.x + dx, d.y + dy));
  }
  function onPointerUp() {
    setDragging(false);
    window.setTimeout(() => (drag.current = null), 0);
  }
  function showTip(shape: Shape, e: ReactPointerEvent<SVGPathElement>) {
    const r = box.current?.getBoundingClientRect();
    if (r) setTip({ shape, x: e.clientX - r.left, y: e.clientY - r.top });
  }

  if (topo.status === 'error') return <ErrorState error={topo.error} onRetry={topo.reload} title="The map could not be loaded" />;

  const levelOf = (c: Country) => coverage.countries[c.cca2]?.level ?? coverage.defaultLevel;
  const regionCodes = new Set(countries.filter((c) => c.region === region).map((c) => c.cca2));
  const tipCountry = tip?.shape.country;
  const tipFacts = tipCountry && featured ? Object.values(featured).flat().find((f) => f.code === tipCountry.cca2) : undefined;

  return (
    <div>
      <div ref={box} className="relative overflow-hidden rounded-xl border border-line bg-surface">
        {topo.status === 'loading' && <Skeleton className="absolute inset-0 rounded-none" />}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={region ? `World map zoomed to ${region}. The same countries are listed beside the map.` : 'World map of countries. The same countries are available as a searchable list on the Country Explorer page.'}
          className="block h-auto w-full touch-pan-y select-none"
          style={{ cursor: view.k > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setTip(null)}
        >
          <defs>
            <pattern id="map-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="var(--color-ocean)" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--map-stroke)" strokeOpacity="0.5" strokeWidth="1.5" />
            </pattern>
          </defs>
          <path d={scene.sphere} style={{ fill: 'var(--map-sea)' }} />
          <g style={{ transformOrigin: '0 0', transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transition: dragging ? 'none' : 'transform 0.9s cubic-bezier(0.22, 0.8, 0.24, 1)' }}>
            <path d={scene.graticule} fill="none" stroke="var(--line)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
            {scene.shapes.map((s) => {
              const c = s.country;
              const inRegion = Boolean(c && region && regionCodes.has(c.cca2));
              const featuredByGuidance = !region && c ? levelOf(c) !== 'reference' : false;
              const active = tip?.shape.key === s.key && Boolean(c);
              const fill = active ? 'var(--color-accent)' : inRegion ? 'var(--color-ocean)' : featuredByGuidance ? 'url(#map-hatch)' : c ? 'var(--map-land)' : 'var(--map-land-2)';
              return (
                <path
                  key={s.key}
                  d={s.d}
                  vectorEffect="non-scaling-stroke"
                  style={{ fill, opacity: region && !inRegion && !active ? 0.45 : 1, cursor: c ? 'pointer' : 'default', transition: 'fill 0.25s, opacity 0.5s' }}
                  stroke={active ? 'var(--heading)' : 'var(--map-stroke)'}
                  strokeWidth={active ? 1.4 : 0.6}
                  onPointerEnter={(e) => showTip(s, e)}
                  onPointerMove={(e) => showTip(s, e)}
                  onClick={() => {
                    if (c && !drag.current?.moved) navigate(`/countries/${c.cca2}`);
                  }}
                />
              );
            })}
            {markers.map((m) => (
              <g key={m.f.code} transform={`translate(${m.p![0]} ${m.p![1]})`} style={{ pointerEvents: 'none' }}>
                <circle r={7 / view.k} className="sonar" fill="none" stroke="var(--color-aurora)" strokeWidth={1.5 / view.k} />
                <circle r={3.2 / view.k} fill="var(--color-aurora)" stroke="#fff" strokeWidth={1 / view.k} />
              </g>
            ))}
          </g>
        </svg>

        {tip && tipCountry && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 w-56 rounded-xl border border-line bg-surface p-3 shadow-menu"
            style={{ left: Math.min(tip.x + 14, (box.current?.clientWidth ?? 600) - 232), top: Math.max(tip.y - 84, 6) }}
          >
            <p className="flex items-center gap-2 text-sm font-bold text-heading">
              <Flag code={tipCountry.cca2} />
              {tipCountry.name}
            </p>
            <p className="mt-1 text-xs text-muted">
              {tipCountry.subregion ?? tipCountry.region} · {tipCountry.cca2} · {tipCountry.cca3}
            </p>
            {tipFacts && <p className="tabular mt-1.5 text-xs text-ink">Goods and services exports: {formatUsdCompact(tipFacts.value)} ({tipFacts.year})</p>}
            <p className="mt-1.5 text-xs text-link">{COUNTRY_LEVEL_LABEL[levelOf(tipCountry)]} · click to open</p>
          </div>
        )}
        {tip && !tipCountry && (
          <div className="pointer-events-none absolute z-10 rounded-md bg-surface px-2.5 py-1.5 text-xs text-muted shadow-menu ring-1 ring-line" style={{ left: tip.x + 12, top: tip.y - 36 }}>
            {tip.shape.fallbackName} — no ISO 3166-1 record
          </div>
        )}

        <div className="absolute end-3 top-3 flex flex-col overflow-hidden rounded-md border border-line bg-surface shadow-sm">
          <button type="button" onClick={() => zoom(1.6)} disabled={view.k >= MAX_ZOOM} aria-label="Zoom in" className="p-2.5 text-heading hover:bg-soft disabled:opacity-40">
            <Plus aria-hidden="true" className="size-4" />
          </button>
          <button type="button" onClick={() => zoom(1 / 1.6)} disabled={view.k <= 1} aria-label="Zoom out" className="border-t border-line p-2.5 text-heading hover:bg-soft disabled:opacity-40">
            <Minus aria-hidden="true" className="size-4" />
          </button>
          <button type="button" onClick={() => setFree({ k: 1, x: 0, y: 0 })} disabled={view.k === 1 && !regionView} aria-label="Reset map view" className="border-t border-line p-2.5 text-heading hover:bg-soft disabled:opacity-40">
            <RotateCcw aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted">
        Map geometry: Natural Earth (public domain). Boundaries are generalised for display and do not imply any position on the status of a territory.
      </p>
    </div>
  );
}
