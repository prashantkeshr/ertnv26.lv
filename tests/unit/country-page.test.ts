import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { feature } from 'topojson-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { framingGeometry } from '@/components/maps/CountryMap';
import { summaryFor } from '@/features/countries/CountryHero';
import { fetchJsonOrEmpty } from '@/services/api/http';
import { normaliseHolidays, upcoming } from '@/services/api/providers/nager';
import { Authority, Country, CountryCoverage, CountryGuide, FeaturedCountries, VideosFile } from '@/types/schemas';
import { weekendDays, weekendLabel } from '@/utils/calendar';
import { geoArea } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

const read = (rel: string) => JSON.parse(readFileSync(resolve(__dirname, '../../public/data', rel), 'utf8')) as unknown;
const countries = z.array(Country).parse(read('countries/index.json'));
const india = countries.find((c) => c.cca2 === 'IN')!;

describe('holidays', () => {
  const raw = [
    { date: '2026-12-25', localName: 'Weihnachten', name: 'Christmas Day', global: true, types: ['Public'] },
    { date: '2026-11-18', localName: 'Buß- und Bettag', name: 'Repentance Day', global: false, types: ['Public'] },
    { date: '2026-11-17', localName: 'Schulfest', name: 'School fair', global: true, types: ['Optional'] },
  ];
  it('keeps public holidays only, sorted, and flags regional ones', () => {
    const out = normaliseHolidays(raw);
    expect(out.map((h) => h.date)).toEqual(['2026-11-18', '2026-12-25']);
    expect(out[0]).toMatchObject({ nationwide: false });
    expect(out[1]).toMatchObject({ nationwide: true });
  });
  it('returns the next holidays on or after today', () => {
    const out = normaliseHolidays(raw);
    expect(upcoming(out, '2026-11-18', 5).map((h) => h.name)).toEqual(['Repentance Day', 'Christmas Day']);
    expect(upcoming(out, '2026-11-19', 5).map((h) => h.name)).toEqual(['Christmas Day']);
    expect(upcoming(out, '2027-01-01', 5)).toEqual([]);
  });
});

describe('HTTP 204 handling', () => {
  afterEach(() => vi.unstubAllGlobals());
  const schema = z.array(z.string());
  it('treats "no content" and empty bodies as no data rather than an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    await expect(fetchJsonOrEmpty('https://x.test', { providerId: 'p', schema })).resolves.toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
    await expect(fetchJsonOrEmpty('https://x.test', { providerId: 'p', schema })).resolves.toBeNull();
  });
  it('still validates real bodies and reports real errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(['a']), { status: 200 })));
    await expect(fetchJsonOrEmpty('https://x.test', { providerId: 'p', schema })).resolves.toEqual(['a']);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ no: 1 }), { status: 200 })));
    await expect(fetchJsonOrEmpty('https://x.test', { providerId: 'p', schema })).rejects.toMatchObject({ kind: 'invalid-response' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    await expect(fetchJsonOrEmpty('https://x.test', { providerId: 'p', schema })).rejects.toMatchObject({ kind: 'http' });
  });
});

describe('weekend data from CLDR', () => {
  it('knows common weekends, or returns null where the engine lacks week info', () => {
    const india = weekendDays('IN');
    const uae = weekendDays('AE');
    const us = weekendDays('US');
    // Node ships ICU with week info; if it were missing, every call is null and nothing is invented.
    if (india === null) return expect([uae, us]).toEqual([null, null]);
    expect(india).toEqual([7]);
    expect(us).toEqual([6, 7]);
    expect(uae).toEqual(expect.arrayContaining([6, 7]));
  });
  it('labels days and tolerates an invalid region', () => {
    expect(weekendLabel([6, 7])).toBe('Saturday and Sunday');
    expect(weekendLabel([7])).toBe('Sunday');
    expect(weekendDays('ZZZZ')).toBeNull();
  });
});

