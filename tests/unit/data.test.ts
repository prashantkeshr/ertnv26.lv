import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LOCALES, translate } from '@/i18n';
import en from '@/i18n/locales/en.json';
import { Authority, ApiProvider, Country, Organization, Source } from '@/types/schemas';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) => JSON.parse(readFileSync(resolve(__dirname, '../../public/data', rel), 'utf8')) as unknown;

describe('published datasets match their schemas', () => {
  it('countries', () => {
    const list = z.array(Country).parse(read('countries/index.json'));
    expect(list.length).toBeGreaterThanOrEqual(240);
    expect(new Set(list.map((c) => c.cca2)).size).toBe(list.length);
    expect(list.find((c) => c.cca2 === 'IN')).toMatchObject({ cca3: 'IND', ccn3: '356' });
  });
  it('organizations and authorities', () => {
    expect(z.array(Organization).parse(read('organizations/index.json')).length).toBe(10);
    expect(z.array(Authority).parse(read('authorities/in.json')).length).toBe(16);
  });
  it('sources and API providers', () => {
    z.array(Source).parse(read('sources/sources.json'));
    z.array(ApiProvider).parse(read('sources/api-providers.json'));
  });
});

describe('honesty rules encoded in the data', () => {
  const providers = z.array(ApiProvider).parse(read('sources/api-providers.json'));

  it('never marks an API as live in the browser without a verified cross-origin test', () => {
    for (const p of providers.filter((x) => x.integrationStatus === 'integrated')) {
      expect(p.browserAccess).toBe('verified');
      expect(p.auth).toBe('none');
    }
  });
  it('marks key-protected providers as requiring a secure layer', () => {
    for (const p of providers.filter((x) => x.auth !== 'none')) expect(p.integrationStatus).toBe('coming-soon-secure-layer');
  });
  it('does not claim official verification without an editorial review', () => {
    for (const r of [...z.array(Organization).parse(read('organizations/index.json')), ...z.array(Authority).parse(read('authorities/in.json'))]) {
      if (r.verification.status === 'officially-verified') expect(r.verification.method).toBe('editorial-review');
      if (r.verification.lastChecked) expect(r.verification.method).not.toBe('none');
    }
  });
  it('only uses https links', () => {
    const urls = [...z.array(Authority).parse(read('authorities/in.json')).map((a) => a.website), ...z.array(Source).parse(read('sources/sources.json')).map((s) => s.url)];
    for (const u of urls) expect(u.startsWith('https://')).toBe(true);
  });
});

describe('i18n', () => {
  it('registers English as the launch locale', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(LOCALES.en?.dir).toBe('ltr');
  });
  it('interpolates variables and falls back to English for missing keys', () => {
    expect(translate({}, 'search.seeAll', { query: 'rice' })).toBe('See all results for “rice”');
    expect(translate({ 'nav.skip': 'Aller au contenu' }, 'nav.skip')).toBe('Aller au contenu');
    expect(translate({}, 'nav.skip')).toBe(en['nav.skip']);
  });
});
