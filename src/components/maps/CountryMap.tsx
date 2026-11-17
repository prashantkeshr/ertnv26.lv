/**
 * Hero map for a country page: the country highlighted, its neighbours as outlines, built from
 * Natural Earth 1:50m outlines (public domain) loaded on demand from eport's own static files.
 *
 * Framing: for countries with distant islands or overseas parts, the map frames the main
 * landmass (polygons of meaningful size within ~35° of the largest), so France is France, not
 * France plus French Guiana. Very small countries are capped in zoom so neighbours stay visible.
 * Territories with no outline in the dataset are shown as a marker on a regional map.
 *
 * Always drawn for a dark background (the hero is dark in both themes).
 */
import { geoArea, geoCentroid, geoDistance, geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import { useMemo } from 'react';
import { feature } from 'topojson-client';
import { Skeleton } from '@/components/feedback/states';
import { useAsync } from '@/hooks/useAsync';
import { loadFile } from '@/services/data/loader';
import type { Country } from '@/types/schemas';
import { Topology } from './topology';

const W = 960;
const H = 560;
const PAD = 70;
const MAX_SCALE = 1700;
const MIN_AREA_SHARE = 0.03;
const MAX_ISLAND_DISTANCE = 0.61; // radians ≈ 35°

type Poly = Polygon['coordinates'];
type CountryFeature = Feature<Geometry, { name: string }>;

/** The part of a feature to frame: its main landmass plus any sizeable polygons near it. */
export function framingGeometry(f: CountryFeature): Geometry {
  if (f.geometry.type !== 'MultiPolygon') return f.geometry;
  const polys: Poly[] = (f.geometry as MultiPolygon).coordinates;
  const info = polys.map((coordinates) => {
    const g: Polygon = { type: 'Polygon', coordinates };
    return { coordinates, area: geoArea(g), centre: geoCentroid(g) };
  });
  const main = info.reduce((a, b) => (b.area > a.area ? b : a));
  const keep = info.filter((p) => p === main || (p.area >= main.area * MIN_AREA_SHARE && geoDistance(p.centre, main.centre) <= MAX_ISLAND_DISTANCE));
  return { type: 'MultiPolygon', coordinates: keep.map((p) => p.coordinates) };
}

export default function CountryMap({ country, countries, className }: { country: Country; countries: Country[]; className?: string }) {
  const topo = useAsync('geo:countries-50m', () => loadFile('geo/countries-50m.json', Topology));

  const scene = useMemo(() => {
    if (!topo.data) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = feature(topo.data as any, (topo.data as any).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
    const numeric = (c: Country) => c.ccn3;
    const byId = new Map(all.features.map((f) => [f.id === undefined ? '' : String(f.id).padStart(3, '0'), f as CountryFeature]));
    const selected = country.ccn3 ? byId.get(numeric(country)!) : undefined;
    const neighbourIds = new Set(countries.filter((c) => country.borders.includes(c.cca3) && c.ccn3).map((c) => c.ccn3!));

    const projection = geoEqualEarth();
    let marker: [number, number] | null = null;
    if (selected) {
      projection.fitExtent(
        [[PAD, PAD], [W - PAD, H - PAD]],
        { type: 'Feature', properties: {}, geometry: framingGeometry(selected) },
      );
      if (projection.scale() > MAX_SCALE) {
        const centre = geoCentroid(framingGeometry(selected));
        projection.scale(MAX_SCALE).translate([W / 2, H / 2]);
        const p = projection(centre);
        if (p) projection.translate([W - p[0], H - p[1]]);
      }
    } else if (country.latlng) {
      // No outline for this territory: a regional map centred on it, with a marker.
      marker = [country.latlng[1], country.latlng[0]];
      projection.scale(1100).translate([W / 2, H / 2]);
      const p = projection(marker);
      if (p) projection.translate([W - p[0], H - p[1]]);
    }
    const path = geoPath(projection);
    const inView = (f: CountryFeature) => {
      const [[x0, y0], [x1, y1]] = path.bounds(f);
      return x1 > -40 && x0 < W + 40 && y1 > -40 && y0 < H + 40;
    };
    const shapes = all.features
      .filter((f) => inView(f as CountryFeature))
      .map((f, i) => {
        const id = f.id === undefined ? '' : String(f.id).padStart(3, '0');
        const kind = selected && f === (selected as unknown) ? 'selected' : neighbourIds.has(id) ? 'neighbour' : 'other';
        const centroid = path.centroid(f);
        return { key: `${id}-${i}`, d: path(f) ?? '', kind, name: f.properties.name, x: centroid[0], y: centroid[1], area: path.area(f) };
      })
      .filter((s) => s.d);
    return { shapes, graticule: path(geoGraticule10()) ?? '', marker: marker ? projection(marker) : null };
  }, [topo.data, country, countries]);

  if (topo.status === 'error') return null; // decorative: the page works without the map
  if (!scene) return <Skeleton className={className ?? 'aspect-[96/56] w-full'} />;

  const labelled = scene.shapes.filter((s) => s.kind === 'selected' || (s.kind === 'neighbour' && s.area > 1800));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={scene.marker ? `Regional map with ${country.name} marked` : `Map highlighting ${country.name}${country.borders.length ? ' and its neighbours' : ''}`}
      className={className ?? 'block h-auto w-full'}
    >
      <defs>
        <linearGradient id="country-fill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#2689c7" />
          <stop offset="1" stopColor="#3fb8e8" />
        </linearGradient>
        <filter id="country-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={scene.graticule} fill="none" stroke="rgba(159,208,238,0.09)" strokeWidth="0.7" />
      {scene.shapes
        .filter((s) => s.kind !== 'selected')
        .map((s) => (
          <path
            key={s.key}
            d={s.d}
            className={s.kind === 'neighbour' ? 'map-neighbour' : undefined}
            fill={s.kind === 'neighbour' ? 'rgba(159,208,238,0.13)' : 'rgba(255,255,255,0.035)'}
            stroke="rgba(159,208,238,0.32)"
            strokeWidth={s.kind === 'neighbour' ? 1.1 : 0.7}
            strokeLinejoin="round"
          />
        ))}
      {scene.shapes
        .filter((s) => s.kind === 'selected')
        .map((s) => (
          <path key={s.key} d={s.d} className="map-selected" fill="url(#country-fill)" stroke="rgba(255,255,255,0.85)" strokeWidth="1.3" strokeLinejoin="round" filter="url(#country-glow)" />
        ))}
      {scene.marker && (
        <g transform={`translate(${scene.marker[0]} ${scene.marker[1]})`}>
          <circle r="20" className="ping" fill="rgba(63,184,232,0.35)" />
          <circle r="7" fill="#3fb8e8" stroke="#fff" strokeWidth="2" />
          <text y="-18" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff" stroke="rgba(7,22,42,0.85)" strokeWidth="5" paintOrder="stroke">
            {country.name}
          </text>
        </g>
      )}
      {labelled.map((s) => (
        <text
          key={`l-${s.key}`}
          x={s.x}
          y={s.y}
          textAnchor="middle"
          fontSize={s.kind === 'selected' ? 22 : 13}
          fontWeight={s.kind === 'selected' ? 800 : 500}
          fill={s.kind === 'selected' ? '#fff' : 'rgba(255,255,255,0.7)'}
          stroke="rgba(7,22,42,0.8)"
          strokeWidth={s.kind === 'selected' ? 5 : 3.5}
          paintOrder="stroke"
          style={{ pointerEvents: 'none' }}
        >
          {s.name}
        </text>
      ))}
    </svg>
  );
}