describe('map framing', () => {
  const topo = JSON.parse(readFileSync(resolve(__dirname, '../../public/data/geo/countries-50m.json'), 'utf8'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
  const byName = (name: string) => all.features.find((f) => f.properties.name === name) as Feature<Geometry, { name: string }>;
  const area = (g: Geometry) => geoArea(g);

  it('frames France as the mainland, not its overseas departments', () => {
    const france = byName('France');
    const framed = framingGeometry(france);
    expect(framed.type).toBe('MultiPolygon');
    expect(area(framed)).toBeLessThan(area(france.geometry));
    expect(area(framed)).toBeGreaterThan(area(france.geometry) * 0.5);
  });
  it('keeps (almost) all of a compact country, dropping only tiny islands', () => {
    const germany = byName('Germany');
    const ratio = area(framingGeometry(germany)) / area(germany.geometry);
    expect(ratio).toBeGreaterThan(0.97);
    expect(ratio).toBeLessThanOrEqual(1);
  });
  it('has an outline for every country except a few tiny territories', () => {
    const ids = new Set(all.features.map((f) => String(f.id).padStart(3, '0')));
    const missing = countries.filter((c) => c.ccn3 && !ids.has(c.ccn3));
    expect(missing.length).toBeLessThanOrEqual(15);
    expect(ids.has(india.ccn3!)).toBe(true);
  });
});

describe('country summary', () => {
  const coverage = CountryCoverage.parse(read('countries/coverage.json'));
  it('is grammatical and built only from real facts', () => {
    const text = summaryFor(india, 'operational-seed', coverage.countries.IN);
    expect(text).toContain('India is a coastal UN member state in Southern Asia.');
    expect(text).toContain('Its capital is New Delhi.');
    expect(text).not.toMatch(/\ba a\b/);
  });
  it('says plainly when nothing is published for a country', () => {
    const germany = countries.find((c) => c.cca2 === 'DE')!;
    expect(summaryFor(germany, 'reference')).toContain('has not yet published export or import procedures');
  });
  it('describes landlocked states and territories correctly', () => {
    const swiss = countries.find((c) => c.cca2 === 'CH')!;
    expect(summaryFor(swiss, 'reference')).toContain('a landlocked UN member state');
    const territory = countries.find((c) => !c.unMember)!;
    expect(summaryFor(territory, 'reference')).toContain(' territory in ');
  });
});

describe('featured countries, guides and videos datasets', () => {
  const featured = FeaturedCountries.parse(read('countries/featured.json'));
  const guides = z.array(CountryGuide).parse(read('countries/guides.json'));
  const authorities = z.array(Authority).parse(read('authorities/in.json'));
  const videos = VideosFile.parse(read('videos/index.json')).videos;

  it('ranks each region by the stated indicator, largest first', () => {
    for (const [region, list] of Object.entries(featured.regions)) {
      expect(list.length, region).toBeGreaterThan(0);
      expect(list.length).toBeLessThanOrEqual(12);
      for (let i = 1; i < list.length; i++) expect(list[i - 1]!.value).toBeGreaterThanOrEqual(list[i]!.value);
      for (const c of list) expect(countries.find((x) => x.cca2 === c.code)?.region).toBe(region);
    }
    expect(featured.regions.Asia?.map((c) => c.code)).toContain('IN');
  });

  it('keeps the India guide honest: needs review, limits stated, every authority real', () => {
    const guide = guides.find((g) => g.countryCode === 'IN')!;
    expect(guide.status).toBe('needs-review');
    expect(guide.limits.toLowerCase()).toContain('not a checklist');
    const ids = new Set(authorities.map((a) => a.id));
    for (const step of guide.steps) for (const id of step.authorityIds) expect(ids.has(id), `${step.id}: ${id}`).toBe(true);
    expect(guide.steps.some((s) => s.appliesTo === 'export')).toBe(true);
    expect(guide.steps.some((s) => s.appliesTo === 'import')).toBe(true);
  });

  it('lists only videos from official channels with valid ids', () => {
    expect(new Set(videos.map((v) => v.id)).size).toBe(videos.length);
    const official = /World Trade Organization|WCO|International Trade Centre|IMOHQ|ICC/;
    for (const v of videos) {
      expect(v.id).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(v.channel, v.title).toMatch(official);
    }
  });
});
