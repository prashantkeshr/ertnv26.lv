/**
 * Generates public/data/geo/land-dots.json — an evenly spaced dot grid over land used by the
 * decorative hero globe. Land outline: Natural Earth 1:110m (public domain) via world-atlas.
 * Dots are spaced ~2.2° apart on the sphere (fewer per row toward the poles).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import { ROOT, writeJson } from './lib';

const topology = JSON.parse(readFileSync(resolve(ROOT, 'node_modules/world-atlas/land-110m.json'), 'utf8'));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const land = feature(topology, topology.objects.land) as any;

const STEP = 2.2;
const points: Array<[number, number]> = [];
for (let lat = -58; lat <= 82; lat += STEP) {
  const lonStep = STEP / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  for (let lon = -180; lon < 180; lon += lonStep) {
    if (geoContains(land, [lon, lat])) points.push([Math.round(lon * 10) / 10, Math.round(lat * 10) / 10]);
  }
}
writeJson('geo/land-dots.json', points);
console.log(`geo/land-dots.json — ${points.length} dots`);
