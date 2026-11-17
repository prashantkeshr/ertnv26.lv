import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSearchEngine, highlightParts } from '@/services/search/engine';
import { SearchIndexFile } from '@/types/schemas';

const file = SearchIndexFile.parse(JSON.parse(readFileSync(resolve(__dirname, '../../public/data/search/index.json'), 'utf8')));
const engine = createSearchEngine(file.docs);

describe('search engine over the published index', () => {
  it('ranks an exact ISO code first', () => {
    expect(engine.search('IN')[0]?.id).toBe('country:IN');
    expect(engine.search('DEU')[0]?.id).toBe('country:DE');
  });

  it('ranks an exact abbreviation first', () => {
    expect(engine.search('DGFT')[0]?.id).toBe('authority:in-dgft');
    expect(engine.search('WTO')[0]?.id).toBe('organization:wto');
  });

  it('tolerates a typo in a longer word', () => {
    expect(engine.search('Germny').some((r) => r.id === 'country:DE')).toBe(true);
  });

  it('matches prefixes', () => {
    expect(engine.search('Indi').some((r) => r.id === 'country:IN')).toBe(true);
  });

  it('finds records by topic keywords', () => {
    expect(engine.search('phytosanitary').some((r) => r.id === 'authority:in-ppqs')).toBe(true);
  });

  it('filters by type', () => {
    const results = engine.search('customs', { types: ['authority'] });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.type === 'authority')).toBe(true);
  });

  it('boosts records from the country in context', () => {
    const plain = engine.search('commerce').findIndex((r) => r.id === 'authority:in-commerce');
    const boosted = engine.search('commerce', { countryContext: 'IN' }).findIndex((r) => r.id === 'authority:in-commerce');
    expect(boosted).toBeLessThanOrEqual(plain);
  });

  it('returns nothing for an empty or unmatched query', () => {
    expect(engine.search('   ')).toEqual([]);
    expect(engine.search('zzzzqqqq')).toEqual([]);
  });

  it('never returns modules that are not live', () => {
    const pages = file.docs.filter((d) => d.type === 'page');
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.map((p) => p.title)).not.toContain('Smart Trade Navigator');
  });
});

describe('highlightParts', () => {
  it('marks words that start with a query word', () => {
    const parts = highlightParts('Directorate General of Foreign Trade', 'for');
    expect(parts.filter((p) => p.hit).map((p) => p.text)).toEqual(['Foreign']);
  });

  it('marks fuzzy-matched index terms', () => {
    const parts = highlightParts('Germany', 'germny', ['germany']);
    expect(parts).toEqual([{ text: 'Germany', hit: true }]);
  });

  it('keeps the original text intact', () => {
    const parts = highlightParts('Trade (WTO), Geneva', 'wto');
    expect(parts.map((p) => p.text).join('')).toBe('Trade (WTO), Geneva');
  });
});
