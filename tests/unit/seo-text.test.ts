import { describe, expect, it } from 'vitest';
import { countryDescription, countryTitle } from '@/app/seo-text';

describe('country SEO text', () => {
  it('names the country and stays short enough for a result title', () => {
    expect(countryTitle('Germany')).toBe('Germany trade profile: partners, indicators, guide');
    expect(`${countryTitle('Saint Vincent and the Grenadines')} | eport`.length).toBeLessThan(90);
  });

  it('uses the real top export markets and leading sector when a trade report exists', () => {
    const d = countryDescription({ name: 'Germany', cca2: 'DE', cca3: 'DEU', topExportMarkets: ['United States', 'France', 'Netherlands', 'China'], topExportSectors: ['84-85_MachElec'] });
    expect(d).toContain('United States, France and Netherlands');
    expect(d).not.toContain('China');
    expect(d).toContain('machinery and electrical');
  });

  it('falls back to identifiers, without inventing partners, when there is no report', () => {
    const d = countryDescription({ name: 'Algeria', cca2: 'DZ', cca3: 'DZA', topExportMarkets: [], topExportSectors: [] });
    expect(d).toContain('DZ, DZA');
    expect(d).not.toMatch(/export markets/);
  });
});
