import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { countConnections, relatedTo } from '@/services/graph/graph';
import { GraphFile } from '@/types/schemas';
import { entityPath, makeRef, parseRef } from '@/utils/entities';
import { formatDate, formatPercent, formatUsdCompact, percentChange } from '@/utils/format';

const graph = GraphFile.parse(JSON.parse(readFileSync(resolve(__dirname, '../../public/data/graph/index.json'), 'utf8')));

describe('knowledge graph', () => {
  it('has no edge pointing at a missing node', () => {
    for (const e of graph.edges) {
      expect(graph.nodes[e.from], e.from).toBeDefined();
      expect(graph.nodes[e.to], e.to).toBeDefined();
    }
  });

  it('links India to its authorities, grouped by relationship', () => {
    const groups = relatedTo(graph, 'country:IN');
    const refs = groups.flatMap((g) => g.items.map((i) => i.ref));
    expect(refs).toContain('authority:in-dgft');
    expect(refs).toContain('authority:in-cbic');
    expect(groups.length).toBeGreaterThan(0);
  });

  it('shows both directions of a relationship', () => {
    const dgft = relatedTo(graph, 'authority:in-dgft').flatMap((g) => g.items.map((i) => i.ref));
    expect(dgft).toContain('country:IN');
    expect(dgft).toContain('authority:in-commerce');
    const commerce = relatedTo(graph, 'authority:in-commerce').flatMap((g) => g.items.map((i) => i.ref));
    expect(commerce).toContain('authority:in-dgft');
  });

  it('connects national bodies to their international counterparts', () => {
    const ppqs = relatedTo(graph, 'authority:in-ppqs').flatMap((g) => g.items.map((i) => i.ref));
    expect(ppqs).toContain('organization:ippc');
  });

  it('returns nothing for a record with no links', () => {
    expect(relatedTo(graph, 'country:NU')).toEqual([]);
    expect(countConnections(graph, 'country:NU')).toBe(0);
  });
});

describe('entity references', () => {
  it('round-trips', () => {
    expect(parseRef(makeRef('authority', 'in-dgft'))).toEqual({ type: 'authority', id: 'in-dgft' });
  });
  it('maps to site paths, and null where no page exists', () => {
    expect(entityPath('country:IN')).toBe('/countries/IN');
    expect(entityPath('authority:in-dgft')).toBe('/directory/authorities/in-dgft');
    expect(entityPath('port:INMUN')).toBeNull();
  });
});

describe('formatting', () => {
  it('writes US dollars with an explicit currency prefix', () => {
    expect(formatUsdCompact(34_890_517_618_618)).toBe('US$34.9 trillion');
  });
  it('formats percentages', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
  });
  it('formats ISO dates in UTC without shifting the day', () => {
    expect(formatDate('2026-11-17')).toBe('17 Nov 2026');
  });
  it('computes year-over-year change and refuses when data is missing', () => {
    expect(percentChange(110, 100)).toBeCloseTo(10);
    expect(percentChange(undefined, 100)).toBeNull();
    expect(percentChange(100, 0)).toBeNull();
  });
});
